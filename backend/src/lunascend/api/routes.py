"""Small versioned routes with explicit provider dispatch."""

from typing import Annotated, Callable, Literal

from fastapi import APIRouter, Depends, Response

from lunascend import __version__
from lunascend.contracts import ScenarioRequest, ScenarioResult
from lunascend.contracts.common import Contract, ProviderMode
from lunascend.providers import AnalysisProvider, get_provider

router = APIRouter()


class Health(Contract):
    status: Literal["ok"] = "ok"
    application_name: str = "LunAscend"
    api_version: str = "1.0"


class ApplicationInfo(Contract):
    application_name: str = "LunAscend"
    application_version: str = __version__
    api_version: str = "1.0"
    capabilities: tuple[str, ...] = ("contract_validation", "provider_dispatch")
    implemented_analysis_providers: tuple[str, ...] = ()
    selectable_provider_modes: tuple[ProviderMode, ...] = ("mock", "scientific")
    scientific_calculations_available: bool = False
    mock_analysis_available: bool = False


def provider_factory() -> Callable[[ProviderMode], AnalysisProvider]:
    return get_provider


@router.get("/health")
def health() -> Health:
    return Health()


@router.get("/api/v1/info")
def info() -> ApplicationInfo:
    return ApplicationInfo()


@router.post("/api/v1/scenarios/analyze", response_model=ScenarioResult,
             responses={503: {"model": ScenarioResult}})
async def analyze(
    request: ScenarioRequest,
    response: Response,
    factory: Annotated[Callable[[ProviderMode], AnalysisProvider], Depends(provider_factory)],
) -> ScenarioResult:
    result = await factory(request.provider_mode).analyze(request)
    if result.status == "unavailable":
        response.status_code = 503
    elif result.status == "failed":
        response.status_code = 500
    return result
