"""Small versioned routes with explicit provider dispatch."""

from typing import Annotated, Callable, Literal

from fastapi import APIRouter, Depends, Response, Request
from fastapi.responses import JSONResponse
from lunascend.contracts import AnalysisError

from lunascend import __version__
from lunascend.contracts import ErrorResponse, ScenarioRequest, ScenarioResult
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
    implemented_analysis_providers: tuple[str, ...] = ("mock", "scientific")
    selectable_provider_modes: tuple[ProviderMode, ...] = ("scientific",)
    scientific_calculations_available: bool = False
    mock_analysis_available: bool = False


def provider_factory() -> Callable[[ProviderMode], AnalysisProvider]:
    return get_provider


@router.get("/health")
def health() -> Health:
    return Health()


@router.get("/api/v1/info")
def info(http_request: Request) -> ApplicationInfo:
    from lunascend.providers.scientific import scientific_available
    available = scientific_available()
    return ApplicationInfo(scientific_calculations_available=available,
                           mock_analysis_available=http_request.app.state.enable_test_mock,
                           capabilities=("contract_validation", "provider_dispatch", "geometric_ephemeris"))


@router.post("/api/v1/scenarios/analyze", response_model=ScenarioResult,
             responses={503: {"model": ScenarioResult}, 422: {"model": ErrorResponse | ScenarioResult}})
async def analyze(
    request: ScenarioRequest,
    response: Response,
    http_request: Request,
    factory: Annotated[Callable[[ProviderMode], AnalysisProvider], Depends(provider_factory)],
) -> ScenarioResult:
    if request.provider_mode == "mock" and not http_request.app.state.enable_test_mock:
        return JSONResponse(status_code=422, content=ErrorResponse(errors=(AnalysisError(code="INVALID_REQUEST", message="Mock output is disabled in the production workspace."),)).model_dump(mode="json"))
    result = await factory(request.provider_mode).analyze(request)
    if result.status == "unavailable":
        response.status_code = 503
    elif result.status == "failed":
        response.status_code = 422 if result.errors and result.errors[0].code in (
            "INVALID_REQUEST", "FRAME_MISMATCH", "OUTSIDE_COVERAGE", "UNSUPPORTED_TIME", "RESOURCE_LIMIT"
        ) else 500
    return result
