import type { AnalysisError, DataProvenance, Metric, ProviderMode, ScenarioRequest, ScenarioResult } from '../types/analysis'
import { engineeringProducts } from './engineering'

export class AnalysisFailure extends Error {
  constructor(message: string, public readonly errors: AnalysisError[] = []) { super(message) }
}
function object(value: unknown): value is Record<string, unknown> { return !!value && typeof value === 'object' && !Array.isArray(value) }
function strings(value: unknown): value is string[] { return Array.isArray(value) && value.every(v => typeof v === 'string') }
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)
const validation = (v: unknown) => ['mock', 'unvalidated', 'reference_compared', 'validated'].includes(String(v))
const classification = (v: unknown) => ['modeled_obstruction', 'conditional_clearance', 'indeterminate', 'unavailable'].includes(String(v))
const utc = (v: unknown) => typeof v === 'string' && /(Z|\+00:00)$/.test(v) && Number.isFinite(Date.parse(v))
function terrainProducts(v: Record<string, unknown>, request: ScenarioRequest, sources: Set<string>): boolean {
  const t = v.terrain_visibility, h = v.horizon, rows = v.observations
  if (!request.settings.terrain_enabled) return (t === null || t === undefined) && h === null && v.visibility_windows === null
  if (['failed', 'unavailable'].includes(String(v.status))) return t === null && h === null && v.visibility_windows === null
  const options = request.settings.terrain_options
  if (request.provider_mode !== 'scientific' || !options || !object(t) || !object(h) || !Array.isArray(rows)
    || t.model_version !== 'terrain-center-visibility-v1' || t.validation_status !== 'unvalidated' || t.disk_policy !== 'center' || t.global_visibility_confirmed !== false
    || t.dataset_id !== options.dataset_id || t.max_search_radius_m !== options.max_search_radius_m || t.radial_step_m !== options.radial_step_m
    || t.azimuth_step_deg !== 360 / options.azimuth_samples || t.observer_height_m !== request.site.observer_height_m
    || !finite(t.surface_elevation_m) || !finite(t.observer_radius_m) || Math.abs(t.observer_radius_m - (1737400 + t.surface_elevation_m + t.observer_height_m)) > 1e-6
    || !finite(t.native_latitude_deg) || Math.abs(t.native_latitude_deg) >= 90 || !finite(t.native_longitude_deg) || t.native_longitude_deg < -180 || t.native_longitude_deg >= 180
    || !strings(t.assumptions) || !strings(t.provenance_ids) || !t.provenance_ids.every(id => sources.has(id))
    || h.reference_frame !== 'MOON_ME_DE421' || h.terrain_source !== t.dataset_id || h.global_horizon_complete !== false
    || h.surface_elevation_m !== t.surface_elevation_m || h.observer_height_m !== t.observer_height_m || h.max_search_radius_m !== t.max_search_radius_m
    || h.radial_step_m !== t.radial_step_m || h.azimuth_step_deg !== t.azimuth_step_deg
    || !Array.isArray(h.azimuth_deg) || h.azimuth_deg.length !== options.azimuth_samples || !Array.isArray(h.elevation_deg) || h.elevation_deg.length !== h.azimuth_deg.length
    || !strings(h.ray_coverage) || h.ray_coverage.length !== h.azimuth_deg.length || !strings(h.provenance_ids) || !h.provenance_ids.every(id => sources.has(id))) return false
  for (let i = 0; i < h.azimuth_deg.length; i++) {
    if (!finite(h.azimuth_deg[i]) || Math.abs(h.azimuth_deg[i] - i * 360 / options.azimuth_samples) > 1e-9
      || (h.elevation_deg[i] !== null && (!finite(h.elevation_deg[i]) || Math.abs(h.elevation_deg[i]) > 90))
      || !['sampled_radius', 'boundary', 'nodata', 'boundary_and_nodata', 'unknown'].includes(h.ray_coverage[i])) return false
  }
  if (!Array.isArray(t.observations) || t.observations.length !== rows.length || rows.length > 1001 || !Array.isArray(t.transitions) || !Array.isArray(v.visibility_windows)) return false
  for (let i = 0; i < rows.length; i++) {
    const r = t.observations[i]
    if (!object(r) || !object(rows[i]) || r.time_utc !== rows[i].time_utc || r.reference_frame !== 'MOON_ME_DE421' || !['partial', 'unavailable'].includes(String(r.status))) return false
    for (const body of ['sun', 'earth']) {
      const b = r[body]
      if (!object(b) || !classification(b.classification) || !['sampled_radius', 'partial', 'unknown'].includes(String(b.coverage)) || typeof b.reason !== 'string') return false
      for (const key of ['azimuth_deg', 'elevation_deg', 'horizon_elevation_deg', 'clearance_deg']) if (b[key] !== null && !finite(b[key])) return false
      if (finite(b.azimuth_deg) && (b.azimuth_deg < 0 || b.azimuth_deg >= 360) || finite(b.elevation_deg) && Math.abs(b.elevation_deg) > 90 || finite(b.horizon_elevation_deg) && Math.abs(b.horizon_elevation_deg) > 90) return false
      if (b.clearance_deg !== null && (!finite(b.elevation_deg) || !finite(b.horizon_elevation_deg) || Math.abs(Number(b.clearance_deg) - (b.elevation_deg - b.horizon_elevation_deg)) > 1e-8)) return false
      if (b.classification === 'conditional_clearance' && (b.coverage !== 'sampled_radius' || !finite(b.clearance_deg) || b.clearance_deg <= 0)) return false
      if (b.classification === 'modeled_obstruction' && (!finite(b.clearance_deg) || b.clearance_deg >= 0)) return false
      if (b.classification === 'unavailable' && (b.clearance_deg !== null || b.horizon_elevation_deg !== null)) return false
    }
  }
  if (t.observer_geometry !== undefined) {
    if (!Array.isArray(t.observer_geometry) || t.observer_geometry.length !== rows.length) return false
    for (let i=0;i<t.observer_geometry.length;i++) {
      const g=t.observer_geometry[i]
      if (!object(g) || !object(rows[i]) || !utc(g.time_utc) || Date.parse(String(g.time_utc))!==Date.parse(String(rows[i].time_utc)) || !finite(g.latitude_deg_de440) || Math.abs(g.latitude_deg_de440)>90
        || !finite(g.longitude_deg_de440) || g.longitude_deg_de440< -180 || g.longitude_deg_de440>=180
        || !finite(g.native_position_residual_m) || g.native_position_residual_m<0 || g.native_position_residual_m>1e-6
        || !Array.isArray(g.de440_to_de421_matrix) || g.de440_to_de421_matrix.length!==3
        || g.de440_to_de421_matrix.some((row:unknown)=>!Array.isArray(row)||row.length!==3||!row.every(finite))) return false
    }
  }
  for (const w of v.visibility_windows) {
    if (!object(w) || !['sun', 'earth', 'joint'].includes(String(w.target)) || !classification(w.classification)
      || !utc(w.start_utc) || !utc(w.end_utc) || Date.parse(String(w.start_utc)) < Date.parse(request.start_utc) || Date.parse(String(w.end_utc)) > Date.parse(request.end_utc)
      || Date.parse(String(w.end_utc)) <= Date.parse(String(w.start_utc)) || !finite(w.resolution_s) || w.resolution_s <= 0
      || !finite(w.duration_s) || Math.abs(w.duration_s - (Date.parse(String(w.end_utc)) - Date.parse(String(w.start_utc))) / 1000) > .002
      || !['sampled_support', 'piecewise_linear_clearance'].includes(String(w.method)) || typeof w.start_censored !== 'boolean' || typeof w.end_censored !== 'boolean') return false
  }
  for (const transition of t.transitions) {
    if (!object(transition) || !['sun', 'earth'].includes(String(transition.target)) || transition.method !== 'piecewise_linear_clearance'
      || !utc(transition.bracket_start_utc) || !utc(transition.bracket_end_utc) || !utc(transition.estimate_utc) || !finite(transition.resolution_s) || transition.resolution_s <= 0
      || !(Date.parse(String(transition.bracket_start_utc)) < Date.parse(String(transition.estimate_utc)) && Date.parse(String(transition.estimate_utc)) < Date.parse(String(transition.bracket_end_utc)))) return false
  }
  return true
}
function metric(v: unknown, azimuth: boolean, mode: ProviderMode): v is Metric {
  if (!object(v) || !strings(v.provenance_ids) || !validation(v.validation) || (mode === 'mock' ? v.validation !== 'mock' : v.validation === 'mock')) return false
  if (v.reason !== null && typeof v.reason !== 'string') return false
  if (v.validation_report_id !== null && typeof v.validation_report_id !== 'string') return false
  if (['reference_compared', 'validated'].includes(String(v.validation)) && !v.validation_report_id) return false
  if (v.value === null) return v.status === 'unavailable' || v.status === 'not_requested'
  return finite(v.value) && (v.status === 'available' || v.status === 'partial') && (azimuth ? v.value >= 0 && v.value < 360 : v.value >= -90 && v.value <= 90)
}
export function parseErrors(v: unknown): AnalysisError[] {
  if (!object(v) || !Array.isArray(v.errors)) return []
  return v.errors.filter((e): e is AnalysisError => object(e) && typeof e.code === 'string' && typeof e.message === 'string')
}
export function parseResult(v: unknown, request: ScenarioRequest): ScenarioResult {
  const invalid = () => new AnalysisFailure('The backend returned an incompatible analysis response. No observations were accepted.')
  if (!object(v) || v.schema_version !== '1.0' || typeof v.scenario_id !== 'string' || typeof v.model_version !== 'string'
    || v.provider_mode !== request.provider_mode || !object(v.request) || v.request.provider_mode !== request.provider_mode
    || !['complete', 'partial', 'failed', 'unavailable'].includes(String(v.status)) || !strings(v.warnings)
    || !Array.isArray(v.errors) || !Array.isArray(v.provenance) || !v.provenance.length) throw invalid()
  // Validate the echoed identity at the presentation boundary, accepting UTC spelling/longitude normalization.
  const echoed = v.request
  if (!object(echoed.settings) || echoed.settings.terrain_enabled !== request.settings.terrain_enabled) throw invalid()
  if (request.settings.terrain_enabled) {
    const actual = echoed.settings.terrain_options, expected = request.settings.terrain_options
    if (!object(actual) || !expected || actual.dataset_id !== expected.dataset_id || actual.max_search_radius_m !== expected.max_search_radius_m
      || actual.radial_step_m !== expected.radial_step_m || actual.azimuth_samples !== expected.azimuth_samples
      || Date.parse(String(actual.coordinate_epoch_utc)) !== Date.parse(expected.coordinate_epoch_utc)) throw invalid()
  }
  if (!object(echoed.site) || Date.parse(String(echoed.start_utc)) !== Date.parse(request.start_utc)
    || Date.parse(String(echoed.end_utc)) !== Date.parse(request.end_utc) || echoed.sample_step_s !== request.sample_step_s
    || echoed.site.site_id !== request.site.site_id || echoed.site.latitude_deg !== request.site.latitude_deg
    || Math.abs(Number(echoed.site.longitude_deg) - request.site.longitude_deg) > 1e-10
    || echoed.site.surface_elevation_m !== request.site.surface_elevation_m || echoed.site.observer_height_m !== request.site.observer_height_m
    || !object(echoed.site.coordinate_reference) || echoed.site.coordinate_reference.frame_id !== request.site.coordinate_reference.frame_id) throw invalid()
  for (const source of v.provenance) {
    if (!object(source) || typeof source.id !== 'string' || typeof source.provider_name !== 'string' || source.provider_mode !== request.provider_mode
      || typeof source.data_source !== 'string' || typeof source.calculation_method !== 'string' || !strings(source.assumptions)
      || !validation(source.validation_status) || (request.provider_mode === 'mock' ? source.validation_status !== 'mock' : source.validation_status === 'mock')) throw invalid()
    for (const key of ['source_version', 'reference_frame', 'validation_report_id', 'source_url', 'sha256', 'terrain_dataset']) if (source[key] !== null && typeof source[key] !== 'string') throw invalid()
  }
  if (v.resilience !== null) throw invalid()
  const sources = new Set(v.provenance.map(source => (source as DataProvenance).id))
  if (!terrainProducts(v, request, sources)) throw invalid()
  if (!engineeringProducts(v, request, sources)) throw invalid()
  if (v.observations !== null && !Array.isArray(v.observations)) throw invalid()
  let previous = -Infinity
  for (const row of (v.observations || []) as unknown[]) {
    if (!object(row) || typeof row.time_utc !== 'string' || !/(Z|\+00:00)$/.test(row.time_utc) || !Number.isFinite(Date.parse(row.time_utc))
      || Date.parse(row.time_utc) <= previous || Date.parse(row.time_utc) < Date.parse(request.start_utc) || Date.parse(row.time_utc) > Date.parse(request.end_utc)
      || typeof row.reference_frame !== 'string' || row.correction_mode !== 'NONE' || !strings(row.assumptions) || !strings(row.provenance_ids)
      || !row.provenance_ids.every(id => sources.has(id)) || !['illustrative', 'calculated', 'partial', 'unavailable', 'not_requested'].includes(String(row.status))
      || (request.provider_mode === 'mock' ? row.status !== 'illustrative' : row.status === 'illustrative')) throw invalid()
    previous = Date.parse(row.time_utc)
    for (const key of ['sun_azimuth_deg', 'sun_elevation_deg', 'earth_azimuth_deg', 'earth_elevation_deg']) {
      if (!metric(row[key], key.includes('azimuth'), request.provider_mode) || !(row[key] as Metric).provenance_ids.every(id => sources.has(id))) throw invalid()
    }
  }
  if (['failed', 'unavailable'].includes(String(v.status))) {
    if (v.observations !== null || !parseErrors(v).length) throw invalid()
  } else if (!Array.isArray(v.observations) || v.observations.length > 10001 || !v.observations.length) throw invalid()
  return v as unknown as ScenarioResult
}

