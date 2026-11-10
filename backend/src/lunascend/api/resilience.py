"""Thin bounded resilience endpoint; disconnected clients stop between candidates."""
from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from lunascend.contracts.resilience import OpportunityRequest, OpportunityResponse
from lunascend.ephemeris.kernels import GeometryError
from lunascend.terrain.errors import TerrainError
from lunascend.resilience.service import SearchService

router = APIRouter()
service = SearchService()


@router.post('/api/v1/resilience/search',response_model=OpportunityResponse)
async def search(body: OpportunityRequest, request: Request):
    try:
        return await service.search(body,request.is_disconnected)
    except (GeometryError,TerrainError) as exc:
        return JSONResponse(status_code=503 if exc.error.code in ('MISSING_DATA','PROVIDER_UNAVAILABLE') else 422,
            content={'errors':[exc.error.model_dump(mode='json')]})
    except ImportError:
        return JSONResponse(status_code=503,content={'errors':[{'code':'PROVIDER_UNAVAILABLE',
            'message':'Install the locked science and terrain extras; no fallback data are available.'}]})
