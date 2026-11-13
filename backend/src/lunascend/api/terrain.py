"""Terrain-only endpoint; no automatic change to scenario provider behavior."""
import asyncio
from typing import Annotated, Callable
from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from lunascend.contracts import AnalysisError, ErrorResponse
from lunascend.contracts.terrain import TerrainRequest, TerrainResult
from lunascend.contracts.visualization import MeshRequest, TerrainMesh, InspectionRequest, TerrainInspection
from lunascend.terrain.errors import TerrainError

router = APIRouter()
_visualization_lock = asyncio.Lock()


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


async def visualization_product(request: MeshRequest | InspectionRequest):
    try:
        if _visualization_lock.locked():
            raise TerrainError('RESOURCE_LIMIT','Another terrain visualization request is running; retry after it finishes.')
        from lunascend.terrain.visualization import analyze_mesh, inspect_terrain
        async with _visualization_lock:
            task=asyncio.create_task(asyncio.to_thread(inspect_terrain if isinstance(request,InspectionRequest) else analyze_mesh,request))
            try:
                return await asyncio.shield(task)
            except asyncio.CancelledError:
                await task  # Do not release the memory/concurrency bound while the worker is still running.
                raise
    except ImportError:
        error = AnalysisError(code='PROVIDER_UNAVAILABLE',module='terrain',message='Install the locked terrain and science extras for georeferenced visualization.')
    except TerrainError as exc:
        error = exc.error
    return JSONResponse(status_code=503 if error.code in ('MISSING_DATA','PROVIDER_UNAVAILABLE') else 422,
        content=ErrorResponse(errors=(error,)).model_dump(mode='json'))


@router.post('/api/v1/terrain/mesh',response_model=TerrainMesh)
async def terrain_mesh(request: MeshRequest):
    return await visualization_product(request)


@router.post('/api/v1/terrain/inspect',response_model=TerrainInspection)
async def terrain_inspection(request: InspectionRequest):
    return await visualization_product(request)
