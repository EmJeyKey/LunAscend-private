"""Compare browser-rendered SVG coordinates with its actual downloaded API result."""
import argparse
import hashlib
import json
import re
from math import isclose
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]

def main():
    parser=argparse.ArgumentParser();parser.add_argument('browser_export',type=Path);args=parser.parse_args()
    raw=args.browser_export.read_bytes();r=json.loads(raw)['result']
    browser=json.loads((ROOT/'docs/validation/graph-browser-points.json').read_text())
    assert r['provider_mode']=='scientific' and len(r['observations'])==25
    assert r['request']['start_utc']=='2026-11-14T00:00:00Z'
    assert r['request']['settings']['terrain_enabled'] and r['request']['settings']['power_enabled']
    assert r['power']['configuration']['panel_area_m2']==2 and r['power']['configuration']['baseline_load_w']==50
    reference=json.loads((ROOT/'docs/validation/sun-earth-audit.json').read_text())['locations'][0]['response']
    for key in ('observations','horizon','terrain_visibility','power','communication'):
        assert r[key]==reference[key],f'Browser API product differs from saved Site01: {key}'
    checked=0
    for g in browser['graphs']:
        if not g['points']:continue
        assert g['width']>0 and g['height']>0
        for p in g['points']:
            field=p['series']
            if field=='terrain_horizon_deg':
                i=r['horizon']['azimuth_deg'].index(float(p['azimuth']));expected=r['horizon']['elevation_deg'][i]
                x=55+float(p['azimuth'])/360*800
                y=25+(float(g['axisMax'])-expected)/(float(g['axisMax'])-float(g['axisMin']))*200
            elif '_native_elevation' in field:
                row=next(s for s in r['terrain_visibility']['observations'] if s['time_utc']==p['utc']);body=field.split('_')[0]
                expected=row[body]['elevation_deg'];assert float(p['azimuth'])==row[body]['azimuth_deg']
                x=55+float(p['azimuth'])/360*800;y=25+(float(g['axisMax'])-expected)/(float(g['axisMax'])-float(g['axisMin']))*200
            else:
                from datetime import datetime
                hours=(datetime.fromisoformat(p['utc'])-datetime.fromisoformat(r['request']['start_utc'])).total_seconds()/3600
                if '.' in field:
                    case,quantity=field.split('.');samples=next(c['samples'] for c in r['power']['cases'] if c['assumption']==case)
                    expected=next(s[quantity] for s in samples if s['time_utc']==p['utc'])
                    battery=g['viewBox']=='0 0 720 180';x=55+hours/24*(640 if battery else 800)
                    y=(140 if battery else 160)-expected/float(g['axisMax'])*(115 if battery else 130)
                else:
                    expected=next(s[field]['value'] for s in r['observations'] if s['time_utc']==p['utc'])
                    x=54+hours/24*(float(g['plotWidth'])-86)
                    y=16+(float(g['axisMax'])-expected)/(float(g['axisMax'])-float(g['axisMin']))*224
            assert isclose(p['value'],expected,rel_tol=1e-14,abs_tol=1e-12),(field,p['utc'],p['value'],expected)
            assert isclose(p['x'],x,abs_tol=1e-8) and isclose(p['y'],y,abs_tol=1e-8),(field,p)
            checked+=1
        series=list(dict.fromkeys(p['series'] for p in g['points']))
        for index,path in enumerate(g['paths']):
            coordinates=re.findall(r'[ML]([-+0-9.eE]+),([-+0-9.eE]+)',path['d'])
            points=[p for p in g['points'] if p['series']==series[index]]
            assert len(coordinates)==len(points)
            for (x,y),p in zip(coordinates,points):
                assert isclose(float(x),p['x'],abs_tol=.0006) and isclose(float(y),p['y'],abs_tol=.0006)
            assert path['d'] and 'L' in path['d'] and path['stroke']!='none' and path['fill']=='none'
    result={'browser_export_sha256':hashlib.sha256(raw).hexdigest(),'provider':'scientific','samples':25,'matched_points_and_coordinates':checked,'curves':sum(len(g['paths']) for g in browser['graphs']),'products_equal_to_saved_site01':True,'request':r['request']}
    (ROOT/'docs/validation/graph-browser-check.json').write_text(json.dumps(result,indent=2)+'\n')
    print(json.dumps({key:result[key] for key in ('samples','matched_points_and_coordinates','curves','products_equal_to_saved_site01')}))

if __name__=='__main__':main()
