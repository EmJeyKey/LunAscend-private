"""Deterministic requirement assessment using the existing engineering evaluator."""
from lunascend.contracts.assessment import AssessmentRequest, MissionAssessment, Interpretation
from .constraints import evaluate, LIMITS


def assess(request: AssessmentRequest) -> MissionAssessment:
    result = request.result
    if result is None:
        return MissionAssessment(classification="analysis_not_run", limitations=LIMITS)
    from lunascend.contracts.resilience import MissionConstraints
    effective = MissionConstraints(**{**request.requirements.model_dump(),"require_power":request.require_power,"require_communication":request.require_communication})
    rows, _ = evaluate(result, effective, None)
    def applies(row):
        key = row.constraint_id
        if key.startswith(("conservative_", "optimistic_")):
            return request.require_power
        if key in ("maximum_dte_interruption", "minimum_conditional_dte_access", "required_dte_margin"):
            return request.require_communication
        return True
    rows = tuple(row for row in rows if applies(row))
    # Known shortages in a supported prefix can fail a mandatory threshold even
    # when later unknown time correctly withholds full-mission totals.
    if request.require_power and result.power:
        mode = "conservative" if request.requirements.require_conservative_pass or not request.requirements.allow_optimistic_only else "optimistic"
        case = next((c for c in result.power.cases if c.assumption == mode), None)
        if case and case.totals.unmet_load_wh is None:
            known_unmet = sum(i.unmet_load_wh for i in case.potential_depletion_intervals)
            if known_unmet > request.requirements.maximum_unmet_load_wh + 1e-8:
                from lunascend.contracts.resilience import ConstraintResult
                rows = (*rows, ConstraintResult(constraint_id=mode+"_known_prefix_unmet_load", actual=known_unmet,
                    threshold=request.requirements.maximum_unmet_load_wh, units="Wh", status="fail",
                    explanation="Already-recorded unmet demand exceeds the limit before missing later evidence. This is a known-prefix lower bound, not a full-mission total.",
                    provenance_ids=tuple(p.id for p in result.provenance), limitations=LIMITS))
    states = {row.status for row in rows}
    if "fail" in states:
        classification = "does_not_meet_requirements"
    elif "indeterminate" in states or not rows:
        classification = "insufficient_data"
    elif (request.require_power and not request.requirements.require_conservative_pass and request.requirements.allow_optimistic_only
          or request.require_communication or request.requirements.minimum_sun_clearance_fraction is not None):
        classification = "conditional"
    else:
        classification = "meets_all_evaluated_mandatory_requirements"
    sources = tuple(p.id for p in result.provenance)
    interpretations = []
    def explain(topic, meaning, finding, consequence, action, limitation):
        interpretations.append(Interpretation(topic=topic, meaning=meaning, finding=finding, consequence=consequence,
            next_action=action, limitation=limitation, provenance_ids=sources))
    index = min(request.sample_index, max(0, len(result.observations or ())-1))
    obs = (result.observations or (None,))[index]
    terrain = result.terrain_visibility
    for body in ("sun", "earth"):
        angle = getattr(obs, body+"_elevation_deg").value if obs else None
        value = f"{abs(angle):.3f} degrees {'below' if angle < 0 else 'above'} the ideal horizon" if angle is not None else "Unavailable"
        row = terrain.observations[index] if terrain and index < len(terrain.observations) else None
        t = getattr(row, body) if row else None
        clearance = f"; local terrain clearance {t.clearance_deg:.3f} degrees, {t.classification}" if t and t.clearance_deg is not None else "; terrain clearance unavailable"
        if t and t.classification == 'modeled_obstruction':
            consequence = f"The selected {body.title()} center is blocked by the modeled terrain at this sample."
        elif t and t.classification == 'conditional_clearance':
            consequence = f"The {body.title()} center clears the sampled local skyline. Unresolved or more distant terrain could still obstruct it."
        else:
            consequence = "Local terrain visibility is unknown; the geometric angle alone cannot establish access."
        if body == 'earth':
            consequence += " Earth visibility does not establish a radio link."
        explain(body.title()+" direction", "Elevation is the angle above the ideal horizon; terrain clearance subtracts the modeled skyline.", value+clearance,
            consequence,
            "Compare another date or supported location; recalculate with the same hardware.",
            "Body centers only. Finite DEM horizons cannot prove globally unobstructed views; geometric elevation alone is insufficient.")
    p = result.power
    if p:
        for case in p.cases:
            total = case.totals
            def number(v): return "unavailable" if v is None else f"{v:.2f}"
            sample = case.samples[min(index,len(case.samples)-1)] if case.samples else None
            generation = sample.solar_generation_w if sample else None
            load = sample.load_w if sample else None
            comparison = "Sufficiency is unknown." if generation is None or load is None else "Generation is below the configured load; the battery must cover the difference." if generation < load else "Generation meets the configured instantaneous load; storage and losses still matter."
            explain(case.assumption.title()+" electricity", "Watts measure the present rate; watt-hours measure energy over time.",
                f"Selected sample: {number(generation)} W generation, {number(load)} W load. {comparison} Total: {number(total.solar_generated_wh)} Wh generated versus {number(total.electrical_demand_wh)} Wh demanded.",
                "A temporary power shortfall need not fail the mission; inspect the full battery and unmet-demand result.",
                "Test panel area, orientation or reduced demand, then recalculate.", "Configured efficiency, sample timing and illumination assumptions apply; no thermal or degradation model.")
            explain(case.assumption.title()+" battery", "Stored watt-hours supply equipment when generation is too small.",
                f"Minimum {number(total.minimum_battery_energy_wh)} Wh ({number(total.minimum_soc_pct)}%); final {number(total.final_battery_energy_wh)} Wh; unmet demand {number(total.unmet_load_wh)} Wh.",
                "Unmet demand means some configured equipment energy cannot be supplied. The model stops discharge at reserve; it does not simulate energy below reserve.",
                "Test more usable storage, lower demand, more generation or another date.",
                "Optimistic-only success is conditional, never guaranteed mission survival. Battery charging/discharging losses are included.")
    else:
        explain("Power and battery", "Hardware settings and terrain-supported illumination are required.", "Power analysis was not calculated.",
            "Energy sufficiency is unknown" if request.require_power else "Power is not a mandatory requirement in this assessment.",
            "Configure panels, battery and load, then request power analysis at a supported site.", "No fabricated zero or assumed survival.")
    c = result.communication
    explain("Direct-to-Earth access", "This is Earth-center terrain clearance, not radio signal strength.",
        f"Conditional access {c.earth_visibility_duration_s.value} s; longest supported interruption {c.longest_interruption_s.value} s; unknown {c.unknown_duration_s} s; required clearance {c.configuration.minimum_earth_clearance_deg} degrees." if c else "DTE engineering was not calculated.",
        "Required access is evaluated against the configured duration and clearance thresholds." if request.require_communication else "Communication is not a mandatory requirement in this assessment.",
        "Compare another date/site or revise the explicit access requirement and recalculate.", "No antenna, RF link budget, relay or guaranteed contact is modeled.")
    return MissionAssessment(classification=classification, constraints=rows, interpretations=tuple(interpretations), limitations=LIMITS)
