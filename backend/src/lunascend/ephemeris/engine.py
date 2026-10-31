"""NAIF azlcpo geometry. Public output remains geometric (NONE)."""

from datetime import datetime, timezone
from decimal import Decimal, ROUND_CEILING
from hashlib import sha256
import json
from math import atan2, cos, degrees, hypot, isfinite, radians

from lunascend.contracts import DataProvenance, EphemerisObservation, LunarSite, Metric, ScenarioRequest, ScenarioResult
from .kernels import FRAME, RADIUS_M, PROJECT_ROOT, GeometryError, KernelConfiguration, LoadedKernels, file_sha256
from pathlib import Path

ENGINE_VERSION = "spice-geometry-v1"
SURFACE = "MOON_SPHERE_1737400_M"
REALIZATION = "DE440/ME421"
REPORT_ID = "step-3-horizons-v1"
REPORT_PATH = PROJECT_ROOT / "docs/validation/step-3-results.json"


def validate_site(site: LunarSite) -> None:
    ref = site.coordinate_reference
    if (ref.latitude_type != "planetocentric" or ref.frame_id != FRAME
            or ref.frame_realization != REALIZATION or ref.reference_surface != SURFACE
            or ref.reference_radius_m != RADIUS_M):
        raise GeometryError("FRAME_MISMATCH", "Scientific geometry requires the documented DE440/ME421 planetocentric sphere metadata.")
    if site.surface_elevation_m is None:
        raise GeometryError("INVALID_REQUEST", "Site elevation must be supplied explicitly; missing elevation is not zero.")
    if RADIUS_M + site.surface_elevation_m + site.observer_height_m <= 0:
        raise GeometryError("INVALID_REQUEST", "Observer radius must be positive.")


def utc_to_et(utc: datetime, spice) -> float:
    if utc.tzinfo is None or utc.utcoffset() is None:
        raise GeometryError("UNSUPPORTED_TIME", "A timezone-aware UTC timestamp is required.")
    value = utc.astimezone(timezone.utc)
    if value < datetime(1972, 1, 1, tzinfo=timezone.utc):
        raise GeometryError("UNSUPPORTED_TIME", "Step 3 supports UTC from 1972 onward; earlier civil-time models are not implemented.")
    return float(spice.str2et(value.isoformat().replace("+00:00", "Z")))


def sample_times(request: ScenarioRequest, loaded: LoadedKernels) -> tuple[tuple[datetime, float], ...]:
    spice = loaded.spice
    start_et, end_et = utc_to_et(request.start_utc, spice), utc_to_et(request.end_utc, spice)
    loaded.require_coverage(start_et, end_et)
    start_tai = float(spice.unitim(start_et, "ET", "TAI"))
    end_tai = float(spice.unitim(end_et, "ET", "TAI"))
    span = end_tai - start_tai
    civil_span = (request.end_utc - request.start_utc).total_seconds()
    if abs(span - civil_span) > .5:
        # The public timestamp contract uses datetime, which cannot encode :60.
        raise GeometryError("UNSUPPORTED_TIME", "Intervals crossing a leap-second insertion are not supported by the current timestamp contract.")
    delta = request.end_utc - request.start_utc
    exact_span = Decimal(delta.days * 86400 + delta.seconds) + Decimal(delta.microseconds) / Decimal(1000000)
    count = int((exact_span / Decimal(str(request.sample_step_s))).to_integral_value(rounding=ROUND_CEILING)) + 1
    if count > 10001:
        raise GeometryError("RESOURCE_LIMIT", "Physical-time sampling exceeds the 10001-sample limit.")
    result = []
    for index in range(count):
        if index == 0:
            result.append((request.start_utc, start_et))
        elif index == count - 1:
            result.append((request.end_utc, end_et))
        else:
            et = float(spice.unitim(start_tai + index * request.sample_step_s, "TAI", "ET"))
            utc = datetime.fromisoformat(spice.et2utc(et, "ISOC", 6)).replace(tzinfo=timezone.utc)
            if result[-1][0] < utc < request.end_utc:
                result.append((utc, utc_to_et(utc, spice)))
    return tuple(result)


