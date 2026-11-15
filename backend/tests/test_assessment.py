"""Assessment truth table on saved real evidence and explicit test-only hardware variants."""
import json
from pathlib import Path
import pytest
from fastapi.testclient import TestClient
from lunascend.contracts.assessment import AssessmentRequest
from lunascend.contracts.models import ScenarioResult, ScenarioRequest
from lunascend.contracts.resilience import MissionConstraints
from lunascend.resilience.assessment import assess
from lunascend.main import create_app
ROOT=Path(__file__).parents[2]
def evidence():
    def strip(v):
        if isinstance(v,dict): return {k:strip(x) for k,x in v.items() if k!='duration_s'}
        if isinstance(v,list): return [strip(x) for x in v]
        return v
    return ScenarioResult.model_validate(strip(json.loads((ROOT/'docs/validation/step-8-results.json').read_text(encoding='utf-8'))['result']))

def test_not_run():
    assert assess(AssessmentRequest()).classification=='analysis_not_run'

def test_failure_has_priority_over_missing_communication():
    d=evidence().model_dump(exclude_computed_fields=True);d['communication']=None
    r=ScenarioResult.model_validate(d)
    report=assess(AssessmentRequest(result=r,require_communication=True))
    assert report.classification=='does_not_meet_requirements'
    assert any(row.status=='indeterminate' for row in report.constraints)
    assert any(row.status=='fail' for row in report.constraints)
    assert 'does not simulate energy below reserve' in str(report)

def test_no_battery_missing_power_is_unknown_not_zero():
    d=evidence().model_dump(exclude_computed_fields=True);d['power']=None
    report=assess(AssessmentRequest(result=ScenarioResult.model_validate(d)))
    assert report.classification=='insufficient_data'
    assert all(row.actual is None for row in report.constraints)

def test_optional_communication_is_excluded_and_optimistic_pass_is_conditional():
    report=assess(AssessmentRequest(result=evidence(),requirements=MissionConstraints(require_conservative_pass=False,allow_optimistic_only=True)))
    assert report.classification=='conditional'
    assert not any('dte' in row.constraint_id for row in report.constraints)
    assert all(row.status=='pass' for row in report.constraints)

def test_no_mandatory_requirements_is_not_a_mission_pass():
    report=assess(AssessmentRequest(result=evidence(),require_power=False,require_communication=False))
    assert report.classification=='insufficient_data' and not report.constraints

def test_low_load_conservative_pass_uses_existing_engine():
    from lunascend.power.service import restore_environment,attach_engineering
    env=restore_environment(json.loads((ROOT/'docs/validation/step-7.5-results.json').read_text(encoding='utf-8'))['result'])
    d=evidence().request.model_dump();d['settings']['power_options']['baseline_load_w']=1.0
    result=attach_engineering(env,ScenarioRequest.model_validate(d))
    report=assess(AssessmentRequest(result=result))
    assert report.classification=='meets_all_evaluated_mandatory_requirements'
    assert all(row.status=='pass' for row in report.constraints)

def test_api_refuses_mock_and_nonfinite_threshold():
    with TestClient(create_app()) as client:
        assert client.post('/api/v1/scenarios/assess',json={}).json()['classification']=='analysis_not_run'
        assert client.post('/api/v1/scenarios/assess',json={'requirements':{'minimum_soc_pct':101}}).status_code==422
        data=evidence().model_dump(mode='json');data['provider_mode']='mock'
        assert client.post('/api/v1/scenarios/assess',json={'result':data}).status_code==422

def test_geographic_selection_checks_actual_source_pixels():
    from lunascend.terrain.selection import select_terrain
    from lunascend.contracts.terrain import TerrainRequest
    registry=json.loads((ROOT/'data/manifests/polar-sites/registry.json').read_text(encoding='utf-8'))
    for record in (registry['sites'][2],registry['sites'][7]):
        result=select_terrain(TerrainRequest(dataset_id=record['dataset_id'],latitude_deg=record['latitude'],longitude_deg=record['longitude'],reference_frame='MOON_ME_DE421'))
        assert result['dataset_id']==record['dataset_id'] and result['surface_elevation_m'] is not None
    result=select_terrain(TerrainRequest(dataset_id='lola-site01-5m-v2020',latitude_deg=10.,longitude_deg=10.,reference_frame='MOON_ME_DE421'))
    assert result['dataset_id'] is None and len(result['checked'])==14


def test_serialized_result_roundtrip_checks_computed_durations():
    data=evidence().model_dump(mode='json')
    assert AssessmentRequest.model_validate({'result':data}).result==evidence()
    data['visibility_windows'][0]['duration_s']+=1
    with pytest.raises(ValueError): AssessmentRequest.model_validate({'result':data})


def test_known_prefix_shortage_fails_even_with_unknown_final_interval():
    from lunascend.power.engine import analyze_power
    from lunascend.contracts.models import TerrainVisibility
    original=evidence()
    terrain=original.terrain_visibility.model_dump(exclude_computed_fields=True)
    terrain['observations'][-1]['sun']['classification']='indeterminate'
    power=analyze_power(TerrainVisibility.model_validate(terrain),original.power.configuration,
        original.request.start_utc,original.request.end_utc,original.request.sample_step_s)
    assert power.cases[0].totals.unmet_load_wh is None
    assert power.cases[0].potential_depletion_intervals
    data=original.model_dump(exclude_computed_fields=True);data['power']=power
    report=assess(AssessmentRequest(result=ScenarioResult.model_validate(data)))
    assert report.classification=='does_not_meet_requirements'
    assert any(r.constraint_id=='conservative_known_prefix_unmet_load' and r.status=='fail' for r in report.constraints)


def test_hardware_only_edits_reuse_environment_but_verify_source_identity(monkeypatch):
    from lunascend.power import environment_cache as cache
    from lunascend.power.service import environmental_request
    from lunascend.ephemeris.kernels import KernelConfiguration
    from datetime import timedelta
    cache._cache.clear();checks=[];calls=[]
    identity=['pinned-v1']
    monkeypatch.setattr(cache,'source_identity',lambda *args:checks.append(True) or identity[0])
    def calculate(*args):calls.append(args);return evidence()
    configuration=KernelConfiguration.from_environment()
    first=evidence().request
    data=first.model_dump();data['settings']['power_options']['battery_capacity_wh']=1000.
    second=ScenarioRequest.model_validate(data)
    cache.environment(environmental_request(first),configuration,calculate)
    cache.environment(environmental_request(second),configuration,calculate)
    assert len(calls)==1 and len(checks)==2
    identity[0]='pinned-v2'
    cache.environment(environmental_request(second),configuration,calculate)
    assert len(calls)==2
    cache._cache.clear()


def test_resilience_uses_the_same_optional_communication_requirement():
    from lunascend.resilience.constraints import evaluate
    rows,status=evaluate(evidence(),MissionConstraints(require_communication=False,require_conservative_pass=False,allow_optimistic_only=True),None)
    assert all('dte' not in r.constraint_id for r in rows)
    assert status=='conditionally_promising'
