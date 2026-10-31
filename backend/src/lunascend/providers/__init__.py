"""Provider interface independent of HTTP or scientific libraries."""

from typing import Protocol
from uuid import uuid4

from lunascend import __version__
from lunascend.contracts import AnalysisError, DataProvenance, ScenarioRequest, ScenarioResult
from lunascend.contracts.common import ProviderMode


class AnalysisProvider(Protocol):
    async def analyze(self, request: ScenarioRequest) -> ScenarioResult:
        """Return an analysis or an unavailable result with structured errors."""
        ...


class UnavailableProvider:
    """Explicitly reports a not-yet-implemented provider without synthetic results."""

    def __init__(self, mode: ProviderMode) -> None:
        self.mode = mode

    async def analyze(self, request: ScenarioRequest) -> ScenarioResult:
        if request.provider_mode != self.mode:
            raise ValueError("Provider selection mismatch")
        return ScenarioResult(
            scenario_id=str(uuid4()), request=request, provider_mode=self.mode,
            model_version=__version__, status="unavailable",
            provenance=(DataProvenance(
                id="provider-availability", provider_name="UnavailableProvider",
                provider_mode=self.mode, data_source="No scientific or mock data loaded",
                calculation_method="No calculation performed",
                validation_status="mock" if self.mode == "mock" else "unvalidated",
            ),),
            errors=(AnalysisError(
                code="PROVIDER_UNAVAILABLE", module="providers",
                message=f"The {self.mode} analysis provider is not implemented in Step 2.",
                recoverable=False,
            ),),
        )


def get_provider(mode: ProviderMode) -> AnalysisProvider:
    if mode == "scientific":
        from .scientific import ScientificAnalysisProvider
        return ScientificAnalysisProvider()
    from .mock import MockAnalysisProvider
    return MockAnalysisProvider()
