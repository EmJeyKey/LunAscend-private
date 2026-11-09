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
  const terrain = !!options.terrainEnabled
  if (terrain && options.providerMode !== 'scientific') throw new Error('Terrain visibility requires Scientific SPICE; mock terrain is never substituted.')
  const elevation = terrain || options.surfaceElevationM.trim() === '' ? null : Number(options.surfaceElevationM)
  const height = Number(options.observerHeightM)
  if (elevation !== null && !Number.isFinite(elevation) || !options.observerHeightM.trim() || !Number.isFinite(height) || height < 0) throw new Error('Enter a finite surface elevation and a non-negative observer height.')
  if (options.providerMode === 'scientific' && ((!terrain && elevation === null) || !options.frameConfirmed)) throw new Error('Scientific analysis requires an explicit sphere-relative elevation (or DEM-derived terrain height) and confirmation of the DE440/ME421 coordinate frame.')
  const radius = Number(options.terrainRadiusM ?? '2500'), azimuths = Number(options.terrainAzimuthSamples ?? '360'), radial = Number(options.terrainRadialStepM ?? '5')
  if (terrain && (!Number.isFinite(radius) || radius < 1 || radius > 50000 || !Number.isInteger(azimuths) || azimuths < 4 || azimuths > 720 || !Number.isFinite(radial) || radial < 1 || radial > 5 || radial > radius || azimuths * (Math.ceil(radius / radial) + 1) > 500000)) throw new Error('Terrain sampling exceeds bounds: radius 1–50000 m, 4–720 azimuths, radial step 1–5 m, at most 500000 ray samples.')
  if (terrain && (Math.ceil(mission.durationHours * 3600 / step) + 1 > 1001 || height > 10000 || Math.abs(latitude) === 90)) throw new Error('Terrain mode supports at most 1001 time samples, observer heights up to 10000 m and nonpolar coordinates.')
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
    settings: { terrain_enabled: terrain, ...(terrain ? { terrain_options: { dataset_id: 'lola-site01-5m-v2020', coordinate_epoch_utc: new Date(start).toISOString(), max_search_radius_m: radius, radial_step_m: radial, azimuth_samples: azimuths } } : {}), power_enabled: false, communication_enabled: false, horizon_mode: terrain ? 'terrain' : 'geometric_approximation', disk_policy: 'center', correction_mode: 'NONE', sun_clearance_deg: 0, earth_clearance_deg: 0 },
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
