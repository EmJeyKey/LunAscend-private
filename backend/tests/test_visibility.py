"""Analytical synthetic horizons and executed real-data composition, never reference edits."""
from datetime import datetime, timedelta, timezone
import json
from pathlib import Path
import asyncio
import pytest
from lunascend.contracts import ScenarioRequest
from lunascend.contracts.models import HorizonProfile, TerrainVisibilityObservation
from lunascend.visibility.classify import classify, windows


def horizon(elevations=(2.0, 2.0, 2.0, 2.0), coverage=None):
    return HorizonProfile(site_id="synthetic", reference_frame="SYNTHETIC_TEST_FRAME", status="partial",
        azimuth_deg=(0.0, 90.0, 180.0, 270.0), elevation_deg=elevations,
        ray_coverage=coverage or ("sampled_radius",)*4, global_horizon_complete=False)


@pytest.mark.parametrize("elevation,label,clearance", [(3.0,"conditional_clearance",1.0),(1.0,"modeled_obstruction",-1.0),(2.0,"indeterminate",0.0)])
def test_analytical_obstacle(elevation,label,clearance):
    result=classify(horizon(),45.0,elevation)
    assert result.classification==label and result.clearance_deg==clearance


def test_circular_seam():
    h=horizon((2.0,0.0,0.0,0.0))
    assert classify(h,315.0,5.0).horizon_elevation_deg==1.0
    assert classify(h,360.0,5.0)==classify(h,0.0,5.0)
    assert classify(h,-45.0,5.0)==classify(h,315.0,5.0)


def test_unknown_direction_mask():
    h=horizon((None,2.0,2.0,2.0))
    for az in (0.0,1.0,359.0):
        r=classify(h,az,10.0)
        assert r.classification=='indeterminate' and r.clearance_deg is None and r.horizon_elevation_deg is None


@pytest.mark.parametrize('az,el', [(None,2.0),(2.0,None),(None,None)])
def test_missing_geometry(az,el):
    r=classify(horizon(),az,el)
    assert r.classification=='unavailable' and r.clearance_deg is None


def test_partial_known_obstruction_but_not_clearance():
    h=horizon(coverage=('boundary','nodata','sampled_radius','sampled_radius'))
    assert classify(h,45.0,1.0).classification=='modeled_obstruction'
    assert classify(h,45.0,3.0).classification=='indeterminate'
    assert classify(h,180.0,3.0).classification=='conditional_clearance'


def rows(values):
    start=datetime(2026,11,14,tzinfo=timezone.utc)
    return tuple(TerrainVisibilityObservation(time_utc=start+timedelta(hours=i),
        sun=classify(horizon(),0.0,v), earth=classify(horizon(),0.0,v)) for i,v in enumerate(values))


def test_multiple_crossings_and_joint_intersections():
    series=rows((1.0,3.0,1.0,3.0))
    intervals,transitions=windows(series,('synthetic-test',))
    sun=[t for t in transitions if t.target=='sun']
    assert len(sun)==3
    assert [(t.estimate_utc-series[0].time_utc).total_seconds() for t in sun]==[1800,5400,9000]
    assert all(t.resolution_s==3600 for t in transitions)
    assert sum(w.duration_s for w in intervals if w.target=='joint')==5400
    assert all(w.status=='partial' for w in intervals)


def test_unknown_between_valid_samples_never_bridged():
    intervals,transitions=windows(rows((3.0,None,3.0)),('synthetic-test',))
    assert not transitions
    assert not [w for w in intervals if w.classification=='conditional_clearance']
    assert all(w.classification=='indeterminate' for w in intervals)


def test_period_boundaries_censored_and_exact_equality():
    intervals,transitions=windows(rows((2.0,3.0,3.0,2.0)),('synthetic-test',))
    assert not transitions  # Equality is unresolved, not a fabricated endpoint crossing.
    assert all(w.start_censored for w in intervals if w.start_utc==rows((2.0,))[0].time_utc)
    assert any(w.end_censored for w in intervals)
    assert sum(w.duration_s for w in intervals if w.target=='sun' and w.classification=='conditional_clearance')==3600


def test_no_horizon_and_single_sample():
    h=HorizonProfile(site_id='missing',reference_frame='unknown')
    assert classify(h,0.0,2.0).classification=='unavailable'
    assert windows(rows((3.0,)),())==((),())


def request():
    return ScenarioRequest.model_validate_json((Path(__file__).parents[1]/'examples/terrain-visibility-request.json').read_text(encoding='utf-8'))


@pytest.mark.parametrize('change,code', [({'surface_elevation_m':1944.0},'INVALID_REQUEST'),
    ({'coordinate_reference':{'body':'MOON','latitude_type':'planetocentric','longitude_convention':'east_positive','frame_id':'IAU_MOON','frame_realization':'DE440/ME421','reference_surface':'MOON_SPHERE_1737400_M','reference_radius_m':1737400.0}},'FRAME_MISMATCH')])
