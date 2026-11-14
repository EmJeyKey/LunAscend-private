"""Transparent comparisons of returned engineering metrics, never new physics."""
from math import asin, sqrt, cos, sin, radians
from lunascend.contracts.resilience import MissionConstraints, ConstraintResult, ComparedMetric
from lunascend.contracts.models import ScenarioResult

LIMITS = ("Finite sampled terrain; center-only geometry; unvalidated conditional engineering estimates.",
          "Passing tested requirements does not guarantee mission survival or establish an RF link.")


def metrics(result: ScenarioResult | None) -> dict[str, tuple[float | None, str]]:
    values: dict[str, tuple[float | None, str]] = {}
    if result is None:
        return values
    for body in ("sun", "earth"):
        obs = (result.observations or (None,))[0]
        values[body+"_initial_elevation"] = (getattr(obs, body+"_elevation_deg").value if obs else None, "deg")
        intervals = result.visibility_windows
        values[body+"_sample_supported_obstruction_s"] = (sum(w.duration_s for w in intervals if w.target==body and w.classification=='modeled_obstruction') if intervals is not None else None,"s")
    h = result.horizon
    values['finite_radius_complete_ray_fraction'] = (sum(c=='sampled_radius' for c in h.ray_coverage)/len(h.ray_coverage) if h and h.ray_coverage else None,'fraction')
    for case in result.power.cases if result.power else ():
        for key in ("solar_generated_wh", "electrical_demand_wh", "minimum_battery_energy_wh", "minimum_soc_pct", "final_battery_energy_wh", "unmet_load_wh"):
            values[case.assumption+"_"+key] = (getattr(case.totals,key), "%" if key.endswith("pct") else "Wh")
        values[case.assumption+"_unknown_duration_s"] = (case.unknown_duration_s,"s")
    c = result.communication
    for key, value in (("dte_access_s", c.earth_visibility_duration_s.value if c else None),
                       ("dte_interruption_s", c.longest_interruption_s.value if c else None),
                       ("dte_unknown_s",c.unknown_duration_s if c else None)):
        values[key] = (value,"s")
    return values


def differences(baseline: ScenarioResult, candidate: ScenarioResult | None) -> dict[str, ComparedMetric]:
    a,b = metrics(baseline),metrics(candidate)
    return {key:ComparedMetric(units=units,baseline=value,candidate=b.get(key,(None,units))[0],
        delta=(b[key][0]-value) if value is not None and key in b and b[key][0] is not None else None)
        for key,(value,units) in a.items()}


def distance(baseline: ScenarioResult, candidate: ScenarioResult) -> float | None:
    a,b = baseline.terrain_visibility,candidate.terrain_visibility
    if a is None or b is None: return None
    # Same declared native lunar frame and sphere; no Earth CRS.
    lat1,lat2 = radians(a.native_latitude_deg),radians(b.native_latitude_deg)
    dlon = radians(a.native_longitude_deg-b.native_longitude_deg)
    h = sin((lat2-lat1)/2)**2+cos(lat1)*cos(lat2)*sin(dlon/2)**2
    return 2*1737400*asin(sqrt(max(0.0,min(1.0,h))))


def evaluate(result: ScenarioResult | None, rules: MissionConstraints, distance_m: float | None) -> tuple[tuple[ConstraintResult,...],str]:
    ids = tuple(p.id for p in result.provenance) if result else ()
    rows: list[ConstraintResult] = []
    def check(key: str, actual: float | None, threshold: float, units: str, minimum=False, reason="", tolerance=0.0):
        status = "indeterminate" if actual is None else "pass" if (actual >= threshold if minimum else actual <= threshold+tolerance) else "fail"
        rows.append(ConstraintResult(constraint_id=key,actual=actual,threshold=threshold,units=units,status=status,
            explanation=reason or f"{key}: actual must be {'at least' if minimum else 'at most'} the threshold; missing evidence is indeterminate.",
            provenance_ids=ids,limitations=LIMITS))
    cases = {c.assumption:c for c in result.power.cases} if result and result.power else {}
    mode = "conservative" if rules.require_conservative_pass or not rules.allow_optimistic_only else "optimistic"
    case = cases.get(mode)
    check(mode+"_unmet_load",case.totals.unmet_load_wh if case else None,rules.maximum_unmet_load_wh,"Wh",
        reason="Unmet load must not exceed the threshold, with the existing battery model's 1e-8 Wh arithmetic tolerance (not physical uncertainty).",tolerance=1e-8)
    check(mode+"_minimum_soc",case.totals.minimum_soc_pct if case else None,rules.minimum_soc_pct,"%",True)
    if rules.require_conservative_pass:
        check("conservative_model_pass",float(case.passes_configured_model) if case and case.passes_configured_model is not None else None,1.0,"boolean",True,
            "The explicitly required conservative power-model pass additionally requires no unmet demand beyond the existing 1e-8 Wh arithmetic tolerance.")
    c = result.communication if result else None
    complete = c is not None and c.unknown_duration_s == 0
    # A partial known interruption may fail a limit, but may never pass it.
    interrupt = c.longest_interruption_s.value if c else None
    check("maximum_dte_interruption",interrupt if complete or interrupt is not None and interrupt > rules.maximum_dte_interruption_s else None,
        rules.maximum_dte_interruption_s,"s")
    check("minimum_conditional_dte_access",c.earth_visibility_duration_s.value if complete else None,rules.minimum_dte_access_s,"s",True)
    check("required_dte_margin",c.configuration.minimum_earth_clearance_deg if c else None,rules.minimum_earth_clearance_deg,"deg",True,
        "DTE duration classifications must have been evaluated with at least this Earth-center clearance requirement; it is not an RF margin.")
    if rules.required_duration_s is not None:
        check("required_duration",(result.request.end_utc-result.request.start_utc).total_seconds() if result else None,rules.required_duration_s,"s",True)
    if rules.allowed_site_ids:
        check("allowed_site",float(result.request.site.site_id in rules.allowed_site_ids) if result else None,1.0,"boolean",True)
    if rules.maximum_distance_m is not None:
        check("maximum_distance",distance_m,rules.maximum_distance_m,"m")
    if rules.minimum_sun_clearance_fraction is not None:
        windows=[w for w in result.visibility_windows if w.target=='sun'] if result and result.visibility_windows is not None else []
        duration=(result.request.end_utc-result.request.start_utc).total_seconds() if result else 0
        complete=duration>0 and abs(sum(w.duration_s for w in windows)-duration)<1e-6 and all(w.classification in ('conditional_clearance','modeled_obstruction') for w in windows)
        fraction=sum(w.duration_s for w in windows if w.classification=='conditional_clearance')/duration if complete else None
        check('minimum_conditional_sun_clearance_fraction',fraction,rules.minimum_sun_clearance_fraction,'fraction',True,
            'Sample-supported Sun-center clearance within the finite terrain model, not disk illumination or guaranteed sunlight. Unknown intervals cannot pass.')
    if rules.maximum_slope_deg is not None:
        check('maximum_terrain_slope',None,rules.maximum_slope_deg,'deg',reason='No verified slope-at-scale product is installed; this mandatory criterion remains indeterminate. Slope alone cannot establish landing safety.')
    statuses = {r.status for r in rows}
    if "fail" in statuses: classification = "fails_modeled_requirement"
    elif "indeterminate" in statuses: classification = "insufficient_evidence"
    elif mode == "optimistic": classification = "conditionally_promising"
    else: classification = "meets_tested_requirements"
    return tuple(rows),classification
