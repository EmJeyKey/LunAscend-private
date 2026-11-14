"""Execute bounded real local API regressions; save summaries, never reference constants."""
from copy import deepcopy
from datetime import datetime, timezone, timedelta
import json
from pathlib import Path
from urllib.request import Request,urlopen

ROOT=Path(__file__).resolve().parents[1]


def post(path,body):
    with urlopen(Request('http://127.0.0.1:8000'+path,data=json.dumps(body).encode(),headers={'Content-Type':'application/json'}),timeout=300) as response:
        return json.load(response)


def main():
    original=json.loads((ROOT/'docs/validation/numerical-display-check.json').read_text(encoding='utf-8'))['dates'][0]['request']
    request={'baseline':original,'earliest_utc':'2026-11-14T00:00:00Z','latest_utc':'2026-11-15T00:00:00Z','step_hours':24,'sites':[],
        'constraints':{'maximum_unmet_load_wh':0,'minimum_soc_pct':10,'require_conservative_pass':True,'minimum_earth_clearance_deg':1,'maximum_dte_interruption_s':3600,'minimum_dte_access_s':3600,'required_duration_s':86400}}
    response=post('/api/v1/resilience/search',request)
    dates=[]
    for row in response['opportunities']:
        result=row['result'];assert result is not None and len(result['observations'])==25
        cases={c['assumption']:{'solar_generated_wh':c['totals']['solar_generated_wh'],'unmet_load_wh':c['totals']['unmet_load_wh'],
            'minimum_soc_pct':c['totals']['minimum_soc_pct'],'final_battery_energy_wh':c['totals']['final_battery_energy_wh'],'passes_configured_model':c['passes_configured_model']} for c in result['power']['cases']}
        dates.append({'utc':row['start_utc'],'samples':25,'classification':row['classification'],'cases':cases,
            'initial_sun_elevation_deg':result['observations'][0]['sun_elevation_deg']['value'],
            'initial_earth_elevation_deg':result['observations'][0]['earth_elevation_deg']['value'],
            'dte_access_s':result['communication']['earth_visibility_duration_s']['value'],'constraints':row['constraints'],
            'optimistic_solar_difference_wh':row['differences']['optimistic_solar_generated_wh']['delta']})
        assert row['classification']=='fails_modeled_requirement' and cases['optimistic']['passes_configured_model'] is False
    apollo=[]
    for number in [11,16,17]:
        epoch='2026-11-14T00:00:00Z' if number==11 else '1972-04-21T02:23:35Z' if number==16 else '1972-12-11T19:54:57Z'
        pins=post('/api/v1/exploration/apollo',{'latitude_deg':0,'longitude_deg':0,'coordinate_epoch_utc':epoch})
        pin=next(p for p in pins['sites'] if p['id']==f'apollo-{number}')
        r=deepcopy(original);r['start_utc']=epoch;r['end_utc']=(datetime.fromisoformat(epoch.replace('Z','+00:00'))+timedelta(days=1)).isoformat()
        r['site'].update(site_id=pin['id'],name=pin['name'],latitude_deg=pin['context_latitude'],longitude_deg=pin['context_longitude'],surface_elevation_m=0,observer_height_m=0)
        r['settings'].update(terrain_enabled=False,power_enabled=False,communication_enabled=False,terrain_options=None,power_options=None,communication_options=None,horizon_mode='geometric_approximation')
        result=post('/api/v1/scenarios/analyze',r)
        assert len(result['observations'])==25 and result['horizon'] is None and result['power'] is None and result['communication'] is None
        apollo.append({'mission':pin['name'],'epoch':epoch,'native_latitude':pin['latitude'],'native_longitude':pin['longitude'],
            'context_latitude':pin['context_latitude'],'context_longitude':pin['context_longitude'],'samples':len(result['observations']),
            'sun_elevation_deg':result['observations'][0]['sun_elevation_deg']['value'],'earth_elevation_deg':result['observations'][0]['earth_elevation_deg']['value'],
            'surface_height_assumption_m':0,'terrain':'unavailable; geometry-only request'})
    report={'executed_utc':datetime.now(timezone.utc).isoformat(),'scope':'Executed current local API data-flow regression, not new external science validation.',
        'site01_request':request,'dates':dates,'apollo':apollo,'conclusion':'More relative solar energy does not establish absolute feasibility; both Site01 dates fail the configured optimistic and conservative battery models.'}
    output=ROOT/'docs/validation/step-12-api-check.json';output.write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'dates':dates,'apollo':apollo},indent=2),flush=True)


if __name__=='__main__':main()