def observer_position(site: LunarSite, spice):
    validate_site(site)
    altitude_km = (site.surface_elevation_m + site.observer_height_m) / 1000
    return spice.georec(radians(site.longitude_deg), radians(site.latitude_deg), altitude_km, RADIUS_M / 1000, 0.0)


def normalize_angles(azimuth_rad: float, elevation_rad: float, latitude_deg: float) -> tuple[float | None, float]:
    if not all(isfinite(value) for value in (azimuth_rad, elevation_rad, latitude_deg)) or abs(degrees(elevation_rad)) > 90 + 1e-10:
        raise GeometryError("CALCULATION_FAILED", "SPICE returned invalid angular coordinates.")
    elevation = max(-90.0, min(90.0, degrees(elevation_rad)))
    # There is no unique local north at either geographic pole or azimuth at zenith/nadir.
    azimuth = None if abs(latitude_deg) == 90 or abs(cos(elevation_rad)) < 1e-12 else degrees(azimuth_rad) % 360.0
    return azimuth, elevation


def directions(site: LunarSite, et: float, loaded: LoadedKernels, correction: str = "NONE") -> dict:
    """CN+S is restricted to the validation diagnostic; API settings accept NONE only."""
    if correction not in ("NONE", "CN+S"):
        raise GeometryError("INVALID_REQUEST", "Unsupported aberration correction.")
    position = observer_position(site, loaded.spice)
    values = {}
    for name, target in (("sun", "SUN"), ("earth", "EARTH")):
        if abs(site.latitude_deg) == 90:
            # azlcpo cannot construct local north at a pole (DEPENDENTVECTORS).
            # Surface normal is +/- frame Z; elevation remains uniquely defined.
            state, _ = loaded.spice.spkcpo(target, et, FRAME, "OBSERVER", correction, position, "MOON", FRAME)
            up = float(state[2]) * (1 if site.latitude_deg > 0 else -1)
            azimuth, elevation = normalize_angles(0.0, atan2(up, hypot(float(state[0]), float(state[1]))), site.latitude_deg)
        else:
            state, _ = loaded.spice.azlcpo("ELLIPSOID", target, et, correction, False, True, position, "MOON", FRAME)
            azimuth, elevation = normalize_angles(float(state[1]), float(state[2]), site.latitude_deg)
        values[f"{name}_azimuth_deg"] = azimuth
        values[f"{name}_elevation_deg"] = elevation
    return values


def case_key(site: LunarSite, utc: datetime) -> str:
    return json.dumps([site.latitude_deg, site.longitude_deg, site.surface_elevation_m,
                       site.observer_height_m, utc.astimezone(timezone.utc).isoformat()], separators=(",", ":"))


def reference_cases(loaded: LoadedKernels) -> set[str]:
    try:
        report = json.loads(REPORT_PATH.read_text(encoding="utf-8"))
        if (report["overall_passed"] and report["engine_version"] == ENGINE_VERSION
                and report["kernel_fingerprint"] == loaded.fingerprint
                and report["engine_sha256"] == file_sha256(Path(__file__))
                and report["spiceypy_version"] == loaded.spice.__version__):
            return set(report["reference_compared_cases"])
    except (OSError, ValueError, KeyError, TypeError):
        pass
    return set()


def observation_loaded(site: LunarSite, utc: datetime, et: float, loaded: LoadedKernels,
                       compared_cases: set[str] | None = None) -> EphemerisObservation:
    values = directions(site, et, loaded)
    matched = case_key(site, utc) in (reference_cases(loaded) if compared_cases is None else compared_cases)
    validation, report_id = ("reference_compared", REPORT_ID) if matched else ("unvalidated", None)
    provenance_ids = ("geometry-model",) + tuple(f"kernel:{item['filename']}" for item in loaded.records)
    metrics = {name: Metric(
        value=value, status="available" if value is not None else "unavailable",
        reason=None if value is not None else "Azimuth is undefined at the geographic pole or numerical zenith/nadir.",
        provenance_ids=provenance_ids, validation=validation, validation_report_id=report_id,
    ) for name, value in values.items()}
    return EphemerisObservation(time_utc=utc, reference_frame=FRAME, correction_mode="NONE",
        status="partial" if any(value is None for value in values.values()) else "calculated",
        provenance_ids=provenance_ids, **metrics)


