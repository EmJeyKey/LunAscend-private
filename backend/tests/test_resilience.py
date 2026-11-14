"""Resilience orchestration and requirement evaluation; saved evidence is not new validation."""
import asyncio
import copy
import json
from datetime import timedelta
from pathlib import Path
import pytest
from pydantic import ValidationError
from lunascend.contracts.models import ScenarioRequest, ScenarioResult
from lunascend.contracts.resilience import OpportunityRequest, MissionConstraints
from lunascend.resilience.service import SearchService, shift_request, request_id, dates
from lunascend.resilience.constraints import evaluate, differences
from lunascend.ephemeris.kernels import GeometryError

ROOT=Path(__file__).parents[2]

def strip(value):
    if isinstance(value,dict): return {k:strip(v) for k,v in value.items() if k!='duration_s'}
    if isinstance(value,list): return [strip(v) for v in value]
    return value

def evidence():
    return ScenarioResult.model_validate(strip(json.loads((ROOT/'docs/validation/step-8-results.json').read_text(encoding='utf-8'))['result']))


def test_requested_slope_remains_unknown_and_sun_criterion_has_evidence():
    rows,_=evaluate(evidence(),MissionConstraints(maximum_slope_deg=10,minimum_sun_clearance_fraction=.2),0)
    slope=next(r for r in rows if r.constraint_id=='maximum_terrain_slope')
    assert slope.actual is None and slope.status=='indeterminate'
    assert next(r for r in rows if r.constraint_id=='minimum_conditional_sun_clearance_fraction').units=='fraction'

def search(**patch):
    r=evidence().request
    return OpportunityRequest.model_validate({'baseline':r,'earliest_utc':r.start_utc,'latest_utc':r.start_utc,'step_hours':24.0,**patch})

@pytest.mark.parametrize('hours',[0,24,-24,72])
def test_shift_preserves_hardware_duration_and_explicit_epoch(hours):
    original=evidence().request
    calls=[]
    def transform(site,start,end):
        calls.append((start,end));return site.latitude_deg,site.longitude_deg
    result=shift_request(original,original.site,original.start_utc+timedelta(hours=hours),transform)
    assert result.start_utc-original.start_utc==timedelta(hours=hours)
    assert result.end_utc-result.start_utc==original.end_utc-original.start_utc
    assert result.settings.power_options==original.settings.power_options
    assert result.settings.communication_options==original.settings.communication_options
    assert result.settings.terrain_options.coordinate_epoch_utc==result.start_utc
    assert len(calls)==(hours!=0)
    assert (request_id(result)==request_id(original))==(hours==0)

@pytest.mark.parametrize('patch',[
    {'latest_utc':'2026-11-13T00:00:00Z'},
    {'latest_utc':'2026-12-15T00:00:00Z'},
    {'latest_utc':'2026-11-27T00:00:00Z'},
    {'step_hours':0.0}, {'earliest_utc':'2026-11-14T00:00:00'},
])
def test_invalid_dates_and_candidate_limits(patch):
    with pytest.raises(ValidationError):search(**patch)

def test_mock_and_missing_engineering_rejected():
    d=evidence().request.model_dump();d['provider_mode']='mock'
    with pytest.raises(ValidationError):search(baseline=d)
    d=evidence().request.model_dump();d['settings']['communication_enabled']=False
    with pytest.raises(ValidationError):search(baseline=d)

def test_conservative_battery_fails_and_optimistic_is_conditional_only():
    r=evidence()
    rules=MissionConstraints(maximum_dte_interruption_s=86400.0,minimum_dte_access_s=0.0)
    checks,status=evaluate(r,rules,0.0)
    assert status=='fails_modeled_requirement'
    assert next(c for c in checks if c.constraint_id=='conservative_unmet_load').actual==pytest.approx(772.5)
    rules=MissionConstraints(**{**rules.model_dump(),'require_conservative_pass':False,'allow_optimistic_only':True})
    checks,status=evaluate(r,rules,0.0)
    assert status=='conditionally_promising' and all(c.status=='pass' for c in checks)
    assert all(c.provenance_ids and c.limitations for c in checks)

