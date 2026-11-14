"""ASGI entry point: uvicorn lunascend.main:app."""

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from lunascend import __version__
from lunascend.api.routes import router
from lunascend.api.terrain import router as terrain_router
from lunascend.api.resilience import router as resilience_router
from lunascend.api.imagery import router as imagery_router
from lunascend.api.exploration import router as exploration_router
from lunascend.contracts import AnalysisError, ErrorResponse


def create_app() -> FastAPI:
    app = FastAPI(title="LunAscend", version=__version__)
    app.include_router(router)
    app.include_router(terrain_router)
    app.include_router(resilience_router)
    app.include_router(imagery_router)
    app.include_router(exploration_router)

    @app.exception_handler(RequestValidationError)
    async def invalid_request(request: Request, exc: RequestValidationError) -> JSONResponse:
        # Do not echo raw input, which can contain private configuration.
        errors = tuple(AnalysisError(
            code="INVALID_REQUEST", message=error["msg"][:500],
            field=".".join(str(part) for part in error["loc"])[:500],
            recoverable=True,
        ) for error in exc.errors())
        return JSONResponse(status_code=422, content=ErrorResponse(errors=errors).model_dump(mode="json"))

    @app.exception_handler(Exception)
    async def calculation_failure(request: Request, exc: Exception) -> JSONResponse:
        error = AnalysisError(code="CALCULATION_FAILED", message="Analysis could not be completed.")
        return JSONResponse(status_code=500, content=ErrorResponse(errors=(error,)).model_dump(mode="json"))

    return app


app = create_app()
