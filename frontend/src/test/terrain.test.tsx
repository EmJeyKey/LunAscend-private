import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import evidence from '../../../docs/validation/step-7.5-results.json'
import { parseResult } from '../api/analysis'
import { buildRequest, initialOptions } from '../lib/analysis'
import { TerrainVisibilityPanel } from '../components/TerrainVisibilityPanel'
import { TerrainComparison } from '../components/TerrainComparison'
import type { ScenarioRequest } from '../types/analysis'

const request = evidence.result.request as ScenarioRequest
const result = () => parseResult(structuredClone(evidence.result), request)
vi.mock('../state/MissionContext', () => ({ useMission: () => ({ analysis: { result: evidence.result }, sampleIndex: 0, selectSample: () => {}, comparison: { scenarios: [{ id: 'test', name: 'Site01', analysis: { result: evidence.result } }] } }) }))
const mission = { site: { id: 'site', name: 'Site01', latitude: request.site.latitude_deg, longitude: request.site.longitude_deg, description: 'Input example' }, startUtc: request.start_utc, durationHours: 24 }
const options = { ...initialOptions, terrainEnabled: true, observerHeightM: '2', frameConfirmed: true }

describe('terrain scientific presentation boundary', () => {
  it('accepts the executed NASA result and preserves conditional center semantics', () => {
    const r = result()
    expect(r.terrain_visibility?.observations[0].sun.classification).toBe('conditional_clearance')
    expect(r.terrain_visibility?.global_visibility_confirmed).toBe(false)
    expect(r.horizon?.reference_frame).toBe('MOON_ME_DE421')
  })
  it('derives height from DEM explicitly and anchors coordinates at the start epoch', () => {
    const r = buildRequest(mission, { ...options, surfaceElevationM: '99999' })
    expect(r.site.surface_elevation_m).toBeNull()
    expect(r.site.observer_height_m).toBe(2)
    expect(r.settings.terrain_options?.coordinate_epoch_utc).toBe(r.start_utc)
  })
  it('refuses mock terrain, excessive samples and unsupported terrain resolution', () => {
    expect(() => buildRequest(mission, { ...options, providerMode: 'mock' })).toThrow('Scientific SPICE')
    expect(() => buildRequest(mission, { ...options, sampleStepS: '60' })).toThrow('1001')
    expect(() => buildRequest(mission, { ...options, terrainRadialStepM: '20' })).toThrow('Terrain sampling')
  })
  it('rejects a server silently omitting requested terrain products', () => {
    const r = structuredClone(evidence.result)
    Object.assign(r, { terrain_visibility: null, horizon: null, visibility_windows: null })
    expect(() => parseResult(r, request)).toThrow('incompatible')
  })
  it.each(['global', 'coverage', 'clearance', 'frame', 'identity', 'mask'])('rejects corrupted terrain %s', key => {
    const r = structuredClone(evidence.result)
    if (key === 'global') Object.assign(r.terrain_visibility, { global_visibility_confirmed: true })
    if (key === 'coverage') r.terrain_visibility.observations[0].sun.coverage = 'partial'
    if (key === 'clearance') r.terrain_visibility.observations[0].earth.clearance_deg = 100
    if (key === 'frame') r.horizon.reference_frame = 'IAU_MOON'
    if (key === 'identity') r.request.settings.terrain_options.max_search_radius_m = 500
    if (key === 'mask') r.horizon.elevation_deg.pop()
    expect(() => parseResult(r, request)).toThrow('incompatible')
  })
  it('renders actual readouts, UTC timeline, coverage limits and approximate windows', () => {
    const html = renderToStaticMarkup(<TerrainVisibilityPanel/>)
    expect(html).toContain('Clear within modeled terrain')
    expect(html).toContain('Modeled obstruction')
    expect(html).toContain('+6.114°')
    expect(html).toContain('Sampled UTC visibility timeline')
    expect(html).toContain('Approximate operational intervals')
    expect(html).toContain('period edge')
    expect(html).not.toContain('NOT YET CALCULATED')
  })
  it('compares independent coverage and height assumptions without suitability ranking', () => {
    const html = renderToStaticMarkup(<TerrainComparison/>)
    expect(html).toContain('observer 2 m')
    expect(html).toContain('no terrain duration or clearance deltas')
    expect(html).toContain('All horizons globally partial')
  })
})
