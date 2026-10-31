"""Async adapter for the synchronous, serialized SPICE engine."""

import asyncio
from uuid import uuid4

from lunascend.contracts import AnalysisError, DataProvenance, ScenarioRequest, ScenarioResult
from lunascend.ephemeris.kernels import GeometryError, KernelConfiguration


class ScientificAnalysisProvider:
    def __init__(self, configuration: KernelConfiguration | None = None) -> None:
        self.configuration = configuration or KernelConfiguration.from_environment()

    async def analyze(self, request: ScenarioRequest) -> ScenarioResult:
        if request.provider_mode != "scientific":
            raise ValueError("Provider selection mismatch")
        try:
            from lunascend.ephemeris.engine import analyze_geometry
            return await asyncio.to_thread(analyze_geometry, request, self.configuration)
        except GeometryError as exc:
            error = exc.error
        except Exception:
            error = AnalysisError(code="CALCULATION_FAILED", module="ephemeris",
                                  message="SPICE geometry could not be completed with the configured resources.")
        unavailable = error.code in ("MISSING_DATA", "PROVIDER_UNAVAILABLE")
        return ScenarioResult(
            scenario_id=str(uuid4()), request=request, provider_mode="scientific", model_version="spice-geometry-v1",
            status="unavailable" if unavailable else "failed", errors=(error,),
            provenance=(DataProvenance(id="provider-availability", provider_name="ScientificAnalysisProvider",
                provider_mode="scientific", data_source="No scientific result produced",
                calculation_method="No calculation performed"),),
        )


def scientific_available() -> bool:
    try:
        with KernelConfiguration.from_environment().loaded():
            return True
    except Exception:
        return False
