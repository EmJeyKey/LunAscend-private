"""Analytical hardware assumptions on explicitly synthetic terrain-center samples."""
from datetime import datetime,timedelta,timezone
import asyncio
import json
from pathlib import Path
import pytest
from pydantic import ValidationError
from lunascend.contracts import ScenarioRequest
from lunascend.contracts.models import TerrainVisibility,TerrainVisibilityObservation,TerrainBodyVisibility
from lunascend.contracts.engineering import PowerConfiguration,CommunicationConfiguration
from lunascend.power.engine import generation,incidence,simulate,analyze_power
from lunascend.communication.engine import access,analyze_communication
from lunascend.ephemeris.kernels import GeometryError

START=datetime(2026,11,14,tzinfo=timezone.utc)


def body(label='conditional_clearance',elevation=30.0,clearance=1.0):
    return TerrainBodyVisibility(azimuth_deg=0.0 if label != 'unavailable' else None,elevation_deg=elevation if label != 'unavailable' else None,
        horizon_elevation_deg=elevation-clearance if label not in ('indeterminate','unavailable') else None,
        clearance_deg=clearance if label not in ('indeterminate','unavailable') else None,classification=label,
        coverage='sampled_radius' if label not in ('indeterminate','unavailable') else 'unknown',reason='Synthetic analytical engineering fixture, not NASA terrain.')


def terrain(times=(0.0,1.0),sun=None,earth=None):
    return TerrainVisibility(dataset_id='SYNTHETIC_ANALYTICAL_FIXTURE',surface_elevation_m=0.0,observer_height_m=1.0,
        observer_radius_m=1737401.0,native_latitude_deg=-89.0,native_longitude_deg=0.0,max_search_radius_m=100.0,
        azimuth_step_deg=1.0,radial_step_m=1.0,provenance_ids=('synthetic-test',),assumptions=('Synthetic analytical input only.',),
        observations=tuple(TerrainVisibilityObservation(time_utc=START+timedelta(hours=t),sun=(sun[i] if sun else body()),earth=(earth[i] if earth else body())) for i,t in enumerate(times)))


def configuration(**changes):
    return PowerConfiguration(**{'panel_area_m2':1.0,'panel_efficiency':1.0,'solar_irradiance_w_m2':100.0,
        'orientation_mode':'ideal_sun_tracking','system_efficiency':1.0,'baseline_load_w':20.0,'battery_capacity_wh':100.0,
        'initial_soc_pct':50.0,'minimum_soc_pct':0.0,'charging_efficiency':1.0,'discharging_efficiency':1.0,**changes})


def run(t=None,c=None,mode='optimistic',hours=1.0,step=3600.0):
    return simulate(t or terrain(),c or configuration(),START,START+timedelta(hours=hours),step,mode)


def test_constant_solar_load_capacity_and_curtailment():
    r=run().totals
    assert r.solar_generated_wh==100 and r.electrical_demand_wh==20
    assert r.direct_solar_to_load_wh==20 and r.battery_charged_wh==50 and r.curtailed_surplus_wh==30
    assert r.final_battery_energy_wh==100 and r.unmet_load_wh==0


def test_darkness_finite_battery_and_minimum_reserve():
    t=terrain((0.0,1.0,2.0),sun=[body('modeled_obstruction',30.0,-1.0)]*3)
    r=run(t,configuration(baseline_load_w=50.0,minimum_soc_pct=10.0),hours=2.0)
    assert r.totals.final_battery_energy_wh==10 and r.totals.battery_discharged_wh==40
    assert r.totals.unmet_load_wh==60 and not r.passes_configured_model
    assert len(r.potential_depletion_intervals)==2


@pytest.mark.parametrize('changes',[{'panel_area_m2':0.0},{'solar_irradiance_w_m2':0.0},{'panel_efficiency':0.0},{'system_efficiency':0.0},{'derating_factor':0.0}])
def test_zero_generation_parameters(changes):
    assert run(c=configuration(**changes)).totals.solar_generated_wh==0


def test_fixed_horizontal_differs_from_ideal_tracking():
    assert incidence(body(elevation=30.0),'fixed_horizontal')==pytest.approx(0.5)
    assert incidence(body(elevation=-10.0),'fixed_horizontal')==0
    assert incidence(body(elevation=-10.0),'ideal_sun_tracking')==1
    assert generation(body(elevation=30.0),configuration(orientation_mode='fixed_horizontal'),'optimistic')==pytest.approx(50)
    assert generation(body(elevation=30.0),configuration(),'optimistic')==100


