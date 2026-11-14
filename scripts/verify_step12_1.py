"""Real local API checks for the retained per-site data; no hardcoded live outputs."""
from copy import deepcopy
from datetime import datetime,timedelta,timezone
import json
from pathlib import Path
from verify_step12 import post,ROOT

def request_for(pin,epoch,terrain):
    original=json.loads((ROOT/'docs/validation/numerical-display-check.json').read_text(encoding='utf-8'))['dates'][0]['request']
    r=deepcopy(original);r['start_utc']=epoch;r['end_utc']=(datetime.fromisoformat(epoch.replace('Z','+00:00'))+timedelta(days=1)).isoformat()
    r['site'].update(site_id=pin['id'],name=pin['name'],latitude_deg=pin['context_latitude'],longitude_deg=pin['context_longitude'],surface_elevation_m=None if terrain else 0,observer_height_m=2 if terrain else 0)
    r['settings'].update(terrain_enabled=terrain,power_enabled=terrain,communication_enabled=terrain,horizon_mode='terrain' if terrain else 'geometric_approximation')
    if terrain:r['settings']['terrain_options'].update(dataset_id=pin['dataset_id'],coordinate_epoch_utc=epoch,max_search_radius_m=100,radial_step_m=5)
    else:r['settings'].update(terrain_options=None,power_options=None,communication_options=None)
    return r

def summarize(result):
    assert len(result['observations'])==25
    row=result['observations'][0]
    data={'samples':25,'sun_elevation_deg':row['sun_elevation_deg']['value'],'sun_azimuth_deg':row['sun_azimuth_deg']['value'],
      'earth_elevation_deg':row['earth_elevation_deg']['value'],'earth_azimuth_deg':row['earth_azimuth_deg']['value']}
    if result['horizon']:
        data.update(surface_elevation_m=result['horizon']['surface_elevation_m'],terrain_source=result['horizon']['terrain_source'],global_horizon_complete=result['horizon']['global_horizon_complete'])
    if result['power']:data['power']={case['assumption']:case['totals'] for case in result['power']['cases']}
    if result['communication']:data['communication']={k:result['communication'][k] for k in ['earth_visibility_duration_s','longest_interruption_s','unknown_duration_s','link_availability']}
    return data

def main():
    evidence={'executed_utc':datetime.now(timezone.utc).isoformat(),'meaning':'Executed integration checks; not independent external terrain validation.','sites':[],'historical':[]}
    for epoch in ['2026-11-14T00:00:00Z','2026-11-15T00:00:00Z']:
        anchor={'latitude_deg':0,'longitude_deg':0,'coordinate_epoch_utc':epoch}
        sites=post('/api/v1/exploration/apollo',anchor)['sites']+post('/api/v1/exploration/polar-sites',anchor)['sites']
        for site in sites:
            if site['latitude'] is None:continue
            terrain=bool(site.get('dataset_id'));r=request_for(site,epoch,terrain)
            result=post('/api/v1/scenarios/analyze',r)
            summary=summarize(result)
            if terrain:assert summary['terrain_source']==site['dataset_id'] and summary['global_horizon_complete'] is False
            else:assert result['horizon'] is None and result['communication'] is None
            evidence['sites'].append({'id':site['id'],'epoch':epoch,'native_latitude':site['latitude'],'native_longitude':site['longitude'],'result':summary})
            print(site['id'],epoch,summary['sun_elevation_deg'],summary['earth_elevation_deg'],flush=True)
    references=json.loads((ROOT/'data/manifests/apollo-historical-reference.json').read_text())['sites']
    for reference in references:
        if reference['utc']<'1972':continue
        epoch=reference['utc']
        sites=post('/api/v1/exploration/apollo',{'latitude_deg':0,'longitude_deg':0,'coordinate_epoch_utc':epoch})['sites']
        site=next(s for s in sites if s['id']==reference['id'])
        actual=summarize(post('/api/v1/scenarios/analyze',request_for(site,epoch,False)))
        expected={k:reference[k] for k in ['sun_elevation_deg','sun_azimuth_deg','earth_elevation_deg','earth_azimuth_deg']}
        evidence['historical'].append({'id':site['id'],'epoch':epoch,'actual_modern_lm_coordinates':actual,'alsj_reference':expected,
          'residual_deg':{k:(actual[k]-v+180)%360-180 if 'azimuth' in k else actual[k]-v for k,v in expected.items()},
          'qualification':'ALSJ coordinates differ and their dynamical realization is unspecified; diagnostic residuals, no validation pass label.'})
    (ROOT/'docs/validation/step-12.1-api-check.json').write_text(json.dumps(evidence,indent=2)+'\n',encoding='utf-8')

if __name__=='__main__':main()
