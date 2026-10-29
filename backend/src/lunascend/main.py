"""ASGI entry point: uvicorn lunascend.main:app."""

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from lunascend import __version__
from lunascend.api.routes import router
from lunascend.contracts import AnalysisError, ErrorResponse


def create_app() -> FastAPI:
    app = FastAPI(title="LunAscend", version=__version__)
    app.include_router(router)

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
