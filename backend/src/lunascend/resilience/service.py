"""Sequential, cancellation-safe search composing the existing scientific engines."""
import asyncio
from collections import OrderedDict
from datetime import datetime, timedelta
from hashlib import sha256
from time import perf_counter
from typing import Awaitable, Callable, Iterator
from lunascend.contracts.models import ScenarioRequest, ScenarioResult, LunarSite
from lunascend.contracts.resilience import OpportunityRequest, OpportunityResponse, Opportunity
from lunascend.ephemeris.kernels import GeometryError
from lunascend.terrain.errors import TerrainError
from .constraints import differences, distance, evaluate, LIMITS


def request_id(request: ScenarioRequest) -> str:
    return sha256(request.model_dump_json().encode()).hexdigest()


CoordinateTransform = Callable[[LunarSite, datetime, datetime], tuple[float, float]]


def dates(request: OpportunityRequest) -> Iterator[datetime]:
    current = request.earliest_utc
    while current <= request.latest_utc:
        yield current
        current += timedelta(hours=request.step_hours)


def shift_request(baseline: ScenarioRequest, site: LunarSite, start: datetime,
                  transform: CoordinateTransform | None = None) -> ScenarioRequest:
    """Coordinates are epoch-specific: retain a fixed DEM-native site across dates."""
    values = baseline.model_dump()
    values.update(site=site.model_dump(), start_utc=start, end_utc=start+(baseline.end_utc-baseline.start_utc))
    if start != baseline.start_utc:
        if transform is None:
            from .site import shift_coordinates
            transform = shift_coordinates
        lat,lon = transform(site, baseline.start_utc, start)
        values['site'].update(latitude_deg=lat,longitude_deg=lon)
    values['settings']['terrain_options']['coordinate_epoch_utc'] = start
    return ScenarioRequest.model_validate(values)


class SearchService:
    """One active calculation per service. Caches exist only within a search.

    Scope avoids reusing stale dataset/kernel resources between searches. Identical
    baseline/candidate requests share immutable results; no persistent infrastructure.
    """
    def __init__(self, calculate: Callable[[ScenarioRequest], ScenarioResult] | None = None,
                 transform: CoordinateTransform | None = None):
        self.lock = asyncio.Lock()
        self.calculate = calculate
        self.transform = transform

    async def search(self, request: OpportunityRequest, disconnected: Callable[[], Awaitable[bool]] | None = None) -> OpportunityResponse:
        if self.lock.locked():
            raise GeometryError("RESOURCE_LIMIT", "Another resilience search is running; cancel or finish it before retrying.")
        async with self.lock:
            started = perf_counter()
            cache: dict[str,ScenarioResult] = {}
            horizons: OrderedDict = OrderedDict()
            hits = reuses = 0
            async def bounded_thread(function, *args):
                task = asyncio.create_task(asyncio.to_thread(function,*args))
                try: return await asyncio.shield(task)
                except asyncio.CancelledError:
                    # Keep the serial lock until an in-flight bridge/calculation has finished.
                    await task
                    raise
            def terrain_loader(r):
                nonlocal reuses
                from lunascend.terrain.engine import analyze_terrain
                from lunascend.terrain.geometry import local_basis
                import numpy as np
                # Reuse only after checking physical native observer separation < 1 micrometer.
                for previous, value in horizons.values():
                    a,b = r.model_dump(),previous.model_dump()
                    a.pop('site_id');b.pop('site_id')
                    for key in ('latitude_deg','longitude_deg'): a.pop(key);b.pop(key)
                    delta = np.linalg.norm(local_basis(r.latitude_deg,r.longitude_deg)[0]-local_basis(previous.latitude_deg,previous.longitude_deg)[0])*1737400
                    if a == b and delta < 1e-6:
                        reuses += 1
                        return value
                value = analyze_terrain(r)
                horizons[len(horizons)] = (r,value)
                return value
            def calculate(r):
                if self.calculate: return self.calculate(r)
                from lunascend.power.service import environmental_request, attach_engineering
                from lunascend.visibility.engine import analyze_visibility
                return attach_engineering(analyze_visibility(environmental_request(r),terrain_loader=terrain_loader),r)
            async def run(r):
                nonlocal hits
                key = request_id(r)
                if key in cache:
                    hits += 1
                    return cache[key]
                result = await bounded_thread(calculate,r)
                if result.provider_mode != 'scientific' or result.request != r:
                    raise GeometryError('FRAME_MISMATCH','Analysis identity/provider mismatch; no fallback accepted.')
                if result.status not in ('failed','unavailable'): cache[key] = result
                return result
            baseline = await run(request.baseline)
            rows = []
            cancelled = False
            for site in (request.baseline.site,*request.sites):
                for start in dates(request):
                    if disconnected and await disconnected():
                        cancelled = True
                        break
                    r = None
                    result = None
                    errors = ()
                    try:
                        # Frame transformations also run outside the event loop.
                        r = await bounded_thread(shift_request,request.baseline,site,start,self.transform)
                        result = await run(r)
                        errors = tuple(e.code+': '+e.message for e in result.errors)
                    except (GeometryError,TerrainError) as exc:
                        errors = (exc.error.code+': '+exc.error.message,)
                    except ImportError:
                        errors = ('PROVIDER_UNAVAILABLE: Install the locked science and terrain extras.',)
                    except Exception:
                        errors = ('CALCULATION_FAILED: Candidate calculation failed; no substituted data.',)
                    dist = distance(baseline,result) if result else None
                    checks,classification = evaluate(result,request.constraints,dist)
                    changes = differences(baseline,result)
                    explanations = tuple(f"{key}: {v.delta:+.6g} {v.units} versus baseline (candidate minus original)."
                        for key,v in changes.items() if v.delta is not None and v.delta != 0)
                    # A transform failure must retain the intended candidate identity/date, not baseline labels.
                    intended = sha256((site.model_dump_json()+start.isoformat()+request.baseline.model_dump_json()).encode()).hexdigest()
                    rows.append(Opportunity(request_id=request_id(r) if r else intended,request=r,site=site,start_utc=start,result=result,errors=errors,
                        date_shift_s=(start-request.baseline.start_utc).total_seconds(),distance_from_baseline_m=dist,
                        classification=classification,constraints=checks,differences=changes,
                        explanations=explanations or ('No supported nonzero numeric differences; inspect missing evidence and constraint results.',)))
                if cancelled: break
            return OpportunityResponse(baseline=baseline,opportunities=tuple(rows),cancelled=cancelled,
                completed=sum(r.result is not None and not r.errors for r in rows),failed=sum(bool(r.errors) for r in rows),
                indeterminate=sum(r.classification=='insufficient_evidence' for r in rows),elapsed_s=perf_counter()-started,
                cache_hits=hits,horizon_reuses=reuses,limitations=LIMITS+(
                    'Search is a finite date grid, not an optimizer; an unaligned latest date is not added to the grid.',
                    'At most 12 candidates plus baseline, 30-day search span/offset, 7-day missions and 169 samples; one calculation at a time.',
                    'Input candidate coordinates are at the baseline epoch. Exact frame rotations keep each native DE421 location fixed across dates.',
                    'Unknown DTE intervals cannot pass communication requirements. Optimistic-only passing never establishes guaranteed survival.',))
