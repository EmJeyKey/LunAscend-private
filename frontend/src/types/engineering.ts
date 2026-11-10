export interface PowerConfiguration {
  panel_area_m2: number; panel_efficiency: number; solar_irradiance_w_m2: number; orientation_mode: 'fixed_horizontal' | 'ideal_sun_tracking'
  system_efficiency: number; derating_factor: number; baseline_load_w: number; heater_load_w: number; battery_capacity_wh: number
  initial_soc_pct: number; minimum_soc_pct: number; charging_efficiency: number; discharging_efficiency: number
}
export interface CommunicationConfiguration { minimum_earth_clearance_deg: number }
export type EngineeringDraft = { [K in keyof PowerConfiguration]: string } & { minimum_earth_clearance_deg: string }
export interface EnergyTotals {
  solar_generated_wh: number | null; electrical_demand_wh: number; direct_solar_to_load_wh: number | null; battery_charged_wh: number | null
  battery_discharged_wh: number | null; charging_loss_wh: number | null; discharging_loss_wh: number | null; curtailed_surplus_wh: number | null
  final_battery_energy_wh: number | null; minimum_battery_energy_wh: number | null; minimum_soc_pct: number | null; unmet_load_wh: number | null; energy_balance_residual_wh: number | null
}
export interface BatterySample { time_utc: string; solar_generation_w: number | null; load_w: number; battery_energy_wh: number | null; soc_pct: number | null; environmental_status: string }
export interface EnergyCase { assumption: 'conservative' | 'optimistic'; status: 'calculated' | 'partial' | 'unavailable'; passes_configured_model: boolean | null; coverage_fraction: number; covered_duration_s: number; unknown_duration_s: number; max_sample_step_s: number | null; totals: EnergyTotals; samples: BatterySample[]; potential_depletion_intervals: { start_utc: string; end_utc: string; unmet_load_wh: number; method: 'interval_containing_unmet_load' }[]; assumptions: string[] }
export interface PowerAnalysis { configuration: PowerConfiguration; outcome: 'pass_both' | 'pass_optimistic_only' | 'fail_both' | 'indeterminate' | 'unavailable'; cases: EnergyCase[]; assumptions: string[]; provenance_ids: string[] }
export type AccessClassification = 'modeled_obstruction' | 'below_clearance_requirement' | 'conditional_access' | 'indeterminate' | 'unavailable'
export interface AccessWindow { target: 'earth'; classification: AccessClassification; start_utc: string; end_utc: string; duration_s: number; resolution_s: number; method: 'left_sample_hold'; start_censored: boolean; end_censored: boolean }
export interface CommunicationAnalysis { configuration: CommunicationConfiguration; coverage_fraction: number; covered_duration_s: number; unknown_duration_s: number; max_sample_step_s: number | null; earth_visibility_duration_s: {value: number | null}; longest_interruption_s: {value: number | null}; access_samples: {time_utc: string; earth_clearance_deg: number | null; classification: AccessClassification; terrain_classification: string; coverage: string}[]; windows: AccessWindow[]; link_budget_db: {value: null}; link_availability: 'not_modeled'; assumptions: string[]; provenance_ids: string[] }
