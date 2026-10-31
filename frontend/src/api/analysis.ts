import type { AnalysisError, DataProvenance, Metric, ProviderMode, ScenarioRequest, ScenarioResult } from '../types/analysis'

export class AnalysisFailure extends Error {
  constructor(message: string, public readonly errors: AnalysisError[] = []) { super(message) }
}
function object(value: unknown): value is Record<string, unknown> { return !!value && typeof value === 'object' && !Array.isArray(value) }
function strings(value: unknown): value is string[] { return Array.isArray(value) && value.every(v => typeof v === 'string') }
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)
const validation = (v: unknown) => ['mock', 'unvalidated', 'reference_compared', 'validated'].includes(String(v))
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
  if (['horizon', 'visibility_windows', 'power', 'communication', 'resilience'].some(key => v[key] !== null)) throw invalid()
  const sources = new Set(v.provenance.map(source => (source as DataProvenance).id))
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

export interface AnalysisState { status: 'idle' | 'loading' | 'success' | 'error'; result: ScenarioResult | null; message: string }
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
      if (version === this.version) this.publish({ status: 'error', result: null, message: error instanceof Error ? error.message : 'Analysis failed.' })
    }
  }
}