def observe(site: LunarSite, utc: datetime, configuration: KernelConfiguration | None = None) -> EphemerisObservation:
    """Convenience one-epoch observation; use observe_with_provenance for resolved sources."""
    return observe_with_provenance(site, utc, configuration)[0]


def observe_with_provenance(site: LunarSite, utc: datetime, configuration: KernelConfiguration | None = None) -> tuple[EphemerisObservation, tuple[DataProvenance, ...]]:
    """Reusable one-epoch calculation including explicit source/provenance records."""
    with (configuration or KernelConfiguration.from_environment()).loaded() as loaded:
        et = utc_to_et(utc, loaded.spice)
        loaded.require_coverage(et, et)
        observation = observation_loaded(site, utc, et, loaded)
        return observation, provenance(loaded, (observation,))


def provenance(loaded: LoadedKernels, observations: tuple[EphemerisObservation, ...]) -> tuple[DataProvenance, ...]:
    compared = bool(observations) and all(item.sun_elevation_deg.validation == "reference_compared" for item in observations)
    model = DataProvenance(
        id="geometry-model", provider_name="ScientificAnalysisProvider", provider_mode="scientific",
        data_source="NAIF DE440 pinned kernel set", source_version=ENGINE_VERSION,
        calculation_method="SPICE azlcpo ELLIPSOID; polar spkcpo normal projection; NONE; clockwise north; positive-up elevation; degrees",
        reference_frame=FRAME, sha256=loaded.fingerprint,
        validation_status="reference_compared" if compared else "unvalidated",
        validation_report_id=REPORT_ID if compared else None,
        assumptions=("Planetocentric coordinates; sphere radius 1737400 m; heights above that sphere.",
                     "Geometric centers; no refraction, light-time, stellar aberration, terrain or disk visibility.",
                     "LSK 0012 extrapolates its last leap-second offset at future epochs.",
                     f"SpiceyPy {loaded.spice.__version__}; {loaded.spice.tkvrsn('TOOLKIT')}."),
    )
    kernels = tuple(DataProvenance(
        id=f"kernel:{item['filename']}", provider_name="NAIF/JPL", provider_mode="scientific",
        data_source=item["filename"], source_version=item["version"], source_url=item["url"],
        calculation_method=item["purpose"], sha256=item["sha256"], reference_frame=FRAME,
    ) for item in loaded.records)
    return (model,) + kernels


def analyze_geometry(request: ScenarioRequest, configuration: KernelConfiguration | None = None) -> ScenarioResult:
    with (configuration or KernelConfiguration.from_environment()).loaded() as loaded:
        validate_site(request.site)
        if request.settings.terrain_enabled or request.settings.power_enabled or request.settings.communication_enabled:
            raise GeometryError("INVALID_REQUEST", "Step 3 supports ephemeris geometry only; terrain and engineering analysis must be disabled.")
        times = sample_times(request, loaded)
        compared_cases = reference_cases(loaded)
        observations = tuple(observation_loaded(request.site, utc, et, loaded, compared_cases) for utc, et in times)
        scenario_id = sha256((request.model_dump_json() + loaded.fingerprint + ENGINE_VERSION).encode()).hexdigest()[:32]
        return ScenarioResult(
            scenario_id=scenario_id, request=request, provider_mode="scientific", model_version=ENGINE_VERSION,
            status="partial" if any(item.status == "partial" for item in observations) else "complete",
            observations=observations, provenance=provenance(loaded, observations),
            warnings=("Geometry only. Terrain, visibility windows, power and communication feasibility are not calculated.",
                      "Reference comparisons cover a finite grid; unmatched epochs/sites remain unvalidated."),
        )
