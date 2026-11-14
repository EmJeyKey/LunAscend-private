"""Real source evidence and isolated imagery transport, not new science validation."""
from hashlib import sha256
import importlib.util
import json
from pathlib import Path
import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError
from lunascend.main import create_app
from lunascend.contracts.imagery import ImageAnchorRequest
from lunascend.imagery import tiles

ROOT = Path(__file__).resolve().parents[2]
JPEG = (ROOT / 'data/fixtures/imagery/global-l0-west.jpg').read_bytes()


def test_catalog_reproduces_saved_official_evidence():
    spec = importlib.util.spec_from_file_location('imagery_catalog_builder', ROOT / 'scripts/build_imagery_catalog.py')
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    assert module.build() == tiles.CATALOG
    assert tiles.LAYERS['wac-global']['levels'][-1]['resolution'] == 180 / (256 * 256)
    assert tiles.LAYERS['nac-south']['levels'][-1]['resolution'] == pytest.approx(4.1806411743164)
    assert tiles.LAYERS['wac-south']['levels'][-1]['resolution'] == pytest.approx(267.56103515625)
    assert 'unverified' in tiles.LAYERS['nac-south']['registration'].lower() or 'No verified' in tiles.LAYERS['nac-south']['registration']


@pytest.mark.parametrize('args', [('unknown', 0, 0, 0), ('wac-global', 9, 0, 0), ('wac-global', 0, 1, 0), ('wac-global', 0, 0, -1), ('nac-south', 11, 0, 0)])
def test_unpublished_addresses_and_coverage_rejected(args):
    with pytest.raises(ValueError):
        tiles.tile_identity(*args)


def test_site01_tile_address_and_pinned_real_photographs():
    _, url = tiles.tile_identity('nac-south', 11, 1035, 1013)
    assert url.endswith('/11/1035/1013.png')
    for seed in tiles.CATALOG['seed_tiles']:
        data = (ROOT / 'data/fixtures/imagery' / seed['file']).read_bytes()
        assert sha256(data).hexdigest() == seed['sha256']
        layer, level, row, column = seed['key'].split('/')
        payload, media, cached = tiles.get_tile(layer, int(level), int(row), int(column), fetcher=lambda _: pytest.fail('Seed must work offline'))
        assert payload == data and cached and media in ('image/jpeg', 'image/png')


def test_download_once_then_disconnected_cache(tmp_path):
    calls = []
    def fetch(url):
        calls.append(url)
        return JPEG
    args = ('wac-global', 1, 0, 0)
    assert tiles.get_tile(*args, cache_dir=tmp_path, fetcher=fetch)[2] is False
    assert tiles.get_tile(*args, cache_dir=tmp_path, fetcher=lambda _: pytest.fail('Cache should satisfy request'))[2] is True
    assert len(calls) == 1 and len(list(tmp_path.glob('*.jpg'))) == 1


@pytest.mark.parametrize('payload', [b'<html>Unavailable</html>', b'GIF89a' + b'x' * 100, b'x' * 2_000_001])
def test_invalid_formats_and_oversize_do_not_enter_cache(tmp_path, payload):
    with pytest.raises(tiles.ImageryUnavailable):
        tiles.get_tile('wac-global', 1, 0, 0, cache_dir=tmp_path, fetcher=lambda _: payload)
    assert not list(tmp_path.iterdir())


def test_missing_network_remains_explicit(tmp_path):
    def fail(_):
        raise OSError('offline')
    with pytest.raises(tiles.ImageryUnavailable, match='DEM/science remain independent'):
        tiles.get_tile('wac-global', 1, 0, 0, cache_dir=tmp_path, fetcher=fail)


def test_cache_byte_bound_evicts_oldest(tmp_path, monkeypatch):
    monkeypatch.setattr(tiles, 'MAX_CACHE_BYTES', len(JPEG) * 2)
    for column in range(4):
        tiles.get_tile('wac-global', 1, 0, column, cache_dir=tmp_path, fetcher=lambda _: JPEG)
    assert len(list(tmp_path.glob('*.jpg'))) == 2
    assert not list(tmp_path.glob('*.part'))


def test_api_serves_offline_source_pixels_and_rejects_unknown():
    with TestClient(create_app()) as client:
        response = client.get('/api/v1/imagery/tiles/wac-global/0/0/0')
        assert response.status_code == 200 and response.content == JPEG
        assert response.headers['content-type'] == 'image/jpeg'
        assert client.get('/api/v1/imagery/tiles/invalid/0/0/0').status_code == 404
        assert client.get('/api/v1/imagery/tiles/nac-south/12/0/0').status_code == 422
        assert client.get('/api/v1/imagery/catalog').json() == tiles.CATALOG


@pytest.mark.parametrize('change', [{'latitude_deg': float('nan')}, {'latitude_deg': -90}, {'longitude_deg': 181}, {'coordinate_epoch_utc': '2026-11-14T00:00:00'}, {'coordinate_epoch_utc': '1971-01-01T00:00:00Z'}, {'extra': 1}])
def test_coordinate_anchor_rejects_ambiguous_or_invalid_requests(change):
    value = dict(latitude_deg=-89.46315760953222, longitude_deg=-137.50097847854008, coordinate_epoch_utc='2026-11-14T00:00:00Z')
    with pytest.raises(ValidationError):
        ImageAnchorRequest(**{**value, **change})


def test_bundled_source_bytes_are_small_and_no_render_registration_claim():
    assert sum(s['bytes'] for s in tiles.CATALOG['seed_tiles']) < 250_000
    assert all('not specified' in l['frame'] for l in tiles.CATALOG['layers'])
    assert 'malformed' in tiles.CATALOG['metadata_qualification']


def test_saved_polar_cartography_matches_optional_pyproj():
    pyproj = pytest.importorskip('pyproj')
    checks = json.loads((ROOT / 'data/fixtures/imagery/projection-checks.json').read_text())
    projection = pyproj.Proj(checks['projection'])
    for row in checks['rows']:
        assert projection(row['longitude_deg'], row['latitude_deg']) == pytest.approx((row['x_m'], row['y_m']), abs=1e-7)


def test_api_image_failure_is_explicit_and_queue_is_bounded(monkeypatch):
    from lunascend.api import imagery
    def unavailable(*args):
        raise tiles.ImageryUnavailable('Official service offline; no substitute')
    monkeypatch.setattr(imagery, 'get_tile', unavailable)
    with TestClient(create_app()) as client:
        response = client.get('/api/v1/imagery/tiles/wac-global/1/0/0')
        assert response.status_code == 503 and 'no substitute' in response.json()['detail']
        monkeypatch.setattr(imagery, '_waiting', 12)
        assert client.get('/api/v1/imagery/tiles/wac-global/1/0/0').status_code == 503
