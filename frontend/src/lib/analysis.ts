import type { AnalysisOptions, EphemerisObservation, Metric, ScenarioRequest } from '../types/analysis'
import type { MissionSelection } from '../types/preview'

export const scientificFrame = 'MOON_ME_DE440_ME421'
export const initialOptions: AnalysisOptions = { providerMode: 'scientific', surfaceElevationM: '', observerHeightM: '0', sampleStepS: '3600', frameConfirmed: false }

export function buildRequest(mission: MissionSelection, options: AnalysisOptions): ScenarioRequest {
  const { latitude, longitude, name, id } = mission.site
  if (!name.trim() || name.length > 500 || !id.trim() || id.length > 500) throw new Error('Enter a site name and identifier (1–500 characters).')
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude >= 180) throw new Error('Latitude must be −90 to +90; east-positive longitude must be −180 to less than +180 degrees.')
  const start = Date.parse(mission.startUtc)
  if (!/Z$/.test(mission.startUtc) || !Number.isFinite(start)) throw new Error('Enter a valid UTC date and time.')
  if (!Number.isFinite(mission.durationHours) || mission.durationHours <= 0 || mission.durationHours > 366 * 24) throw new Error('Analysis duration must be positive and no more than 366 days.')
  const step = Number(options.sampleStepS)
  if (!options.sampleStepS.trim() || !Number.isFinite(step) || step < .001) throw new Error('Sample step must be at least 0.001 seconds.')
  if (Math.ceil(mission.durationHours * 3600 / step) + 1 > 10001) throw new Error('Request exceeds 10001 samples. Increase the sample step or shorten the duration.')
  const elevation = options.surfaceElevationM.trim() === '' ? null : Number(options.surfaceElevationM)
  const height = Number(options.observerHeightM)
  if (elevation !== null && !Number.isFinite(elevation) || !options.observerHeightM.trim() || !Number.isFinite(height) || height < 0) throw new Error('Enter a finite surface elevation and a non-negative observer height.')
  if (options.providerMode === 'scientific' && (elevation === null || !options.frameConfirmed)) throw new Error('Scientific analysis requires an explicit sphere-relative elevation and confirmation of the DE440/ME421 coordinate frame.')
  if (elevation !== null && 1737400 + elevation + height <= 0) throw new Error('The observer must have a positive radius above the lunar center.')
  return {
    schema_version: '1.0', provider_mode: options.providerMode,
    start_utc: new Date(start).toISOString(), end_utc: new Date(start + mission.durationHours * 3600000).toISOString(), sample_step_s: step,
    site: { site_id: id, name, latitude_deg: latitude, longitude_deg: longitude, surface_elevation_m: elevation, observer_height_m: height,
      coordinate_reference: { body: 'MOON', latitude_type: 'planetocentric', longitude_convention: 'east_positive',
        frame_id: options.providerMode === 'scientific' ? scientificFrame : 'MOCK_SITE_INPUT',
        frame_realization: options.providerMode === 'scientific' ? 'DE440/ME421' : 'synthetic-only',
        reference_surface: options.providerMode === 'scientific' ? 'MOON_SPHERE_1737400_M' : 'synthetic demonstration surface',
        reference_radius_m: options.providerMode === 'scientific' ? 1737400 : null } },
    settings: { terrain_enabled: false, power_enabled: false, communication_enabled: false, horizon_mode: 'geometric_approximation', disk_policy: 'center', correction_mode: 'NONE', sun_clearance_deg: 0, earth_clearance_deg: 0 },
  }
}

export function formatAngle(metric: Metric | undefined, signed = false): string {
  if (!metric || metric.value === null) return 'Unavailable'
  return `${signed && metric.value >= 0 ? '+' : ''}${metric.value.toFixed(3)}°`
}
export function observationAt(series: EphemerisObservation[], index: number) {
  return series.length ? series[Math.max(0, Math.min(series.length - 1, Math.trunc(index)))] : undefined
}
export function chartData(series: EphemerisObservation[]) {
  return series.map(row => ({ utc: row.time_utc, time: Date.parse(row.time_utc), sun: row.sun_elevation_deg.value, earth: row.earth_elevation_deg.value }))
}
export function linePath(data: ReturnType<typeof chartData>, key: 'sun' | 'earth', x: (time: number) => number, y: (value: number) => number) {
  let drawing = false
  return data.map(row => {
    if (row[key] === null) { drawing = false; return '' }
    const part = `${drawing ? 'L' : 'M'}${x(row.time).toFixed(3)},${y(row[key]).toFixed(3)}`
    drawing = true
    return part
  }).join(' ')
}
