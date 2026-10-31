"""Deterministic display curves; no lunar physics or scientific dependencies."""

from datetime import datetime, timedelta, timezone
from decimal import Decimal, ROUND_CEILING
from hashlib import sha256
from math import pi, sin

from lunascend.contracts import (
    AnalysisError, DataProvenance, EphemerisObservation, Metric, ScenarioRequest, ScenarioResult,
)

MODEL_VERSION = "mock-curves-v1"
MOCK_FRAME = "MOCK_DEMONSTRATION_FRAME"
WARNING = "MOCK / NOT LUNAR PREDICTIONS: synthetic demonstration data for software testing only."
EPOCH = datetime(2000, 1, 1, tzinfo=timezone.utc)


def sample_times(request: ScenarioRequest) -> tuple[datetime, ...]:
    """Nominal UTC civil sampling; endpoints once, short final interval allowed."""
    delta = request.end_utc - request.start_utc
    span = Decimal(delta.days * 86400 + delta.seconds) + Decimal(delta.microseconds) / 1000000
    step = Decimal(str(request.sample_step_s))
    count = int((span / step).to_integral_value(rounding=ROUND_CEILING)) + 1
    # Recheck with decimal arithmetic rather than relying on float division.
    if count > 10001:
        raise ValueError("Sampling exceeds the 10001-sample limit")
    interior = tuple(request.start_utc + timedelta(microseconds=int(step * index * 1000000))
                     for index in range(1, count - 1))
    return (request.start_utc, *interior, request.end_utc)


class MockAnalysisProvider:
    async def analyze(self, request: ScenarioRequest) -> ScenarioResult:
        if request.provider_mode != "mock":
            raise ValueError("Provider selection mismatch")
        provenance = (DataProvenance(
            id="mock-generator", provider_name="MockAnalysisProvider", provider_mode="mock",
            data_source="Synthetic demonstration data", source_version=MODEL_VERSION,
            calculation_method="Deterministic mock generator: arbitrary smooth display curves",
            reference_frame=MOCK_FRAME, validation_status="mock",
            assumptions=(WARNING, "Site latitude/longitude only shift arbitrary curves; no lunar frame transformation.",
                         "Nominal UTC civil seconds, not leap-second-aware physical elapsed time.",
                         "Heights, terrain, clearance settings and body disks are not modeled."),
        ),)
        identity = sha256((MODEL_VERSION + request.model_dump_json()).encode()).hexdigest()[:32]
        common = dict(scenario_id=identity, request=request, provider_mode="mock",
                      model_version=MODEL_VERSION, provenance=provenance,
                      warnings=(WARNING, "Terrain, visibility windows, power, communication and resilience are not modeled."))
        if request.settings.terrain_enabled or request.settings.power_enabled or request.settings.communication_enabled:
            return ScenarioResult(**common, status="failed", errors=(AnalysisError(
                code="INVALID_REQUEST", module="mock", message="Mock provider supports illustrative angles only; disable terrain and engineering analysis.",
            ),))
        try:
            times = sample_times(request)
        except ValueError:
            return ScenarioResult(**common, status="failed", errors=(AnalysisError(
                code="RESOURCE_LIMIT", module="mock", message="Mock sampling exceeds the 10001-sample limit.",
            ),))
        observations = []
        for utc in times:
            seconds = (utc - EPOCH).total_seconds()
            phase = 2 * pi * ((seconds % 172800) / 172800 + request.site.longitude_deg / 360
                              + request.site.latitude_deg / 180)
            values = dict(sun_azimuth_deg=(seconds / 480 + request.site.longitude_deg) % 360,
                          sun_elevation_deg=45 * sin(phase),
                          earth_azimuth_deg=(seconds / 900 + request.site.longitude_deg + 180) % 360,
                          earth_elevation_deg=15 * sin(phase + pi / 3))
            if abs(request.site.latitude_deg) == 90:
                values["sun_azimuth_deg"] = values["earth_azimuth_deg"] = None
            metrics = {name: Metric(value=value, status="available" if value is not None else "unavailable",
                                   validation="mock", provenance_ids=("mock-generator",),
                                   reason="Azimuth is undefined at the geographic pole; mock data." if value is None else None)
                       for name, value in values.items()}
            observations.append(EphemerisObservation(time_utc=utc, reference_frame=MOCK_FRAME,
                status="illustrative", provenance_ids=("mock-generator",), assumptions=(WARNING,), **metrics))
        return ScenarioResult(**common, status="partial" if abs(request.site.latitude_deg) == 90 else "complete",
                              observations=tuple(observations))
