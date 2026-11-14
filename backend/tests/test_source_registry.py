"""Offline resource presentation must agree with original scientific evidence."""
import json
from pathlib import Path
import runpy
import shutil
from urllib.parse import urlparse

import pytest

ROOT = Path(__file__).resolve().parents[2]
BUILD = runpy.run_path(str(ROOT / 'scripts/build_source_registry.py'))


def test_catalog_matches_manifests_and_saved_validation_without_network():
    catalog = BUILD['build_catalog'](ROOT)
    assert catalog == json.loads((ROOT / 'frontend/src/data/sourceCatalog.json').read_text(encoding='utf-8'))
    lola = next(s for s in catalog['sources'] if s['id'] == 'lola')
    manifest = json.loads((ROOT / lola['manifest']).read_text(encoding='utf-8'))
    assert lola['product']['sha256'] == manifest['sha256']
    assert lola['product']['projection'] == manifest['projection']
    assert lola['version'] == manifest['product_version']
    assert catalog['validation']['total_comparisons'] == 36
    assert catalog['validation']['case_count'] == 9
    assert len(catalog['validation']['sites']) == len(catalog['validation']['epochs_utc']) == 3
    original = json.loads((ROOT / 'docs/validation/step-3-results.json').read_text(encoding='utf-8'))
    assert catalog['validation']['evaluations'] == original['evaluations']
    assert catalog['validation']['summary'] == original['summary']


def test_registry_roles_attribution_urls_and_access_claims_are_explicit():
    catalog = BUILD['build_catalog'](ROOT)
    sources = {s['id']: s for s in catalog['sources']}
    assert {s['id'] for s in sources.values() if s['challenge_resource']} == {'quickmap', 'moon-trek', 'horizons', 'csa'}
    assert sources['spice']['roles'] == ['calculation']
    assert sources['lola']['roles'] == ['calculation', 'visualization']
    assert sources['horizons']['roles'] == ['validation']
    for name in ('quickmap', 'csa'):
        assert sources[name]['roles'] == ['reference'] and sources[name]['product_id'] is None
    assert sources['moon-trek']['roles'] == ['visualization', 'reference']
    assert 'LRO_WAC_Mosaic_Global_303ppd_v02' in sources['moon-trek']['product_id']
    expected = {'quickmap': 'quickmap.lroc.asu.edu', 'moon-trek': 'trek.nasa.gov', 'horizons': 'ssd.jpl.nasa.gov', 'csa': 'www.asc-csa.gc.ca'}
    for name, host in expected.items():
        assert urlparse(sources[name]['official_url']).hostname == host
    for source in sources.values():
        for field in ('organization', 'purpose', 'use_in_lunascend', 'coordinate_system', 'usage_conditions', 'attribution', 'offline', 'limitations'):
            assert source[field]
        assert urlparse(source['official_url']).scheme == urlparse(source['terms_url']).scheme == 'https'
    assert 'no numerical input' in sources['csa']['use_in_lunascend']


@pytest.mark.parametrize('tampered', ['response', 'engine', 'summary', 'outcome'])
def test_modified_evidence_cannot_silently_be_presented_as_verified(tmp_path, tampered):
    report_path = 'docs/validation/step-3-results.json'
    report = json.loads((ROOT / report_path).read_text(encoding='utf-8'))
    paths = [report_path, 'docs/validation/STEP_3_PLAN.md', 'backend/src/lunascend/ephemeris/engine.py',
             'backend/src/lunascend/ephemeris/validation.py', 'data/manifests/spice-kernels.json']
    paths += [row[k] for row in report['references'] for k in ('request_file', 'response_file')]
    for name in paths:
        target = tmp_path / name
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(ROOT / name, target)
    if tampered == 'response':
        (tmp_path / report['references'][0]['response_file']).write_bytes(b'Not the saved reference')
    elif tampered == 'engine':
        (tmp_path / 'backend/src/lunascend/ephemeris/engine.py').write_bytes(b'Changed engine')
    else:
        if tampered == 'summary':
            report['summary']['geometric']['comparisons'] = 999
        else:
            report['overall_passed'] = False
            report['evaluations'][0]['passed'] = False
            report['summary']['geometric']['all_passed'] = False
        (tmp_path / report_path).write_text(json.dumps(report), encoding='utf-8')
    with pytest.raises(ValueError, match='mismatch|does not match'):
        BUILD['saved_validation'](tmp_path)
