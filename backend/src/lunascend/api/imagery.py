"""Bounded optical tile API. No imagery enters astronomy, terrain or engineering engines."""
import asyncio
from typing import Annotated
from fastapi import APIRouter, HTTPException, Path
from fastapi.responses import Response
from lunascend.imagery.tiles import CATALOG, ImageryUnavailable, get_tile
from lunascend.contracts.imagery import ImageAnchorRequest, ImageAnchorResponse

router = APIRouter()
_slots = asyncio.Semaphore(4)
_anchor_slot = asyncio.Semaphore(1)
_waiting = 0


def native_anchor(request: ImageAnchorRequest) -> ImageAnchorResponse:
    from lunascend.contracts.terrain import TerrainRequest
    from lunascend.terrain.frames import frame_rotation
    from lunascend.terrain.geometry import local_basis, unit_lonlat
    rotation, metadata = frame_rotation(TerrainRequest(dataset_id='lola-site01-5m-v2020',
        latitude_deg=request.latitude_deg, longitude_deg=request.longitude_deg,
        reference_frame='MOON_ME_DE440_ME421', coordinate_epoch_utc=request.coordinate_epoch_utc))
    longitude, latitude = unit_lonlat(rotation @ local_basis(request.latitude_deg, request.longitude_deg)[0])
    return ImageAnchorResponse(latitude_deg=float(latitude), longitude_deg=float(longitude), reference_frame='MOON_ME_DE421',
        request=request, frame_transform=metadata, registration_verified=False,
        qualification='Exact scientific anchor in native DE421; nominal placement on Moon cartographic imagery only. Image realization / local tie remains unverified.')


@router.post('/api/v1/imagery/anchor', response_model=ImageAnchorResponse)
async def imagery_anchor(request: ImageAnchorRequest):
    from lunascend.terrain.errors import TerrainError
    try:
        await asyncio.wait_for(_anchor_slot.acquire(), timeout=1)
    except TimeoutError:
        raise HTTPException(503, 'Coordinate bridge is busy; retry after it finishes.') from None
    try:
        task = asyncio.create_task(asyncio.to_thread(native_anchor, request))
        try:
            return await asyncio.shield(task)
        except asyncio.CancelledError:
            await task
            raise
    except (ImportError, TerrainError):
        raise HTTPException(503, 'Exact coordinate bridge unavailable; no approximate frame conversion supplied.') from None
    finally:
        _anchor_slot.release()


@router.get('/api/v1/imagery/catalog')
async def imagery_catalog():
    return CATALOG


@router.get('/api/v1/imagery/tiles/{layer_id}/{level}/{row}/{column}')
async def imagery_tile(layer_id: str, level: Annotated[int, Path(ge=0, le=11)], row: Annotated[int, Path(ge=0, le=2047)], column: Annotated[int, Path(ge=0, le=4095)]):
    global _waiting
    if _waiting >= 12:
        raise HTTPException(503, 'Imagery queue is full; cached or DEM views remain available.')
    _waiting += 1
    try:
        await asyncio.wait_for(_slots.acquire(), timeout=18)
    except TimeoutError:
        raise HTTPException(503, 'Imagery queue is full; cached or DEM views remain available.') from None
    finally:
        _waiting -= 1
    try:
        task = asyncio.create_task(asyncio.to_thread(get_tile, layer_id, level, row, column))
        try:
            payload, media_type, cached = await asyncio.shield(task)
        except asyncio.CancelledError:
            await task  # A disconnected client must not bypass the four-worker bound.
            raise
        return Response(payload, media_type=media_type, headers={'Cache-Control': 'public, max-age=604800', 'X-LunAscend-Imagery': 'cache' if cached else 'official-service'})
    except ValueError as exc:
        raise HTTPException(404, str(exc)) from None
    except ImageryUnavailable as exc:
        raise HTTPException(503, str(exc)) from None
    finally:
        _slots.release()