def test_conservative_pass_under_explicit_low_load_assumptions():
    from lunascend.power.service import restore_environment, attach_engineering
    env=restore_environment(json.loads((ROOT/'docs/validation/step-7.5-results.json').read_text(encoding='utf-8'))['result'])
    d=evidence().request.model_dump();d['settings']['power_options']['baseline_load_w']=1.0
    r=attach_engineering(env,ScenarioRequest.model_validate(d))
    checks,status=evaluate(r,MissionConstraints(maximum_dte_interruption_s=86400.0,minimum_dte_access_s=0.0),0.0)
    assert status=='meets_tested_requirements'
    assert all(c.status=='pass' for c in checks)

def test_unknown_dte_cannot_pass_even_permissive_requirements():
    d=strip(evidence().model_dump(mode='json'));d['communication']['unknown_duration_s']=1.0
    r=ScenarioResult.model_validate(d)
    checks,status=evaluate(r,MissionConstraints(require_conservative_pass=False,allow_optimistic_only=True,
        maximum_dte_interruption_s=86400.0,minimum_dte_access_s=0.0),0.0)
    assert status=='insufficient_evidence'
    assert any(c.status=='indeterminate' for c in checks)

def test_missing_result_unknown_not_zero_and_no_score():
    checks,status=evaluate(None,MissionConstraints(maximum_distance_m=1000.0),None)
    assert status=='insufficient_evidence' and all(c.actual is None for c in checks)
    assert all(c.status=='indeterminate' for c in checks)
    assert not any('score' in c.constraint_id for c in checks)

def test_numeric_differences_and_missing_metrics():
    r=evidence();d=strip(r.model_dump(mode='json'));d['power']['cases'][0]['totals']['solar_generated_wh']=10.0
    other=ScenarioResult.model_validate(d)
    diff=differences(r,other)
    assert diff['conservative_solar_generated_wh'].delta==10.0
    assert diff['conservative_solar_generated_wh'].units=='Wh'
    assert differences(r,None)['sun_initial_elevation'].delta is None

def test_search_zero_delay_cache_and_provenance():
    calls=[];r=evidence()
    service=SearchService(calculate=lambda request:(calls.append(request) or r))
    response=asyncio.run(service.search(search()))
    assert len(calls)==1 and response.cache_hits==1 and response.completed==1
    assert response.opportunities[0].result.provenance==r.provenance
    assert response.opportunities[0].differences['optimistic_solar_generated_wh'].delta==0

def test_recalculates_changed_epoch_and_partial_failure():
    r=evidence();calls=[]
    def calculate(request):
        calls.append(request)
        if request.start_utc!=r.request.start_utc:raise GeometryError('MISSING_DATA','Synthetic missing candidate fixture')
        return r
    service=SearchService(calculate=calculate,transform=lambda site,*a:(site.latitude_deg,site.longitude_deg))
    response=asyncio.run(service.search(search(latest_utc=r.request.start_utc+timedelta(days=1))))
    assert len(calls)==2 and response.completed==1 and response.failed==1
    failed=response.opportunities[1]
    assert failed.request.start_utc==r.request.start_utc+timedelta(days=1)
    assert failed.result is None and failed.classification=='insufficient_evidence'
    assert 'MISSING_DATA' in failed.errors[0]

def test_transform_failure_keeps_intended_identity_and_date():
    r=evidence()
    def fail(*args):raise GeometryError('FRAME_MISMATCH','Synthetic missing frame fixture')
    response=asyncio.run(SearchService(calculate=lambda request:r,transform=fail).search(search(
        earliest_utc=r.request.start_utc+timedelta(days=1),latest_utc=r.request.start_utc+timedelta(days=1))))
    row=response.opportunities[0]
    assert row.request is None and row.start_utc==r.request.start_utc+timedelta(days=1)
    assert row.result is None and row.date_shift_s==86400

def test_cancel_between_candidates():
    async def disconnected():return True
    response=asyncio.run(SearchService(calculate=lambda request:evidence()).search(search(),disconnected))
    assert response.cancelled and not response.opportunities

def test_constraint_units_distance_duration_allowed_sites():
    r=evidence()
    checks,status=evaluate(r,MissionConstraints(required_duration_s=100000.0,maximum_distance_m=1.0,allowed_site_ids=('different',)),2.0)
    found={c.constraint_id:c for c in checks}
    assert found['maximum_distance'].status=='fail' and found['maximum_distance'].units=='m'
    assert found['required_duration'].status=='fail' and found['required_duration'].units=='s'
    assert found['allowed_site'].status=='fail'

