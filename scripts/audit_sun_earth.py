"""Bounded real API diagnostic; no search, downloads or reference-value substitution."""
from copy import deepcopy
from datetime import datetime, timezone
import json
from pathlib import Path
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]

def post(path, value):
    with urlopen(Request('http://127.0.0.1:8000/api/v1/'+path, data=json.dumps(value).encode(), headers={'Content-Type':'application/json'}), timeout=180) as response:
        return json.load(response)

def main():
    base = json.loads((ROOT/'docs/validation/numerical-display-check.json').read_text())['dates'][0]['request']
    epoch = base['start_utc']
    polar = post('exploration/polar-sites', {'latitude_deg':0.,'longitude_deg':0.,'coordinate_epoch_utc':epoch})['sites']
    apollo = post('exploration/apollo', {'latitude_deg':0.,'longitude_deg':0.,'coordinate_epoch_utc':epoch})['sites']
    locations = [('Site01 original observer', None), *[(p['name'],p) for p in polar if p['id'] in ('pgda-site06','pgda-site04')], ('Apollo 15', next(p for p in apollo if p['id']=='apollo-15')), ('Outside installed terrain (10N 10E)', {'id':'outside','context_latitude':10.,'context_longitude':10.})]
    rows = []
    for name, pin in locations:
        request = deepcopy(base)
        if pin:
            request['site'].update(site_id=pin['id'], name=name, latitude_deg=pin['context_latitude'],longitude_deg=pin['context_longitude'])
        site=request['site']
        coverage=post('terrain/coverage', {'dataset_id':pin.get('dataset_id') if pin and pin.get('dataset_id') else 'lola-site01-5m-v2020','latitude_deg':site['latitude_deg'],'longitude_deg':site['longitude_deg'],'reference_frame':'MOON_ME_DE440_ME421','coordinate_epoch_utc':epoch})
        if coverage['dataset_id']:
            request['settings']['terrain_options'].update(dataset_id=coverage['dataset_id'],max_search_radius_m=coverage['recommended_radius_m'])
        else:
            # Hypothetical explicit sphere-height assumption, NOT a measured elevation.
            site['surface_elevation_m']=0.
            request['settings'].update(terrain_enabled=False,power_enabled=False,communication_enabled=False,terrain_options=None,power_options=None,communication_options=None,horizon_mode='geometric_approximation')
        result=post('scenarios/analyze',request)
        assert len(result['observations'])==25
        assert result.get('availability',{}).get('sun_geometry',{}).get('code')=='geometric_only'
        rows.append({'location':name,'request':request,'coverage':coverage,'response':result})
        print(name, len(result['observations']), coverage['dataset_id'], flush=True)
    geometry=deepcopy(base)
    geometry['site']['surface_elevation_m']=0.
    geometry['settings'].update(terrain_enabled=False,power_enabled=False,communication_enabled=False,terrain_options=None,power_options=None,communication_options=None,horizon_mode='geometric_approximation')
    control=post('scenarios/analyze',geometry)
    assert len(control['observations'])==25 and control['terrain_visibility'] is None and control['communication'] is None
    output={'executed_utc':datetime.now(timezone.utc).isoformat(),'geometry_only_control':control,'locations':rows}
    (ROOT/'docs/validation/sun-earth-audit.json').write_text(json.dumps(output,indent=2)+'\n',encoding='utf-8')

if __name__=='__main__': main()