def test_efficiency_and_internal_versus_load_energy():
    r=run(c=configuration(initial_soc_pct=0.0,charging_efficiency=0.8,baseline_load_w=0.0)).totals
    assert r.battery_charged_wh==80 and r.charging_loss_wh==20 and r.final_battery_energy_wh==80
    r=run(c=configuration(panel_area_m2=0.0,discharging_efficiency=0.8,baseline_load_w=60.0)).totals
    assert r.battery_discharged_wh==50 and r.discharging_loss_wh==10 and r.unmet_load_wh==20


@pytest.mark.parametrize('soc,unmet',[(100.0,0.0),(10.0,20.0)])
def test_full_or_minimum_charge(soc,unmet):
    c=configuration(panel_area_m2=0.0,initial_soc_pct=soc,minimum_soc_pct=10.0)
    assert run(c=c).totals.unmet_load_wh==unmet


def test_energy_conservation_irregular_intervals_and_heater():
    t=terrain((0.0,0.25,1.5,2.0),sun=[body(),body('modeled_obstruction',30.0,-1.0),body(),body()])
    c=configuration(charging_efficiency=0.7,discharging_efficiency=0.8,heater_load_w=10.0)
    r=run(t,c,hours=2.0,step=4500.0).totals
    assert r.solar_generated_wh==75.0 and r.electrical_demand_wh==60.0
    assert r.energy_balance_residual_wh==pytest.approx(0.0,abs=1e-12)
    assert r.solar_generated_wh==pytest.approx(r.direct_solar_to_load_wh+r.battery_charged_wh+r.charging_loss_wh+r.curtailed_surplus_wh)
    assert r.electrical_demand_wh==pytest.approx(r.direct_solar_to_load_wh+r.battery_discharged_wh-r.discharging_loss_wh+r.unmet_load_wh)


@pytest.mark.parametrize('label',['indeterminate','unavailable'])
def test_unknown_breaks_battery_and_full_totals(label):
    t=terrain((0.0,1.0,2.0,3.0),sun=[body(),body(label),body(),body()])
    r=run(t,hours=3.0)
    assert r.passes_configured_model is None and r.status=='partial'
    assert r.coverage_fraction==pytest.approx(1/3) and r.unknown_duration_s==7200
    assert all(s.battery_energy_wh is None for s in r.samples[1:])
    assert r.totals.final_battery_energy_wh is None and r.totals.solar_generated_wh is None
    assert r.totals.electrical_demand_wh==60


def test_missing_time_endpoints_gaps_and_order():
    assert run(terrain((0.25,0.75))).coverage_fraction==0.5
    assert run(terrain((0.0,2.0)),hours=2.0,step=3600.0).status=='unavailable'
    with pytest.raises(GeometryError):run(terrain((1.0,0.0)))


def test_assumptions_are_not_confirmed_power_and_outcomes():
    t=terrain()
    r=analyze_power(t,configuration(baseline_load_w=100.0),START,START+timedelta(hours=1),3600.0)
    assert r.outcome=='pass_optimistic_only'
    assert r.cases[0].totals.solar_generated_wh==0 and r.cases[1].totals.solar_generated_wh==100
    assert analyze_power(t,configuration(),START,START+timedelta(hours=1),3600.0).outcome=='pass_both'
    assert analyze_power(t,configuration(baseline_load_w=1000.0),START,START+timedelta(hours=1),3600.0).outcome=='fail_both'
    assert any('guaranteed' in s for s in r.assumptions)


@pytest.mark.parametrize('label,clearance,expected',[('modeled_obstruction',-1.0,'modeled_obstruction'),('conditional_clearance',1.0,'below_clearance_requirement'),('conditional_clearance',2.0,'conditional_access'),('indeterminate',None,'indeterminate'),('unavailable',None,'unavailable')])
def test_dte_classifications(label,clearance,expected):
    assert access(body(label,clearance=clearance),2.0)==expected


