"""Terrain-only endpoint; no automatic change to scenario provider behavior."""
import asyncio
from typing import Annotated, Callable
from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from lunascend.contracts import AnalysisError, ErrorResponse
from lunascend.contracts.terrain import TerrainRequest, TerrainResult
from lunascend.terrain.errors import TerrainError

router = APIRouter()


def terrain_service_factory() -> Callable[[TerrainRequest], TerrainResult]:
    def execute(request: TerrainRequest) -> TerrainResult:
        from lunascend.terrain.engine import analyze_terrain
        return analyze_terrain(request)
    return execute


@router.post("/api/v1/terrain/horizon", response_model=TerrainResult,
             responses={422: {"model": ErrorResponse}, 503: {"model": ErrorResponse}})
async def terrain_horizon(request: TerrainRequest,
                          service: Annotated[Callable, Depends(terrain_service_factory)]):
    try:
        return await asyncio.to_thread(service, request)
    except ImportError:
        error = AnalysisError(code="PROVIDER_UNAVAILABLE", module="terrain",
            message="Install the locked terrain extra to enable Rasterio, PyProj and NumPy.", recoverable=True)
    except TerrainError as exc:
        error = exc.error
    status = 503 if error.code in ("MISSING_DATA", "PROVIDER_UNAVAILABLE") else 422
    return JSONResponse(status_code=status, content=ErrorResponse(errors=(error,)).model_dump(mode="json"))
