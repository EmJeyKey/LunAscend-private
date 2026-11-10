"""Terrain obstruction and equipment-clearance failures remain distinct."""
from lunascend.contracts import Metric
from lunascend.contracts.models import TerrainBodyVisibility, TerrainVisibility, CommunicationAnalysis, VisibilityWindow
from lunascend.contracts.engineering import CommunicationConfiguration, AccessSample
from lunascend.power.timeline import segments

METHOD = "conditional-dte-left-hold-v1"
ASSUMPTIONS = (
    "Earth center and finite terrain clearance only; conditional access is not guaranteed communication or a usable radio link.",
    "Below the equipment clearance requirement is not physical terrain obstruction.",
    "Left-sample classification held over supported intervals; no sub-sample access transitions are invented.",
    "Unknown-adjacent samples, missing time coverage and gaps beyond requested step remain unknown, not access or confirmed interruptions.",
    "Longest interruption is the longest contiguous sample-supported obstruction/requirement-failure interval; unknown gaps terminate support.",
    "No antenna pattern, Earth ground-station visibility, frequency, transmit power, path loss, receiver noise or link budget is modeled.",
)


def access(body: TerrainBodyVisibility, margin_deg: float) -> str:
    if body.classification == "modeled_obstruction":return "modeled_obstruction"
    if body.classification == "conditional_clearance" and body.clearance_deg is not None:
        return "conditional_access" if body.clearance_deg >= margin_deg else "below_clearance_requirement"
    return "unavailable" if body.classification == "unavailable" else "indeterminate"


def analyze_communication(terrain: TerrainVisibility, config: CommunicationConfiguration, start, end, sample_step_s: float) -> CommunicationAnalysis:
    intervals = segments(terrain,start,end,sample_step_s)
    samples = tuple(AccessSample(time_utc=r.time_utc,earth_clearance_deg=r.earth.clearance_deg,
        terrain_classification=r.earth.classification,classification=access(r.earth,config.minimum_earth_clearance_deg),coverage=r.earth.coverage) for r in terrain.observations)
    windows = []
    covered = available = longest = current = 0.0
    for interval in intervals:
        a = access(interval.left.earth,config.minimum_earth_clearance_deg) if interval.left else "unavailable"
        b = access(interval.right.earth,config.minimum_earth_clearance_deg) if interval.right else "unavailable"
        known = a not in ("indeterminate","unavailable") and b not in ("indeterminate","unavailable")
        label = a if known else "unavailable" if "unavailable" in (a,b) else "indeterminate"
        if known:
            covered += interval.seconds
            if label == "conditional_access":available += interval.seconds
        if known and label in ("modeled_obstruction","below_clearance_requirement"):
            current += interval.seconds
            longest = max(longest,current)
        else:current = 0.0
        if windows and windows[-1].classification == label:
            old = windows.pop()
            windows.append(VisibilityWindow(**{**old.model_dump(exclude={"duration_s"}),"end_utc":interval.end,
                "end_censored":interval.end == end,"resolution_s":max(old.resolution_s,interval.seconds)}))
        else:
            windows.append(VisibilityWindow(target="earth",classification=label,start_utc=interval.start,end_utc=interval.end,
                status="partial",start_censored=interval.start==start,end_censored=interval.end==end,resolution_s=interval.seconds,
                method="left_sample_hold",provenance_ids=(*terrain.provenance_ids,"dte-model"),assumptions=ASSUMPTIONS))
    span = (end-start).total_seconds()
    def metric(value):
        return Metric(value=value if covered else None,status="partial" if covered else "unavailable",
            reason="Conditional sample-supported duration only; unresolved intervals are excluded, not access or confirmed interruption.",provenance_ids=("dte-model",))
    return CommunicationAnalysis(status="partial",configuration=config,access_samples=samples,windows=tuple(windows),
        covered_duration_s=covered,unknown_duration_s=max(0.0,span-covered),coverage_fraction=min(1.0,covered/span),
        max_sample_step_s=max((i.seconds for i in intervals),default=None),earth_visibility_duration_s=metric(available),
        longest_interruption_s=metric(longest),provenance_ids=(*terrain.provenance_ids,"dte-model"),assumptions=ASSUMPTIONS)