export async function requestAnalysis(request: ScenarioRequest, signal: AbortSignal, fetcher: typeof fetch = fetch, base = import.meta.env.VITE_API_BASE_URL || '/backend'): Promise<ScenarioResult> {
  let response: Response
  try {
    response = await fetcher(`${base.replace(/\/$/, '')}/api/v1/scenarios/analyze`, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(request), signal: AbortSignal.any([signal, AbortSignal.timeout(120000)]) })
  } catch {
    if (signal.aborted) throw new AnalysisFailure('Analysis cancelled.')
    throw new AnalysisFailure('Cannot reach the backend, the connection was interrupted, or analysis timed out. Check the local backend and retry.')
  }
  let value: unknown
  try { value = await response.json() } catch { throw new AnalysisFailure(`Backend is unavailable or returned an unreadable response (HTTP ${response.status}). Check the local backend and retry.`) }
  const errors = parseErrors(value)
  if (!response.ok) throw new AnalysisFailure(errors.length ? errors.map(e => `${e.code}: ${e.message}`).join(' ') : `Backend request failed (HTTP ${response.status}).`, errors)
  const result = parseResult(value, request)
  if (result.status === 'failed' || result.status === 'unavailable') throw new AnalysisFailure(result.errors.map(e => e.message).join(' '), result.errors)
  return result
}

export interface AnalysisState { status: 'idle' | 'loading' | 'success' | 'error'; result: ScenarioResult | null; message: string; errors?: AnalysisError[] }
export const emptyAnalysis: AnalysisState = { status: 'idle', result: null, message: '' }
// Shared by React and tests: cancelling invalidates even fetchers that ignore AbortSignal.
export class AnalysisRunner {
  private version = 0
  private controller: AbortController | null = null
  constructor(private publish: (state: AnalysisState) => void, private transport = requestAnalysis) {}
  clear() { ++this.version; this.controller?.abort(); this.publish(emptyAnalysis) }
  async run(request: ScenarioRequest) {
    const version = ++this.version
    this.controller?.abort()
    this.controller = new AbortController()
    this.publish({ status: 'loading', result: null, message: '' })
    try {
      const result = await this.transport(request, this.controller.signal)
      if (version === this.version) this.publish({ status: 'success', result, message: '' })
    } catch (error) {
      if (version === this.version) this.publish({ status: 'error', result: null, message: error instanceof Error ? error.message : 'Analysis failed.', ...(error instanceof AnalysisFailure ? {errors:error.errors} : {}) })
    }
  }
}
