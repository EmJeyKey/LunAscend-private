"""Catalog identity and original-data integration, not external terrain accuracy."""
import json
from pathlib import Path
import pytest
np=pytest.importorskip('numpy')
pytest.importorskip('rasterio')
from lunascend.contracts.terrain import TerrainRequest
from lunascend.terrain.dem import DatasetConfiguration,LunarDEM
from lunascend.terrain.engine import analyze_terrain

ROOT=Path(__file__).resolve().parents[2]
REGISTRY=json.loads((ROOT/'data/manifests/polar-sites/registry.json').read_text(encoding='utf-8'))

def test_registry_keeps_native_points_and_distinct_datasets():
    sites=REGISTRY['sites']
    assert len(sites)==13 and len({s['id'] for s in sites})==13
    assert len({s['dataset_id'] for s in sites})==13
    assert all(s['reference_frame']=='MOON_ME_DE421' and 'not a landing-site' in s['point_kind'] for s in sites)
    assert all(s['dataset_id']!='lola-site01-5m-v2020' for s in sites)

@pytest.mark.parametrize('site',REGISTRY['sites'],ids=lambda s:s['id'])
def test_original_dem_pixel_coverage_and_finite_horizon(site):
    config=DatasetConfiguration.selected(site['dataset_id'])
    if not config.path.exists():pytest.skip('Optional polar window not restored')
    with LunarDEM(config) as dem:
        assert dem.elevation(site['longitude'],site['latitude'])==pytest.approx(site['elevation_m'],abs=1e-5)
    result=analyze_terrain(TerrainRequest(dataset_id=site['dataset_id'],site_id=site['id'],latitude_deg=site['latitude'],longitude_deg=site['longitude'],reference_frame='MOON_ME_DE421',observer_height_m=2,max_search_radius_m=100,radial_step_m=5,azimuth_samples=36))
    assert result.horizon.terrain_source==site['dataset_id']
    assert result.horizon.global_horizon_complete is False
    assert np.isfinite(result.surface_elevation_m)
    assert all(p.provider_mode=='scientific' for p in result.provenance)

def test_unknown_dataset_never_substitutes_site01():
    from lunascend.terrain.errors import TerrainError
    with pytest.raises(TerrainError):DatasetConfiguration.selected('apollo-11')

def test_unified_registry_and_missing_frame_response(monkeypatch):
    from fastapi.testclient import TestClient
    from lunascend.main import create_app
    import lunascend.api.exploration as module
    client=TestClient(create_app())
    catalog=client.get('/api/v1/exploration/site-registry').json()
    assert len(catalog['catalogs']['apollo']['sites'])==6
    assert len(catalog['catalogs']['polar_study']['sites'])==13
    assert catalog['existing_observer_points'][0]['parent_region']=='pgda-site01'
    monkeypatch.setattr(module,'scientific_sites_context',lambda *args:(_ for _ in ()).throw(ImportError('optional science absent')))
    response=client.post('/api/v1/exploration/polar-sites',json={'latitude_deg':0,'longitude_deg':0,'coordinate_epoch_utc':'2026-11-15T00:00:00Z'})
    assert response.status_code==503 and 'no approximate' in response.json()['detail'].lower()

def test_polar_exact_inverse_bridge(monkeypatch):
    from lunascend.terrain import frames
    from lunascend.api.exploration import scientific_sites_context
    monkeypatch.setattr(frames,'frame_rotation',lambda r:(np.array([[0.,-1.,0.],[1.,0.,0.],[0.,0.,1.]]),{'method':'synthetic fixture'}))
    scientific_sites_context.cache_clear()
    try:
        result=scientific_sites_context('2026-11-15T00:00:00Z')
        for s in result['sites']:
            assert s['context_latitude']==pytest.approx(s['latitude'])
            assert (s['context_longitude']-(s['longitude']-90)+180)%360-180==pytest.approx(0,abs=1e-9)
    finally:scientific_sites_context.cache_clear()
