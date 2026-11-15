"""Execute real, bounded local API examples; never supply production reference values."""
from copy import deepcopy
from datetime import datetime, timezone
import json
from pathlib import Path
from urllib.request import Request, urlopen
ROOT=Path(__file__).resolve().parents[1]
def post(path, data):
    with urlopen(Request('http://127.0.0.1:8000'+path,data=json.dumps(data).encode(),headers={'Content-Type':'application/json'}),timeout=180) as response:return json.load(response)
def main():
    original=json.loads((ROOT/'docs/validation/numerical-display-check.json').read_text(encoding='utf-8'))['dates'][0]['request']
    evidence=[]
    def run(request,label):
        result=post('/api/v1/scenarios/analyze',request)
        assert len(result['observations'])==25
        report=post('/api/v1/scenarios/assess',{'result':result})
        row={'label':label,'request':request,'samples':len(result['observations']),'first_geometry':result['observations'][0],
          'first_terrain':result['terrain_visibility']['observations'][0] if result['terrain_visibility'] else None,
          'cases':[{k:c[k] for k in ['assumption','totals','passes_configured_model','unknown_duration_s']} for c in result['power']['cases']] if result['power'] else [],
          'dte':{'access_s':result['communication']['earth_visibility_duration_s']['value'],'unknown_s':result['communication']['unknown_duration_s']} if result['communication'] else None,'assessment':report}
        evidence.append(row);print(label,len(result['observations']),report['classification'],flush=True)
        return result
    first=run(original,'Site01 November 14')
    assert evidence[-1]['assessment']['classification']=='does_not_meet_requirements'
    second=json.loads((ROOT/'docs/validation/numerical-display-check.json').read_text(encoding='utf-8'))['dates'][1]['request']
    run(second,'Site01 November 15 (same native observer)')
    epoch=original['start_utc']
    for kind,identifier in [('apollo','apollo-15'),('polar-sites','pgda-site06')]:
        pins=post('/api/v1/exploration/'+kind,{'latitude_deg':0,'longitude_deg':0,'coordinate_epoch_utc':epoch})['sites']
        pin=next(p for p in pins if p['id']==identifier)
        request=deepcopy(original);request['site'].update(site_id=pin['id'],name=pin['name'],latitude_deg=pin['context_latitude'],longitude_deg=pin['context_longitude'],surface_elevation_m=None if kind=='polar-sites' else 0.,observer_height_m=0.)
        if kind=='apollo':request['settings'].update(terrain_enabled=False,power_enabled=False,communication_enabled=False,terrain_options=None,power_options=None,communication_options=None,horizon_mode='geometric_approximation')
        else:request['settings']['terrain_options'].update(dataset_id=pin['dataset_id'],max_search_radius_m=100.)
        result=run(request,pin['name'])
        coverage=post('/api/v1/terrain/coverage',{'dataset_id':pin.get('dataset_id') or 'lola-site01-5m-v2020','latitude_deg':pin['context_latitude'],'longitude_deg':pin['context_longitude'],'reference_frame':'MOON_ME_DE440_ME421','coordinate_epoch_utc':epoch})
        evidence[-1]['coverage']=coverage
        assert bool(coverage['dataset_id'])==(kind=='polar-sites')
    global_coverage=post('/api/v1/terrain/coverage',{'dataset_id':'lola-site01-5m-v2020','latitude_deg':10.,'longitude_deg':10.,'reference_frame':'MOON_ME_DE440_ME421','coordinate_epoch_utc':epoch})
    assert global_coverage['dataset_id'] is None
    output={'executed_utc':datetime.now(timezone.utc).isoformat(),'scope':'Fresh local scientific and deterministic interpretation checks, not new external validation.','examples':evidence,'global_coordinate_10N_10E':global_coverage}
    (ROOT/'docs/validation/step-13-results.json').write_text(json.dumps(output,indent=2)+'\n',encoding='utf-8')
if __name__=='__main__':main()
