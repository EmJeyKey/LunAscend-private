"""Display adapters only: exact native Apollo coordinates into the existing globe frame."""
import asyncio
import json
from pathlib import Path
from functools import lru_cache
from fastapi import APIRouter, HTTPException
from typing import Literal
from lunascend.contracts.imagery import ImageAnchorRequest
from lunascend.terrain.screening import ScreeningCriteria

router = APIRouter()
CATALOG = json.loads((Path(__file__).resolve().parents[4] / 'data/manifests/apollo-sites.json').read_text(encoding='utf-8'))
_slot = asyncio.Semaphore(1)


@lru_cache(maxsize=16)
def apollo_context(epoch: str) -> dict:
    from lunascend.contracts.terrain import TerrainRequest
    from lunascend.terrain.frames import frame_rotation
    from lunascend.terrain.geometry import local_basis, unit_lonlat
    rotation, metadata = frame_rotation(TerrainRequest(dataset_id='lola-site01-5m-v2020', latitude_deg=0,
        longitude_deg=0, reference_frame='MOON_ME_DE440_ME421', coordinate_epoch_utc=epoch))
    sites = []
    for site in CATALOG['sites']:
        # Existing bridge is DE440 -> DE421; its transpose is the exact inverse.
        lon, lat = unit_lonlat(rotation.T @ local_basis(site['latitude'], site['longitude'])[0])
        sites.append({**site, 'context_latitude': float(lat), 'context_longitude': float(lon)})
    return {**CATALOG, 'sites': sites, 'context_frame': 'MOON_ME_DE440_ME421',
        'coordinate_epoch_utc': epoch, 'frame_transform': metadata,
        'qualification': 'Exact frame conversion for a context sphere; photographic registration and LM surface elevation are not established.'}


@router.post('/api/v1/exploration/apollo')
async def apollo_sites(request: ImageAnchorRequest):
    try:
        await asyncio.wait_for(_slot.acquire(), timeout=1)
    except TimeoutError:
        raise HTTPException(503, 'Apollo frame bridge is busy; retry shortly.') from None
    try:
        task = asyncio.create_task(asyncio.to_thread(apollo_context, request.coordinate_epoch_utc.isoformat()))
        try:
            return await asyncio.shield(task)
        except asyncio.CancelledError:
            await task
            raise
    except Exception:
        raise HTTPException(503, 'Exact Apollo frame conversion unavailable at this epoch; no approximate pins supplied.') from None
    finally:
        _slot.release()


@router.get('/api/v1/exploration/environment/{layer}')
async def environment_layer(layer: Literal['solar','earth','shadow']):
    try:
        from lunascend.terrain.polar_screening import polar_layer
        return await asyncio.to_thread(polar_layer,layer)
    except (ImportError,OSError,ValueError):
        raise HTTPException(503,'Verified NASA environment window unavailable; no substitute layer supplied.') from None


@router.post('/api/v1/exploration/screening')
async def environment_screening(request: ScreeningCriteria):
    try:
        from lunascend.terrain.screening import screening_layer
        return await asyncio.to_thread(screening_layer,request)
    except (ImportError,OSError,ValueError):
        raise HTTPException(503,'Screening evidence unavailable; no colored assessment supplied.') from None
