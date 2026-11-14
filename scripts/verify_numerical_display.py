"""Compare captured DOM readouts/plots with fresh local API results; no engine edits."""
import argparse
import copy
import json
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]


def read(path: Path) -> Any:
    return json.loads(path.read_text(encoding='utf-8'))


def sample(rows: list[dict[str, Any]], time: str) -> dict[str, Any]:
    return next(row for row in rows if row['time_utc'] == time)


def resolve(result: dict[str, Any], path: str) -> Any:
    if path.startswith('observations.'):
        time, key, _ = path[len('observations.'):].rsplit('.', 2)
        return sample(result['observations'], time)[key]['value']
    if path.startswith('terrain_visibility.observations.'):
        time, body, key = path[len('terrain_visibility.observations.'):].rsplit('.', 2)
        return sample(result['terrain_visibility']['observations'], time)[body][key]
    if path.startswith('communication.access_samples.'):
        time, key = path[len('communication.access_samples.'):].rsplit('.', 1)
        return sample(result['communication']['access_samples'], time)[key]
    if path.startswith('power.cases.'):
        assumption, kind, tail = path[len('power.cases.'):].split('.', 2)
        case = next(c for c in result['power']['cases'] if c['assumption'] == assumption)
        if kind == 'totals':
            return case['totals'][tail]
        time, key = tail.rsplit('.', 1)
        return sample(case['samples'], time)[key]
    value = result
    for key in path.split('.'):
        value = value[key]
    return value


def label(time: str) -> str:
    return time.replace('T', ' ').replace('Z', ' UTC')


def check_trace(trace: dict[str, Any], result: dict[str, Any], index: int) -> dict[str, int | str]:
    assert trace['time'] == label(result['observations'][index]['time_utc'])
    assert len(trace['readouts']) == 39
    for item in trace['readouts']:
        value = resolve(result, item['field'])
        assert value is not None and item['raw'] != ''
        assert float(item['raw']) == value, (item, value)
        number = re.match(r'(-?\d+\.(\d+))', item['text'])
        assert number, item
        assert abs(float(number[1]) - value) <= .5 * 10 ** (-len(number[2])) + 1e-10, (item, value)
        path = item['field']
        unit = ('° N' if path.endswith('latitude_deg') else '° E' if path.endswith('longitude_deg')
                else '°' if '_deg' in path else 'Wh' if path.endswith('_wh') else '%' if path.endswith('_pct')
                else 'W' if path.endswith('_w') else 'm' if path.endswith('_m') else 's')
        assert item['text'].endswith(unit), (item, unit)
    assert len(trace['graphs']) == 2
    points = 0
    for graph, key, unit in zip(trace['graphs'], ['solar_generation_w', 'battery_energy_wh'], ['W', 'Wh']):
        expected = [(case['assumption'], s['time_utc'], s[key]) for case in result['power']['cases']
                    for s in case['samples'] if s[key] is not None]
        assert len(graph['points']) == len(expected) == 50
        for title, (assumption, time, value) in zip(graph['points'], expected):
            parts = title.split(' · ')
            assert parts[0] == assumption and parts[1] == label(time), title
            assert parts[2].endswith(' ' + unit) and float(parts[2].split()[0]) == value
            points += 1
    states = dict(modeled_obstruction='blocked', conditional_clearance='potential', conditional_access='potential',
                  below_clearance_requirement='below', indeterminate='unknown', unavailable='unknown')
    expected = [states[row['sun']['classification']] for row in result['terrain_visibility']['observations']]
    expected += [states[row['classification']] for row in result['communication']['access_samples']]
    assert len(trace['marks']) == len(expected) == 50
    assert all(actual == 'sample-mark condition-' + state for actual, state in zip(trace['marks'], expected))
    return dict(selected_utc=result['observations'][index]['time_utc'], matched_numeric_fields=39,
                matched_graph_points=points, matched_timeline_samples=50)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--browser-trace-dir', type=Path, required=True)
    args = parser.parse_args()
    request = read(ROOT / 'backend/examples/engineering-request.json')
    request['site']['site_id'], request['site']['name'] = 'custom', 'LOLA Site01 example'
    request['settings']['power_options']['orientation_mode'] = 'fixed_horizontal'
    results = {}
    for day in (14, 15):
        payload = copy.deepcopy(request)
        payload['start_utc'], payload['end_utc'] = f'2026-11-{day}T00:00:00Z', f'2026-11-{day+1}T00:00:00Z'
        payload['settings']['terrain_options']['coordinate_epoch_utc'] = payload['start_utc']
        with urlopen(Request('http://127.0.0.1:8000/api/v1/scenarios/analyze', data=json.dumps(payload).encode(),
                             headers={'Content-Type': 'application/json'}), timeout=90) as response:
            results[day] = json.load(response)
        assert len(results[day]['observations']) == 25
    checks = [dict(trace=name, **check_trace(read(args.browser_trace_dir / name), results[day], index))
              for name, day, index in [('numerical-display-day1.json', 14, 0), ('numerical-display-hour1.json', 14, 1),
                                        ('numerical-display-day2.json', 15, 0)]]
    dates = []
    for result in results.values():
        dates.append(dict(request=result['request'], status=result['status'], samples=len(result['observations']),
                          first_geometry=result['observations'][0], first_terrain=result['terrain_visibility']['observations'][0],
                          surface_elevation_m=result['terrain_visibility']['surface_elevation_m'], power_outcome=result['power']['outcome'],
                          cases=[dict(assumption=c['assumption'], first_sample=c['samples'][0], totals=c['totals']) for c in result['power']['cases']],
                          dte=dict(access_s=result['communication']['earth_visibility_duration_s']['value'],
                                   longest_interruption_s=result['communication']['longest_interruption_s']['value'],
                                   unknown_duration_s=result['communication']['unknown_duration_s'])))
    report = dict(executed_utc=datetime.now(timezone.utc).isoformat(),
                  scope='Fresh local API compared with captured browser DOM values, rounded text/units, graph points and timeline classes. Data-flow regression, not new external scientific validation.',
                  browser_checks=checks, dates=dates)
    outside = args.browser_trace_dir / 'numerical-outside-coverage.json'
    if outside.exists():
        failure = read(outside)
        assert failure['readoutCount'] == 0 and failure['graphCount'] == 0
        assert failure['apiError'].startswith('OUTSIDE_COVERAGE:')
        report['unsupported_terrain_browser'] = failure
    (ROOT / 'docs/validation/numerical-display-check.json').write_text(json.dumps(report, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
    print(json.dumps(dict(checks=checks, dates=[dict(utc=x['request']['start_utc'], sun_elevation_deg=x['first_geometry']['sun_elevation_deg']['value'],
        optimistic_W=x['cases'][1]['first_sample']['solar_generation_w'], optimistic_solar_Wh=x['cases'][1]['totals']['solar_generated_wh'],
        optimistic_unmet_Wh=x['cases'][1]['totals']['unmet_load_wh']) for x in dates])))


if __name__ == '__main__':
    main()
