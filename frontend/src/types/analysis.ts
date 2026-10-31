// Consumed fields mirror backend/contracts; unimplemented products stay null here.
export type ProviderMode = 'mock' | 'scientific'
export type ValidationStatus = 'mock' | 'unvalidated' | 'reference_compared' | 'validated'
export interface Metric {
  value: number | null
  status: 'available' | 'unavailable' | 'not_requested' | 'partial'
  reason: string | null
  provenance_ids: string[]
  validation: ValidationStatus
  validation_report_id: string | null
}
export interface CoordinateReference {
  body: 'MOON'; latitude_type: 'planetocentric'; longitude_convention: 'east_positive'
  frame_id: string; frame_realization: string; reference_surface: string; reference_radius_m: number | null
}
export interface ScenarioRequest {
  schema_version: '1.0'
  site: { site_id: string; name: string; latitude_deg: number; longitude_deg: number; surface_elevation_m: number | null; observer_height_m: number; coordinate_reference: CoordinateReference }
  provider_mode: ProviderMode; start_utc: string; end_utc: string; sample_step_s: number
  settings: { terrain_enabled: false; power_enabled: false; communication_enabled: false; horizon_mode: 'geometric_approximation'; disk_policy: 'center'; correction_mode: 'NONE'; sun_clearance_deg: 0; earth_clearance_deg: 0 }
}
export interface EphemerisObservation {
  time_utc: string; reference_frame: string; correction_mode: 'NONE'
  status: 'illustrative' | 'calculated' | 'partial' | 'unavailable' | 'not_requested'
  sun_azimuth_deg: Metric; sun_elevation_deg: Metric; earth_azimuth_deg: Metric; earth_elevation_deg: Metric
  provenance_ids: string[]; assumptions: string[]
}
export interface DataProvenance {
  id: string; provider_name: string; provider_mode: ProviderMode; data_source: string
  source_version: string | null; calculation_method: string; reference_frame: string | null
  validation_status: ValidationStatus; validation_report_id: string | null
  assumptions: string[]; source_url: string | null; sha256: string | null; terrain_dataset: string | null
}
export interface AnalysisError { code: string; message: string; module: string | null; field: string | null; recoverable: boolean; details: Record<string, string> }
export interface ScenarioResult {
  schema_version: '1.0'; scenario_id: string; request: ScenarioRequest; provider_mode: ProviderMode; model_version: string
  status: 'complete' | 'partial' | 'failed' | 'unavailable'; observations: EphemerisObservation[] | null
  horizon: null; visibility_windows: null; power: null; communication: null; resilience: null
  provenance: DataProvenance[]; errors: AnalysisError[]; warnings: string[]
}
export interface AnalysisOptions {
  providerMode: ProviderMode; surfaceElevationM: string; observerHeightM: string; sampleStepS: string; frameConfirmed: boolean
}
