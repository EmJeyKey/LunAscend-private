// Consumed fields mirror backend/contracts; unimplemented products stay null here.
import type { PowerConfiguration, CommunicationConfiguration, EngineeringDraft, PowerAnalysis, CommunicationAnalysis } from './engineering'
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
  settings: { terrain_enabled: boolean; terrain_options?: { dataset_id: string; coordinate_epoch_utc: string; max_search_radius_m: number; radial_step_m: number; azimuth_samples: number } | null; power_enabled: boolean; communication_enabled: boolean; power_options?: PowerConfiguration | null; communication_options?: CommunicationConfiguration | null; horizon_mode: 'geometric_approximation' | 'terrain'; disk_policy: 'center'; correction_mode: 'NONE'; sun_clearance_deg: 0; earth_clearance_deg: 0 }
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
  horizon: TerrainHorizon | null; visibility_windows: TerrainWindow[] | null; terrain_visibility?: TerrainVisibility | null; power: PowerAnalysis | null; communication: CommunicationAnalysis | null; resilience: null
  availability?: Record<string,{code:string;reason:string}>
  provenance: DataProvenance[]; errors: AnalysisError[]; warnings: string[]
}
export interface AnalysisOptions {
  coverageNote?: {siteId:string;startUtc:string;reason:string}
  coordinateEpochUtc?: string
  providerMode: ProviderMode; surfaceElevationM: string; observerHeightM: string; sampleStepS: string; frameConfirmed: boolean
  terrainEnabled?: boolean; terrainRadiusM?: string; terrainAzimuthSamples?: string; terrainRadialStepM?: string; terrainDatasetId?: string
  powerEnabled?: boolean; communicationEnabled?: boolean; engineering?: EngineeringDraft
}
export type TerrainClassification = 'modeled_obstruction' | 'conditional_clearance' | 'indeterminate' | 'unavailable'
export interface TerrainBody { azimuth_deg: number | null; elevation_deg: number | null; horizon_elevation_deg: number | null; clearance_deg: number | null; classification: TerrainClassification; coverage: 'sampled_radius' | 'partial' | 'unknown'; reason: string }
export interface TerrainRow { time_utc: string; reference_frame: 'MOON_ME_DE421'; sun: TerrainBody; earth: TerrainBody; status: 'partial' | 'unavailable' }
export interface TerrainHorizon { reference_frame: string; terrain_source: string; azimuth_deg: number[]; elevation_deg: (number | null)[]; ray_coverage: string[]; global_horizon_complete: false; surface_elevation_m: number; observer_height_m: number; max_search_radius_m: number; azimuth_step_deg: number; radial_step_m: number; provenance_ids: string[]; obstruction_distance_m?: (number|null)[]; sampled_distance_m?: number[]; first_missing_distance_m?: (number|null)[] }
export interface TerrainWindow { target: 'sun' | 'earth' | 'joint'; classification: TerrainClassification; start_utc: string; end_utc: string; duration_s: number; resolution_s: number; method: 'sampled_support' | 'piecewise_linear_clearance'; start_censored: boolean; end_censored: boolean }
export interface TerrainObserverGeometry { time_utc:string; latitude_deg_de440:number; longitude_deg_de440:number; native_position_residual_m:number; de440_to_de421_matrix:number[][] }
export interface TerrainVisibility { observer_geometry?:TerrainObserverGeometry[]; model_version: 'terrain-center-visibility-v1'; validation_status: 'unvalidated'; disk_policy: 'center'; global_visibility_confirmed: false; dataset_id: string; surface_elevation_m: number; observer_height_m: number; observer_radius_m: number; native_latitude_deg: number; native_longitude_deg: number; max_search_radius_m: number; azimuth_step_deg: number; radial_step_m: number; observations: TerrainRow[]; transitions: {target: 'sun' | 'earth'; bracket_start_utc: string; bracket_end_utc: string; estimate_utc: string; resolution_s: number; method: 'piecewise_linear_clearance'}[]; provenance_ids: string[]; assumptions: string[] }
