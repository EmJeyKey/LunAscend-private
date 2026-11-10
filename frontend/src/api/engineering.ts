import type { ScenarioRequest } from '../types/analysis'

const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)
const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const nonnegative = (v: unknown): v is number => finite(v) && v >= 0
const utc = (v: unknown): v is string => typeof v === 'string' && /(Z|\+00:00)$/.test(v) && Number.isFinite(Date.parse(v))
const strings = (v: unknown): v is string[] => Array.isArray(v) && v.every(x => typeof x === 'string')
const matching = (a: unknown, b: unknown) => object(a) && object(b) && Object.entries(b).every(([k,v]) => a[k] === v)

export function engineeringProducts(v: Record<string, unknown>, request: ScenarioRequest, sources: Set<string>): boolean {
  const s = request.settings, power = v.power, communication = v.communication
  if (!object(v.request) || !object(v.request.settings)) return false
  const echoed = v.request.settings
  if (echoed.power_enabled !== s.power_enabled || echoed.communication_enabled !== s.communication_enabled) return false
  if (s.power_enabled && !matching(echoed.power_options, s.power_options) || s.communication_enabled && !matching(echoed.communication_options, s.communication_options)) return false
  if (['failed', 'unavailable'].includes(String(v.status))) return power === null && communication === null
  const span = (Date.parse(request.end_utc) - Date.parse(request.start_utc)) / 1000
  const product = (p: Record<string, unknown>) => strings(p.assumptions) && strings(p.provenance_ids) && p.provenance_ids.every(id => sources.has(id)) && ['partial', 'calculated'].includes(String(p.status))
  const coverage = (p: Record<string, unknown>) => nonnegative(p.coverage_fraction) && p.coverage_fraction <= 1 && nonnegative(p.covered_duration_s) && nonnegative(p.unknown_duration_s) && Math.abs(p.covered_duration_s + p.unknown_duration_s - span) < .002 && Math.abs(p.coverage_fraction - p.covered_duration_s / span) < 1e-9 && nonnegative(p.max_sample_step_s) && p.max_sample_step_s > 0
  if (s.power_enabled) {
    if (!object(power) || !product(power) || !matching(power.configuration, s.power_options) || !s.power_options || !Array.isArray(power.cases) || power.cases.length !== 2) return false
    const config = s.power_options
    for (let i = 0; i < 2; i++) {
      const c = power.cases[i]
      if (!object(c) || c.assumption !== (i ? 'optimistic' : 'conservative') || !coverage(c) || !strings(c.assumptions) || !['calculated', 'partial', 'unavailable'].includes(String(c.status)) || !object(c.totals) || !Array.isArray(c.samples) || !Array.isArray(c.potential_depletion_intervals)) return false
      const complete = Number(c.unknown_duration_s) < 1e-5 && Number(c.coverage_fraction) > 1 - 1e-9
      if (complete ? c.status !== 'calculated' || typeof c.passes_configured_model !== 'boolean' : c.passes_configured_model !== null) return false
      const totals = c.totals
      for (const key of ['solar_generated_wh', 'electrical_demand_wh', 'direct_solar_to_load_wh', 'battery_charged_wh', 'battery_discharged_wh', 'charging_loss_wh', 'discharging_loss_wh', 'curtailed_surplus_wh', 'final_battery_energy_wh', 'minimum_battery_energy_wh', 'minimum_soc_pct', 'unmet_load_wh']) {
        if (!(totals[key] === null && !complete && key !== 'electrical_demand_wh') && !nonnegative(totals[key])) return false
      }
      if (complete) {
        if (!finite(totals.energy_balance_residual_wh) || !finite(totals.final_battery_energy_wh) || totals.final_battery_energy_wh > config.battery_capacity_wh + 1e-7 || !finite(totals.minimum_soc_pct) || totals.minimum_soc_pct < config.minimum_soc_pct - 1e-7 || totals.minimum_soc_pct > 100) return false
        const initial = config.battery_capacity_wh * config.initial_soc_pct / 100
        const balance = initial + Number(totals.solar_generated_wh) - (Number(totals.electrical_demand_wh) - Number(totals.unmet_load_wh)) - totals.final_battery_energy_wh - Number(totals.charging_loss_wh) - Number(totals.discharging_loss_wh) - Number(totals.curtailed_surplus_wh)
        if (Math.abs(balance) > Math.max(1, initial + Number(totals.solar_generated_wh)) * 1e-8 || Math.abs(balance - totals.energy_balance_residual_wh) > 1e-6 || c.passes_configured_model !== (Number(totals.unmet_load_wh) <= 1e-8)) return false
      } else if (totals.final_battery_energy_wh !== null || totals.energy_balance_residual_wh !== null) return false
      if (c.samples.length < 2 || c.samples.length > 1003) return false
      let previous = -Infinity
      for (const row of c.samples) {
        if (!object(row) || !utc(row.time_utc) || Date.parse(row.time_utc) <= previous || Date.parse(row.time_utc) < Date.parse(request.start_utc) || Date.parse(row.time_utc) > Date.parse(request.end_utc) || !nonnegative(row.load_w) || typeof row.environmental_status !== 'string') return false
        previous = Date.parse(row.time_utc)
        if (row.solar_generation_w !== null && !nonnegative(row.solar_generation_w) || row.battery_energy_wh !== null && (!nonnegative(row.battery_energy_wh) || row.battery_energy_wh > config.battery_capacity_wh + 1e-7) || row.soc_pct !== null && (!nonnegative(row.soc_pct) || row.soc_pct > 100)) return false
        if ((row.soc_pct === null) !== (row.battery_energy_wh === null) || finite(row.soc_pct) && Math.abs(row.soc_pct - Number(row.battery_energy_wh) / config.battery_capacity_wh * 100) > 1e-6) return false
      }
      if (!object(c.samples[0]) || Date.parse(String(c.samples[0].time_utc)) !== Date.parse(request.start_utc) || previous !== Date.parse(request.end_utc)) return false
      for (const d of c.potential_depletion_intervals) if (!object(d) || !utc(d.start_utc) || !utc(d.end_utc) || Date.parse(d.end_utc) <= Date.parse(d.start_utc) || Date.parse(d.start_utc) < Date.parse(request.start_utc) || Date.parse(d.end_utc) > Date.parse(request.end_utc) || !nonnegative(d.unmet_load_wh) || d.unmet_load_wh <= 0 || d.method !== 'interval_containing_unmet_load') return false
    }
    const [a,b] = power.cases as Record<string, unknown>[]
    const expected = a.status === 'unavailable' && b.status === 'unavailable' ? 'unavailable' : a.passes_configured_model === null || b.passes_configured_model === null ? 'indeterminate' : a.passes_configured_model && b.passes_configured_model ? 'pass_both' : b.passes_configured_model ? 'pass_optimistic_only' : 'fail_both'
    if (power.outcome !== expected) return false
  } else if (power !== null) return false
  if (s.communication_enabled) {
    if (!object(communication) || !product(communication) || !coverage(communication) || !matching(communication.configuration, s.communication_options) || !s.communication_options || !Array.isArray(communication.access_samples) || !Array.isArray(communication.windows) || !object(communication.link_budget_db) || communication.link_budget_db.value !== null || communication.link_availability !== 'not_modeled') return false
    const labels = ['modeled_obstruction', 'below_clearance_requirement', 'conditional_access', 'indeterminate', 'unavailable']
    const observations = v.observations
    if (!Array.isArray(observations) || communication.access_samples.length !== observations.length) return false
    for (let i = 0; i < communication.access_samples.length; i++) {
      const r = communication.access_samples[i]
      if (!object(r) || !object(observations[i]) || r.time_utc !== observations[i].time_utc || !labels.includes(String(r.classification)) || typeof r.terrain_classification !== 'string' || typeof r.coverage !== 'string' || r.earth_clearance_deg !== null && !finite(r.earth_clearance_deg)) return false
      if (r.classification === 'conditional_access' && (r.terrain_classification !== 'conditional_clearance' || !finite(r.earth_clearance_deg) || r.earth_clearance_deg < s.communication_options.minimum_earth_clearance_deg)) return false
      if (r.classification === 'below_clearance_requirement' && (r.terrain_classification !== 'conditional_clearance' || !finite(r.earth_clearance_deg) || r.earth_clearance_deg >= s.communication_options.minimum_earth_clearance_deg)) return false
      if (r.classification === 'modeled_obstruction' && r.terrain_classification !== 'modeled_obstruction') return false
    }
    let end = Date.parse(request.start_utc)
    for (const w of communication.windows) {
      if (!object(w) || w.target !== 'earth' || !labels.includes(String(w.classification)) || w.method !== 'left_sample_hold' || !utc(w.start_utc) || !utc(w.end_utc) || Date.parse(w.start_utc) !== end || Date.parse(w.end_utc) <= end || Date.parse(w.end_utc) > Date.parse(request.end_utc) || !nonnegative(w.duration_s) || Math.abs(w.duration_s - (Date.parse(w.end_utc) - end) / 1000) > .002 || !nonnegative(w.resolution_s) || w.resolution_s <= 0) return false
      end = Date.parse(w.end_utc)
    }
    if (end !== Date.parse(request.end_utc)) return false
    for (const key of ['earth_visibility_duration_s', 'longest_interruption_s']) if (!object(communication[key]) || communication[key].value !== null && (!nonnegative(communication[key].value) || communication[key].value > span + .002)) return false
  } else if (communication !== null) return false
  return true
}
