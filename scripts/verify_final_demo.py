"""Check captured browser SVG points against its downloaded scientific result."""
import argparse
import json
from datetime import datetime
from math import isclose
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('browser_export', type=Path)
    args = parser.parse_args()
    export = json.loads(args.browser_export.read_text(encoding='utf8'))
    result = export['result']
    capture = json.loads((ROOT/'docs/validation/final-demo-graph-points.json').read_text())
    assert result['provider_mode'] == 'scientific' and len(result['observations']) == 25
    reference = json.loads((ROOT/'docs/validation/sun-earth-audit.json').read_text())['locations'][0]['response']
    for field in ('observations', 'horizon', 'terrain_visibility', 'power', 'communication'):
        assert result[field] == reference[field], field
    assert export['assessment']['classification'] == 'does_not_meet_requirements'
    count = 0
    for graph in capture['graphs']:
        for point in graph['points']:
            series, utc = point['series'], point['utc']
            if series == 'terrain_horizon_deg':
                expected = result['horizon']['elevation_deg'][result['horizon']['azimuth_deg'].index(float(point['azimuth']))]
                x = 55+float(point['azimuth'])/360*800
                y = 25+(float(graph['axisMax'])-expected)/(float(graph['axisMax'])-float(graph['axisMin']))*200
            elif '_native_elevation' in series:
                body = series.split('_')[0]
                expected = next(r for r in result['terrain_visibility']['observations'] if r['time_utc']==utc)[body]['elevation_deg']
                x = 55+float(point['azimuth'])/360*800
                y = 25+(float(graph['axisMax'])-expected)/(float(graph['axisMax'])-float(graph['axisMin']))*200
            else:
                fraction = (datetime.fromisoformat(utc)-datetime.fromisoformat(result['request']['start_utc'])).total_seconds()/86400
                if '_terrain_' in series:
                    body, field = series.split('_terrain_')
                    expected = next(r for r in result['terrain_visibility']['observations'] if r['time_utc']==utc)[body][field]
                    x = 55+fraction*800
                    y = 25+(float(graph['axisMax'])-expected)/(float(graph['axisMax'])-float(graph['axisMin']))*170
                elif '.' in series:
                    case, field = series.split('.')
                    samples = next(c['samples'] for c in result['power']['cases'] if c['assumption']==case)
                    expected = next(r[field] for r in samples if r['time_utc']==utc)
                    battery = graph['viewBox']=='0 0 720 180'
                    x = 55+fraction*(640 if battery else 800)
                    y = (140 if battery else 160)-expected/float(graph['axisMax'])*(115 if battery else 130)
                else:
                    expected = next(r[series]['value'] for r in result['observations'] if r['time_utc']==utc)
                    x = 54+fraction*(float(graph['plotWidth'])-86)
                    y = 16+(float(graph['axisMax'])-expected)/(float(graph['axisMax'])-float(graph['axisMin']))*224
            assert isclose(point['value'],expected,abs_tol=1e-12)
            assert isclose(point['x'],x,abs_tol=1e-8) and isclose(point['y'],y,abs_tol=1e-8), series
            count += 1
        for path in graph['paths']:
            assert path['d'] and path['stroke']!='none' and path['fill']=='none'
    readouts = json.loads((ROOT/'docs/validation/final-demo-numerical-display.json').read_text())
    for readout in readouts:
        value = result
        for key in readout['field'].split('.'):
            value = next(row for row in value if row.get('time_utc')==key or row.get('assumption')==key) if isinstance(value,list) else value[key]
        assert isclose(float(readout['value']),value,abs_tol=1e-10), readout['field']
    output = {'matched_browser_numerical_fields':len(readouts), 'samples':25, 'matched_browser_points':count, 'graphs':len(capture['graphs']),
              'all_products_match_preserved_site01':True, 'assessment':export['assessment']['classification'],
              'request':result['request']}
    (ROOT/'docs/validation/final-demo-graph-check.json').write_text(json.dumps(output,indent=2)+'\n')
    print({k:v for k,v in output.items() if k!='request'})


if __name__ == '__main__':
    main()