def test_api_validation_and_structured_partial_result(monkeypatch):
    from fastapi.testclient import TestClient
    from lunascend.main import app
    from lunascend.api import resilience
    monkeypatch.setattr(resilience,'service',SearchService(calculate=lambda request:evidence()))
    with TestClient(app) as client:
        response=client.post('/api/v1/resilience/search',json=search().model_dump(mode='json'))
        assert response.status_code==200 and response.json()['completed']==1
        payload=search().model_dump(mode='json');payload['step_hours']=0
        assert client.post('/api/v1/resilience/search',json=payload).status_code==422

def test_boundary_grid_and_multiple_site_cap():
    r=evidence().request
    s={**r.site.model_dump(),'site_id':'second'}
    request=search(sites=(s,),latest_utc=r.start_utc+timedelta(days=5))
    assert len(list(dates(request)))*2==12
    with pytest.raises(ValidationError):search(sites=(s,),latest_utc=r.start_utc+timedelta(days=6))

def test_task_cancellation_retains_serial_lock_until_calculation_drains():
    import threading
    entered,release=threading.Event(),threading.Event()
    def calculate(request):
        entered.set();release.wait(5);return evidence()
    async def check():
        service=SearchService(calculate=calculate)
        task=asyncio.create_task(service.search(search()))
        assert await asyncio.to_thread(entered.wait,2)
        task.cancel()
        try:
            with pytest.raises(GeometryError):await service.search(search())
            assert service.lock.locked()
        finally:release.set()
        with pytest.raises(asyncio.CancelledError):await task
        assert not service.lock.locked()
    asyncio.run(check())


def test_executed_nasa_date_change_preserves_native_observer_and_changes_geometry():
    from math import radians,cos,hypot
    report=json.loads((ROOT/'docs/validation/step-9-results.json').read_text(encoding='utf-8'))
    original,delayed=report['response']['opportunities'][:2]
    a,b=original['result'],delayed['result']
    assert a['request']['settings']['power_options']==b['request']['settings']['power_options']
    assert a['request']['settings']['communication_options']==b['request']['settings']['communication_options']
    ta,tb=a['terrain_visibility'],b['terrain_visibility']
    offset=1737400*hypot(radians(ta['native_latitude_deg']-tb['native_latitude_deg']),
        cos(radians(ta['native_latitude_deg']))*radians(ta['native_longitude_deg']-tb['native_longitude_deg']))
    assert offset<1e-6
    assert b['observations'][0]['time_utc'].startswith('2026-11-15')
    assert a['observations'][0]['sun_elevation_deg']['value']!=b['observations'][0]['sun_elevation_deg']['value']
    assert report['response']['horizon_reuses']==2
    assert report['response']['failed']==2

def test_incomplete_power_trajectory_is_indeterminate():
    d=strip(evidence().model_dump(mode='json'))
    for case in d['power']['cases']:
        case['passes_configured_model']=None
        case['status']='partial'
        case['unknown_duration_s']=3600.0
        case['coverage_fraction']=23/24
        for key in case['totals']:
            if key!='electrical_demand_wh':case['totals'][key]=None
    result=ScenarioResult.model_validate(d)
    checks,status=evaluate(result,MissionConstraints(maximum_dte_interruption_s=86400.0,minimum_dte_access_s=0.0),0.0)
    assert status=='insufficient_evidence'
    assert all(c.status=='indeterminate' for c in checks if c.constraint_id.startswith('conservative'))

def test_user_may_explicitly_allow_unmet_load_without_requiring_model_pass():
    checks,status=evaluate(evidence(),MissionConstraints(require_conservative_pass=False,allow_optimistic_only=False,
        maximum_unmet_load_wh=800.0,maximum_dte_interruption_s=86400.0,minimum_dte_access_s=0.0),0.0)
    assert status=='meets_tested_requirements'
    assert all(c.status=='pass' for c in checks)
    assert not any(c.constraint_id=='conservative_model_pass' for c in checks)

def test_rounded_date_step_cannot_bypass_candidate_limit():
    r=evidence().request
    with pytest.raises(ValidationError):search(latest_utc=r.start_utc+timedelta(hours=12),step_hours=1.0000000000000002)
