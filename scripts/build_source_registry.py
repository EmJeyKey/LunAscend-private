"""Build/check an offline UI catalog from source records, pinned manifests and saved evidence.

No downloads, scientific calculations, dependency installs or changes to original evidence.
"""
import argparse
from copy import deepcopy
from hashlib import sha256
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = Path('frontend/src/data/sourceCatalog.json')


def load(root: Path, path: str) -> dict:
    return json.loads((root / path).read_text(encoding='utf-8'))


def saved_validation(root: Path) -> dict:
    report = load(root, 'docs/validation/step-3-results.json')
    for key, path in {
        'engine_sha256': 'backend/src/lunascend/ephemeris/engine.py',
        'validation_script_sha256': 'backend/src/lunascend/ephemeris/validation.py',
        'plan_sha256': 'docs/validation/STEP_3_PLAN.md',
    }.items():
        if sha256((root / path).read_bytes()).hexdigest() != report[key]:
            raise ValueError(f'Saved evidence identity mismatch: {path}')
    for reference in report['references']:
        request = load(root, reference['request_file'])
        digest = sha256((root / reference['response_file']).read_bytes()).hexdigest()
        if digest != reference['response_sha256'] or digest != request['response_sha256']:
            raise ValueError('Saved Horizons response checksum mismatch')
    kernels = load(root, 'data/manifests/spice-kernels.json')
    if {k['filename']: k['sha256'] for k in kernels['kernels']} != report['kernel_hashes']:
        raise ValueError('Saved comparison kernel identity mismatch')
    # Only aggregate the already executed residual rows; never rerun/relabel the science.
    groups = {}
    for kind in ('geometric', 'apparent'):
        rows = [r for r in report['evaluations'] if r['comparison'] == kind]
        summary = {
            'comparisons': len(rows),
            'max_absolute_azimuth_difference_deg': max(r['azimuth_difference_deg'] for r in rows),
            'max_absolute_elevation_difference_deg': max(r['elevation_difference_deg'] for r in rows),
            'all_passed': all(r['passed'] and r['azimuth_difference_deg'] <= r['azimuth_tolerance_deg']
                              and r['elevation_difference_deg'] <= r['elevation_tolerance_deg'] for r in rows),
        }
        if summary != report['summary'][kind]:
            raise ValueError('Saved comparison summary does not match its rows')
        groups[kind] = summary
    if report['overall_passed'] is not True or not all(s['all_passed'] for s in groups.values()):
        raise ValueError('Saved comparison outcome mismatch: passing evidence is required for this catalog')
    cases = [json.loads(c) for c in report['reference_compared_cases']]
    return {
        'report_id': report['report_id'], 'executed_at_utc': report['executed_at_utc'],
        'total_comparisons': len(report['evaluations']), 'case_count': len(cases),
        'reference_response_count': len(report['references']), 'summary': groups,
        'sites': [dict(zip(('latitude_deg', 'longitude_deg', 'surface_elevation_m', 'observer_height_m'), p))
                  for p in sorted(set(tuple(c[:4]) for c in cases))],
        'epochs_utc': sorted(set(c[4] for c in cases)),
        'frame': kernels['frame_id'], 'reference_radius_m': kernels['reference_radius_m'],
        'model_headers': report['references'][0]['model_header'],
        'software': {k: report[k] for k in ('engine_version', 'spiceypy_version', 'toolkit', 'numpy_version')},
        'kernel_fingerprint': report['kernel_fingerprint'],
        'identity_checks': 'Saved engine, comparison script, plan, kernel manifest and raw response hashes match. This is a provenance check, not a new scientific comparison.',
        'evaluations': report['evaluations'],
    }


def build_catalog(root: Path = ROOT) -> dict:
    registry = deepcopy(load(root, 'data/manifests/source-registry.json'))
    for source in registry['sources']:
        if source['id'] == 'moon-trek':
            m = load(root, 'data/manifests/lunar-imagery.json')
            source.update(product_id='; '.join(l['product'] for l in m['layers']), version=m['version'],
                original_resolution='Delivered finest sampling: global WAC ~83.3 m/px meridional; south WAC 267.56 projected m/px; polar NAC 4.18 projected m/px. Nominal originals differ.')
        elif source['id'] == 'spice':
            m = load(root, source['manifest'])
            source.update(product_id=m['kernel_set_id'], version=m['kernel_set_id'],
                coordinate_system=f"{m['frame_id']}; planetocentric, east-positive; {m['reference_radius_m']:g} m sphere. Native terrain uses a separate exact DE421 bridge.",
                original_resolution='Not a raster; epochs sampled by the scientific request.',
                products=[{k: row[k] for k in ('filename', 'url', 'sha256')} for row in m['kernels']],
                bridge_products=load(root, source['bridge_manifest'])['kernels'])
        elif source['id'] == 'lola':
            m = load(root, source['manifest'])
            source.update(product_id=m['dataset_id'], version=m['product_version'],
                coordinate_system=f"{m['reference_frame']}; {m['latitude_type']}, {m['longitude_convention']}. {m['vertical_reference']}.",
                original_resolution=f"{m['pixel_resolution_m']:g} m source pixel spacing; not effective resolution or accuracy.",
                product={k: m[k] for k in ('name', 'source_url', 'sha256', 'citation', 'projection',
                    'vertical_reference', 'reference_radius_m', 'projected_bounds_m', 'pixel_registration', 'uncertainty')})
    registry['validation'] = saved_validation(root)
    return registry


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true', help='Fail if the committed offline catalog is stale.')
    args = parser.parse_args()
    content = json.dumps(build_catalog(), indent=2, ensure_ascii=False, allow_nan=False) + '\n'
    output = ROOT / OUTPUT
    if args.check:
        if output.read_text(encoding='utf-8') != content:
            raise SystemExit('Offline catalog is stale. Run scripts/build_source_registry.py.')
        print('Offline source catalog and saved validation identities match.')
    else:
        output.write_text(content, encoding='utf-8', newline='\n')
        print(f'Wrote {OUTPUT.as_posix()}')


if __name__ == '__main__':
    main()
