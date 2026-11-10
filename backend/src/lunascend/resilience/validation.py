"""Executed small real-data search; no favorable-outcome selection."""
import asyncio
import json
from hashlib import sha256
from lunascend.ephemeris.kernels import PROJECT_ROOT
from lunascend.contracts.resilience import OpportunityRequest
from .service import SearchService


async def main():
    baseline = json.loads((PROJECT_ROOT/'backend/examples/engineering-request.json').read_text(encoding='utf-8'))
    nearby = {**baseline['site'],'site_id':'site01-nearby','name':'Nearby input coordinate (not surveyed)',
        'latitude_deg':baseline['site']['latitude_deg']+0.001}
    unsupported = {**baseline['site'],'site_id':'outside-site01','name':'Deliberately outside installed DEM',
        'latitude_deg':-89.0,'longitude_deg':42.0}
    request = OpportunityRequest.model_validate(dict(baseline=baseline,earliest_utc=baseline['start_utc'],
        latest_utc='2026-11-15T00:00:00Z',step_hours=24.0,sites=[nearby,unsupported]))
    result = await SearchService().search(request)
    paths = [*PROJECT_ROOT.glob('backend/src/lunascend/resilience/*.py'),PROJECT_ROOT/'backend/src/lunascend/contracts/resilience.py',
        PROJECT_ROOT/'backend/src/lunascend/visibility/engine.py']
    report = {'report_id':'step-9-executed-search-v1','request':request.model_dump(mode='json'),
        'source_sha256':{str(p.relative_to(PROJECT_ROOT)).replace('\\','/'):sha256(p.read_bytes()).hexdigest() for p in paths},
        'response':result.model_dump(mode='json')}
    (PROJECT_ROOT/'docs/validation/step-9-results.json').write_text(json.dumps(report,ensure_ascii=True,allow_nan=False,separators=(',',':'))+'\n',encoding='utf-8')
    print(json.dumps({'elapsed_s':result.elapsed_s,'completed':result.completed,'failed':result.failed,'horizon_reuses':result.horizon_reuses,
        'rows':[{'site':r.site.site_id,'utc':r.start_utc.isoformat(),'classification':r.classification,'errors':r.errors,
                 'metrics':{k:v.candidate for k,v in r.differences.items()}} for r in result.opportunities]},indent=2))


if __name__=='__main__': asyncio.run(main())