def test_dte_duration_irregular_unknown_and_interruptions():
    earth=[body('modeled_obstruction',30.0,-1.0),body(clearance=1.0),body(clearance=4.0),body('indeterminate'),body(clearance=4.0)]
    t=terrain((0.0,0.5,1.0,1.5,2.0),earth=earth)
    r=analyze_communication(t,CommunicationConfiguration(minimum_earth_clearance_deg=2.0),START,START+timedelta(hours=2),1800.0)
    assert r.earth_visibility_duration_s.value==0 and r.longest_interruption_s.value==3600
    assert r.unknown_duration_s==3600 and r.coverage_fraction==0.5
    assert r.windows[0].classification=='modeled_obstruction' and r.windows[1].classification=='below_clearance_requirement'
    assert r.link_budget_db.value is None and r.link_availability=='not_modeled'


def test_constant_conditional_access_and_all_unknown():
    r=analyze_communication(terrain(),CommunicationConfiguration(),START,START+timedelta(hours=1),3600.0)
    assert r.earth_visibility_duration_s.value==3600 and r.longest_interruption_s.value==0
    r=analyze_communication(terrain(earth=[body('unavailable')]*2),CommunicationConfiguration(),START,START+timedelta(hours=1),3600.0)
    assert r.earth_visibility_duration_s.value is None and r.unknown_duration_s==3600


def test_invalid_hardware_and_reserve():
    for patch in ({'charging_efficiency':0.0},{'panel_efficiency':1.1},{'battery_capacity_wh':0.0},{'initial_soc_pct':0.0,'minimum_soc_pct':10.0},{'baseline_load_w':float('nan')}):
        with pytest.raises(ValidationError):configuration(**patch)


def real_environment():
    from lunascend.power.service import restore_environment
    return restore_environment(json.loads((Path(__file__).parents[2]/'docs/validation/step-7.5-results.json').read_text(encoding='utf-8'))['result'])


def test_replay_saved_nasa_without_terrain_recalculation(monkeypatch):
    from lunascend.power.service import attach_engineering
    from lunascend.visibility import engine
    monkeypatch.setattr(engine,'analyze_visibility',lambda *a:pytest.fail('Saved replay must not recalculate terrain'))
    env=real_environment();r=env.request.model_dump()
    r['settings'].update(power_enabled=True,communication_enabled=True,power_options=configuration().model_dump(),communication_options={})
    result=attach_engineering(env,ScenarioRequest.model_validate(r))
    assert result.observations==env.observations and result.horizon==env.horizon and result.terrain_visibility==env.terrain_visibility
    assert result.power.cases[0].totals.solar_generated_wh==0
    assert result.communication.longest_interruption_s.value==86400
    assert {'power-model','dte-model'} <= {p.id for p in result.provenance}
    assert all(p.validation_status=='unvalidated' for p in result.provenance)


def test_missing_inputs_mock_separation_and_existing_api(monkeypatch):
    from lunascend.providers.scientific import ScientificAnalysisProvider
    from lunascend.providers.mock import MockAnalysisProvider
    from fastapi.testclient import TestClient
    from lunascend.main import app
    from lunascend.visibility import engine
    env=real_environment();r=env.request.model_dump();r['settings']['power_enabled']=True
    result=asyncio.run(ScientificAnalysisProvider().analyze(ScenarioRequest.model_validate(r)))
    assert result.errors[0].code=='INVALID_REQUEST' and result.power is None
    r['settings']['power_options']=configuration().model_dump()
    monkeypatch.setattr(engine,'analyze_visibility',lambda *a:env)
    with TestClient(app) as client:
        response=client.post('/api/v1/scenarios/analyze',json=ScenarioRequest.model_validate(r).model_dump(mode='json'))
        assert response.status_code==200 and response.json()['power']['outcome']
        payload=ScenarioRequest.model_validate(r).model_dump(mode='json')
        payload['settings']['power_options']['panel_efficiency']=5.0
        assert client.post('/api/v1/scenarios/analyze',json=payload).status_code==422
    r=env.request.model_dump();r['provider_mode']='mock';r['settings'].update(power_enabled=True,power_options=configuration().model_dump())
    result=asyncio.run(MockAnalysisProvider().analyze(ScenarioRequest.model_validate(r)))
    assert result.status=='failed' and result.power is None


def test_saved_identity_mismatch_rejected():
    from lunascend.power.service import attach_engineering
    env=real_environment();r=env.request.model_dump();r['site']['observer_height_m']=3.0
    r['settings'].update(power_enabled=True,power_options=configuration().model_dump())
    with pytest.raises(GeometryError):attach_engineering(env,ScenarioRequest.model_validate(r))
