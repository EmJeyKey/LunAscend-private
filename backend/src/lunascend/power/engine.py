"""Piecewise-constant conditional PV and battery bus/internal energy accounting."""
from math import cos, sin, radians
from lunascend.contracts import Metric
from lunascend.contracts.models import TerrainBodyVisibility, TerrainVisibility, PowerAnalysis
from lunascend.contracts.engineering import PowerConfiguration, EnergyCase, EnergyTotals, BatterySample, DepletionInterval
from .timeline import segments

METHOD = "conditional-pv-battery-left-hold-v1"
ASSUMPTIONS = (
    "1361 W/m2, if selected, is a configurable nominal irradiance assumption, not a measured site-specific value or distance-scaled SPICE measurement.",
    "Conservative denies conditional sunlight; optimistic permits conditional center clearance only. Unknown terrain/geometry is not assumed clear.",
    "Fixed horizontal uses radial ENU up dot Sun unit direction; ideal tracking uses incidence 1 without actuator, pointing or slew constraints.",
    "Power is held at the left sample over each supported interval; no visibility transitions are invented. Both endpoint states must be usable.",
    "No partial disk, dust, self-shadowing, thermal PV efficiency, degradation, battery aging, current/power limits or electrical transients.",
    "Capacity spans 0 to configured Wh; minimum SOC is an enforced reserve. Heater power is a constant user assumption, not a thermal simulation.",
    "Cases are tested assumptions, not statistical confidence intervals, guaranteed physical bounds or mission-survival guarantees.",
)


def incidence(body: TerrainBodyVisibility, mode: str) -> float | None:
    if body.elevation_deg is None or body.azimuth_deg is None:
        return None
    if mode == "ideal_sun_tracking":
        return 1.0
    az, el = radians(body.azimuth_deg), radians(body.elevation_deg)
    sun_direction = (cos(el)*sin(az), cos(el)*cos(az), sin(el))
    normal = (0.0,0.0,1.0)
    return max(0.0,min(1.0,sum(a*b for a,b in zip(sun_direction,normal))))


def generation(body: TerrainBodyVisibility, config: PowerConfiguration, assumption: str) -> float | None:
    if body.classification == "modeled_obstruction":
        return 0.0
    if body.classification != "conditional_clearance":
        return None
    factor = incidence(body,config.orientation_mode)
    if factor is None:
        return None
    illumination = 0.0 if assumption == "conservative" else 1.0
    return config.solar_irradiance_w_m2*config.panel_area_m2*config.panel_efficiency*config.system_efficiency*config.derating_factor*factor*illumination


def simulate(terrain: TerrainVisibility, config: PowerConfiguration, start, end, sample_step_s: float, assumption: str) -> EnergyCase:
    intervals = segments(terrain,start,end,sample_step_s)
    capacity = config.battery_capacity_wh
    energy = capacity*config.initial_soc_pct/100
    initial = energy
    reserve = capacity*config.minimum_soc_pct/100
    load = config.baseline_load_w+config.heater_load_w
    minimum = energy
    totals = dict(solar_generated_wh=0.0,direct_solar_to_load_wh=0.0,battery_charged_wh=0.0,battery_discharged_wh=0.0,
        charging_loss_wh=0.0,discharging_loss_wh=0.0,curtailed_surplus_wh=0.0,unmet_load_wh=0.0)
    prefix_known = True
    covered = 0.0
    depletion = []
    first = intervals[0].left if intervals else None
    first_power = generation(first.sun,config,assumption) if first else None
    samples = [BatterySample(time_utc=start,solar_generation_w=first_power,load_w=load,battery_energy_wh=energy,soc_pct=config.initial_soc_pct,
        environmental_status=first.sun.classification if first else "unknown time coverage")]
    for interval in intervals:
        left, right = interval.left,interval.right
        solar = generation(left.sun,config,assumption) if left else None
        right_power = generation(right.sun,config,assumption) if right else None
        supported = solar is not None and right_power is not None
        hours = interval.seconds/3600
        if supported:
            covered += interval.seconds
        else:
            prefix_known = False
        if prefix_known:
            production = solar*hours
            demand = load*hours
            direct = min(production,demand)
            surplus = production-direct
            input_to_charge = min(surplus,max(0.0,capacity-energy)/config.charging_efficiency)
            charged = input_to_charge*config.charging_efficiency
            deficit = demand-direct
            discharged = min(max(0.0,energy-reserve),deficit/config.discharging_efficiency)
            delivered = discharged*config.discharging_efficiency
            unmet = max(0.0,deficit-delivered)
            energy = min(capacity,max(reserve,energy+charged-discharged))
            minimum = min(minimum,energy)
            values = (production,direct,charged,discharged,input_to_charge-charged,discharged-delivered,surplus-input_to_charge,unmet)
            for key,value in zip(totals,values):totals[key] += max(0.0,value)
            if unmet > 1e-8:
                depletion.append(DepletionInterval(start_utc=interval.start,end_utc=interval.end,unmet_load_wh=unmet))
        samples.append(BatterySample(time_utc=interval.end,solar_generation_w=right_power,load_w=load,
            battery_energy_wh=energy if prefix_known else None,soc_pct=min(100.0,max(0.0,100*energy/capacity)) if prefix_known else None,
            environmental_status=right.sun.classification if right else "unknown time coverage"))
    span = (end-start).total_seconds()
    complete = prefix_known and abs(covered-span) < 1e-5
    demand_total = load*span/3600
    residual = (initial+totals['solar_generated_wh']-(demand_total-totals['unmet_load_wh'])-energy-
        totals['charging_loss_wh']-totals['discharging_loss_wh']-totals['curtailed_surplus_wh']) if complete else None
    final = EnergyTotals(**(totals if complete else {k:None for k in totals}),electrical_demand_wh=demand_total,
        final_battery_energy_wh=energy if complete else None,minimum_battery_energy_wh=minimum if complete else None,
        minimum_soc_pct=min(100.0,max(0.0,minimum/capacity*100)) if complete else None,energy_balance_residual_wh=residual)
    return EnergyCase(assumption=assumption,status="calculated" if complete else "partial" if covered else "unavailable",
        passes_configured_model=totals['unmet_load_wh'] <= 1e-8 if complete else None,
        coverage_fraction=min(1.0,covered/span),covered_duration_s=covered,unknown_duration_s=max(0.0,span-covered),
        max_sample_step_s=max((i.seconds for i in intervals),default=None),totals=final,samples=tuple(samples),
        potential_depletion_intervals=tuple(depletion),assumptions=ASSUMPTIONS)


def analyze_power(terrain: TerrainVisibility, config: PowerConfiguration, start, end, sample_step_s: float) -> PowerAnalysis:
    cases = tuple(simulate(terrain,config,start,end,sample_step_s,mode) for mode in ("conservative","optimistic"))
    a,b = (c.passes_configured_model for c in cases)
    outcome = "unavailable" if all(c.status == "unavailable" for c in cases) else "indeterminate" if a is None or b is None else "pass_both" if a and b else "pass_optimistic_only" if b else "fail_both"
    return PowerAnalysis(status="partial",configuration=config,cases=cases,outcome=outcome,battery_capacity_wh=config.battery_capacity_wh,
        consumption_w=Metric(value=config.baseline_load_w+config.heater_load_w,status="available",provenance_ids=("power-model",)),
        provenance_ids=(*terrain.provenance_ids,"power-model"),assumptions=ASSUMPTIONS)
