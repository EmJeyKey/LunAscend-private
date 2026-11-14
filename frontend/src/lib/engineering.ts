import type { AnalysisOptions } from '../types/analysis'
import type { EngineeringDraft, PowerConfiguration } from '../types/engineering'

export const initialEngineering: EngineeringDraft = {
  panel_area_m2: '2', panel_efficiency: '0.25', solar_irradiance_w_m2: '1361', orientation_mode: 'fixed_horizontal',
  system_efficiency: '0.9', derating_factor: '1', baseline_load_w: '50', heater_load_w: '0', battery_capacity_wh: '500',
  initial_soc_pct: '100', minimum_soc_pct: '10', charging_efficiency: '0.95', discharging_efficiency: '0.95', minimum_earth_clearance_deg: '1',
}
// Explicit UI action only. Keep the user's hardware and frame confirmation;
// never select a provider, coordinate, date or new assumption silently.
export function fullAnalysisOptions(options:AnalysisOptions):AnalysisOptions {
  if(options.providerMode!=='scientific')throw new Error('Full analysis requires Scientific SPICE. No mock values are substituted.')
  return {...options,terrainEnabled:true,powerEnabled:true,communicationEnabled:true,engineering:{...(options.engineering||initialEngineering)}}
}
export function engineeringSettings(options: AnalysisOptions) {
  const power = !!options.powerEnabled, communication = !!options.communicationEnabled
  if ((power || communication) && (options.providerMode !== 'scientific' || !options.terrainEnabled)) throw new Error('Engineering requires explicit Scientific SPICE and terrain analysis; no mock hardware fallback.')
  const draft = options.engineering || initialEngineering
  const numeric = (key: keyof EngineeringDraft, min: number, max: number, open = false) => {
    const v = Number(draft[key])
    if (!draft[key].trim() || !Number.isFinite(v) || (open ? v <= min : v < min) || v > max) throw new Error(`Invalid engineering parameter ${key}: ${open ? 'greater than' : 'at least'} ${min}, no more than ${max}.`)
    return v
  }
  let power_options: PowerConfiguration | undefined
  if (power) {
    if (!['fixed_horizontal', 'ideal_sun_tracking'].includes(draft.orientation_mode)) throw new Error('Choose a supported panel orientation mode.')
    power_options = { panel_area_m2: numeric('panel_area_m2', 0, 1e6), panel_efficiency: numeric('panel_efficiency', 0, 1), solar_irradiance_w_m2: numeric('solar_irradiance_w_m2', 0, 10000), orientation_mode: draft.orientation_mode as PowerConfiguration['orientation_mode'], system_efficiency: numeric('system_efficiency', 0, 1), derating_factor: numeric('derating_factor', 0, 1), baseline_load_w: numeric('baseline_load_w', 0, 1e9), heater_load_w: numeric('heater_load_w', 0, 1e9), battery_capacity_wh: numeric('battery_capacity_wh', 0, 1e12, true), initial_soc_pct: numeric('initial_soc_pct', 0, 100), minimum_soc_pct: numeric('minimum_soc_pct', 0, 100), charging_efficiency: numeric('charging_efficiency', 0, 1, true), discharging_efficiency: numeric('discharging_efficiency', 0, 1, true) }
    if (power_options.initial_soc_pct < power_options.minimum_soc_pct) throw new Error('Initial battery charge must be at least the minimum permitted charge.')
  }
  return { power_enabled: power, communication_enabled: communication, ...(power_options ? {power_options} : {}), ...(communication ? {communication_options: {minimum_earth_clearance_deg: numeric('minimum_earth_clearance_deg', 0, 90)}} : {}) }
}
export const outcomeLabels = { pass_both: 'Passes configured energy model under both tested assumptions', pass_optimistic_only: 'Passes only under the optimistic illumination assumption', fail_both: 'Fails configured energy model under both tested assumptions', indeterminate: 'Indeterminate — incomplete environmental support', unavailable: 'Engineering analysis unavailable' }
export const accessLabels = { modeled_obstruction: 'Earth center blocked by modeled terrain', below_clearance_requirement: 'Below equipment clearance requirement', conditional_access: 'Conditional DTE access', indeterminate: 'Indeterminate terrain', unavailable: 'Unavailable' }
export const engineeringNumber = (value: number | null | undefined) => value === null || value === undefined ? 'Unavailable' : value.toFixed(2)