def test_observer_and_datum_rejection(change,code):
    from lunascend.visibility.engine import analyze_visibility
    from lunascend.ephemeris.kernels import GeometryError
    r=request().model_dump();r['site'].update(change)
    with pytest.raises(GeometryError) as e:analyze_visibility(ScenarioRequest.model_validate(r))
    assert e.value.error.code==code


def test_epoch_and_budget_rejection():
    from lunascend.visibility.engine import analyze_visibility
    from lunascend.ephemeris.kernels import GeometryError
    r=request().model_dump();r['settings']['terrain_options']['coordinate_epoch_utc']+=timedelta(hours=1)
    with pytest.raises(GeometryError,match='start epoch'):analyze_visibility(ScenarioRequest.model_validate(r))
    r=request().model_dump();r['sample_step_s']=1.0;r['end_utc']=r['start_utc']+timedelta(seconds=1500)
    with pytest.raises(GeometryError,match='1001'):analyze_visibility(ScenarioRequest.model_validate(r))


def test_missing_terrain_structured_and_geometric_mode_survives(monkeypatch,tmp_path):
    from lunascend.providers.scientific import ScientificAnalysisProvider
    monkeypatch.setenv('LUNASCEND_TERRAIN_DIR',str(tmp_path))
    result=asyncio.run(ScientificAnalysisProvider().analyze(request()))
    assert result.status=='unavailable' and result.errors[0].code=='MISSING_DATA'
    assert result.terrain_visibility is None and result.visibility_windows is None
    r=request().model_dump();r['settings'].update(terrain_enabled=False,horizon_mode='geometric_approximation',terrain_options=None)
    r['site']['surface_elevation_m']=0.0
    result=asyncio.run(ScientificAnalysisProvider().analyze(ScenarioRequest.model_validate(r)))
    assert result.observations and result.terrain_visibility is None


def test_real_nasa_observer_height_frames_and_profile_reuse(monkeypatch):
    import numpy as np
    from lunascend.visibility import engine
    calls=[];original=engine.analyze_terrain
    def counted(r):calls.append(r);return original(r)
    monkeypatch.setattr(engine,'analyze_terrain',counted)
    result=engine.analyze_visibility(request())
    v=result.terrain_visibility
    assert len(calls)==1 and len(v.observations)==25
    assert v.surface_elevation_m==pytest.approx(1944.7670898436713,abs=1e-7)
    assert v.observer_radius_m==pytest.approx(1737400+1944.7670898436713+2,abs=1e-7)
    assert max(x['native_position_residual_m'] for x in v.observer_geometry)<1e-6
    assert v.native_latitude_deg==pytest.approx(-89.4631577569723,abs=1e-9)
    assert abs(v.native_latitude_deg)>89  # Near-polar, not an Earth projection.
    assert not np.array_equal(v.observer_geometry[0]['de440_to_de421_matrix'],v.observer_geometry[-1]['de440_to_de421_matrix'])
    assert result.horizon.reference_frame=='MOON_ME_DE421' and result.observations[0].reference_frame=='MOON_ME_DE440_ME421'
    assert v.observations[0].sun.classification=='conditional_clearance'
    assert v.observations[0].earth.classification=='modeled_obstruction'
    assert v.observations[0].sun.elevation_deg==pytest.approx(result.observations[0].sun_elevation_deg.value,abs=1e-10)
    assert all(p.validation_status=='unvalidated' for p in result.provenance)
    assert not v.global_visibility_confirmed


def test_real_height_changes_horizon_and_spice_observer():
    from lunascend.visibility.engine import analyze_visibility
    r=request().model_dump();r['site']['observer_height_m']=5.0;r['end_utc']=r['start_utc']+timedelta(hours=1)
    result=analyze_visibility(ScenarioRequest.model_validate(r))
    assert result.terrain_visibility.observer_radius_m==pytest.approx(1737400+1944.7670898436713+5,abs=1e-7)
    assert result.horizon.observer_height_m==5.0
    assert all(x['observer_height_m']==5.0 for x in result.terrain_visibility.observer_geometry)
    reference=json.loads((Path(__file__).parents[2]/'docs/validation/step-7.5-results.json').read_text(encoding='utf-8'))['result']['terrain_visibility']
    assert result.terrain_visibility.observations[0].sun.clearance_deg > reference['observations'][0]['sun']['clearance_deg']


def test_existing_endpoint_terrain_and_unknown_dataset():
    from fastapi.testclient import TestClient
    from lunascend.main import app
    with TestClient(app) as client:
        r=request().model_dump(mode='json')
        response=client.post('/api/v1/scenarios/analyze',json=r)
        assert response.status_code==200 and response.json()['terrain_visibility']['dataset_id']=='lola-site01-5m-v2020'
        r['settings']['terrain_options']['dataset_id']='absent'
        response=client.post('/api/v1/scenarios/analyze',json=r)
        assert response.status_code==503 and response.json()['visibility_windows'] is None
