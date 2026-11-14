import type { ScenarioRequest, ScenarioResult } from './analysis'
export type OpportunityClass = 'meets_tested_requirements' | 'conditionally_promising' | 'fails_modeled_requirement' | 'insufficient_evidence'
export interface MissionConstraints {
  minimum_sun_clearance_fraction?:number|null;maximum_slope_deg?:number|null
  maximum_unmet_load_wh: number; minimum_soc_pct: number; require_conservative_pass: boolean; allow_optimistic_only: boolean
  minimum_earth_clearance_deg: number; maximum_dte_interruption_s: number; minimum_dte_access_s: number
  required_duration_s: number | null; allowed_site_ids: string[]; maximum_distance_m: number | null
}
export interface OpportunityRequest { baseline: ScenarioRequest; earliest_utc: string; latest_utc: string; step_hours: number; sites: ScenarioRequest['site'][]; constraints: MissionConstraints }
export interface ComparedMetric { units: string; baseline: number | null; candidate: number | null; delta: number | null }
export interface Opportunity {
  request_id: string; request: ScenarioRequest | null; site: ScenarioRequest['site']; start_utc: string; result: ScenarioResult | null; errors: string[]
  date_shift_s: number; distance_from_baseline_m: number | null; classification: OpportunityClass
  constraints: { constraint_id: string; threshold: number; actual: number | null; units: string; status: 'pass' | 'fail' | 'indeterminate'; explanation: string; provenance_ids: string[]; limitations: string[] }[]
  differences: Record<string, ComparedMetric>; explanations: string[]
}
export interface OpportunityResponse {
  model_version: 'mission-resilience-v1'; baseline: ScenarioResult; opportunities: Opportunity[]; completed: number; failed: number; indeterminate: number
  cancelled: boolean; elapsed_s: number; cache_hits: number; horizon_reuses: number; limitations: string[]
}
