import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import scientificFixture from '../../../docs/validation/step-3-example-result.json'
import mockFixture from './fixtures/mock-result.json'
import { AnalysisRunner, emptyAnalysis, parseResult, requestAnalysis, type AnalysisState } from '../api/analysis'
import { buildRequest, chartData, formatAngle, initialOptions, linePath, observationAt } from '../lib/analysis'
import { toUtc } from '../lib/time'
import { PositionReadout } from '../components/ui'
import { ResultProvenance } from '../components/AnalysisProvenance'
import { ElevationPlot } from '../components/ScientificChartPanel'
import type { ScenarioRequest, ScenarioResult } from '../types/analysis'

const scientificRequest = scientificFixture.request as ScenarioRequest
const mockRequest = mockFixture.request as ScenarioRequest
const mission = { site: { id: 'south-polar', name: 'Synthetic south-polar validation observer', latitude: -89, longitude: 42, description: 'Synthetic site' }, startUtc: '2026-11-14T00:00:00Z', durationHours: 24 }
const options = { ...initialOptions, surfaceElevationM: '0', sampleStepS: '43200', frameConfirmed: true }
const science = () => parseResult(structuredClone(scientificFixture), scientificRequest)
const mock = () => parseResult(structuredClone(mockFixture), mockRequest)

describe('analysis request boundary', () => {
  it('builds the existing scientific contract with explicit metadata and no engineering claims', () => {
    const request = buildRequest(mission, options)
    expect(request.site.coordinate_reference.frame_id).toBe('MOON_ME_DE440_ME421')
    expect(request.site.surface_elevation_m).toBe(0)
    expect(request.end_utc).toBe('2026-11-15T00:00:00.000Z')
    expect(request.provider_mode).toBe('scientific')
    expect(request.settings.terrain_enabled || request.settings.power_enabled || request.settings.communication_enabled).toBe(false)
  })
  it('requires scientific frame confirmation and explicit height instead of assigning unknown height zero', () => {
    expect(() => buildRequest(mission, initialOptions)).toThrow('explicit')
    expect(() => buildRequest(mission, { ...options, frameConfirmed: false })).toThrow('confirmation')
    const request = buildRequest(mission, { ...initialOptions, providerMode: 'mock' })
    expect(request.provider_mode).toBe('mock')
    expect(request.site.surface_elevation_m).toBeNull()
    expect(request.site.coordinate_reference.frame_id).toBe('MOCK_SITE_INPUT')
  })
  it.each([91, NaN])('rejects invalid latitude %s', latitude => {
    expect(() => buildRequest({ ...mission, site: { ...mission.site, latitude } }, options)).toThrow('Latitude')
  })
  it('validates workload and invalid time/duration', () => {
    expect(() => buildRequest(mission, { ...options, sampleStepS: '0.001' })).toThrow('10001')
    expect(() => buildRequest({ ...mission, startUtc: 'invalid' }, options)).toThrow('UTC')
    expect(() => buildRequest({ ...mission, durationHours: -1 }, options)).toThrow('duration')
  })
  it('retains UTC seconds/milliseconds across midnight independent of local timezone', () => {
    const startUtc = toUtc('2026-11-14T23:59:59.123')!
    expect(startUtc).toBe('2026-11-14T23:59:59.123Z')
    expect(buildRequest({ ...mission, startUtc, durationHours: 1 }, options).end_utc).toBe('2026-11-15T00:59:59.123Z')
    expect(toUtc('2026-02-30T12:00:00')).toBeNull()
    expect(toUtc('2016-12-31T23:59:60')).toBeNull()
  })
})

describe('actual response parsing and source isolation', () => {
  it('accepts the saved real scientific reference response and an executed mock response', () => {
    expect(science().observations?.[0].sun_elevation_deg.value).toBeCloseTo(1.6500961689197666, 12)
    expect(mock().observations?.[0].status).toBe('illustrative')
    expect(() => parseResult(mockFixture, scientificRequest)).toThrow('incompatible')
  })
  it.each(['value', 'label', 'provenance', 'request'])('rejects incompatible or misleading %s', kind => {
    const value = structuredClone(scientificFixture)
    if (kind === 'value') value.observations[0].sun_elevation_deg.value = 91
    if (kind === 'label') value.observations[0].sun_elevation_deg.validation = 'mock'
    if (kind === 'provenance') value.observations[0].provenance_ids = ['unresolved-source']
    if (kind === 'request') value.request.site.latitude_deg = 10
    expect(() => parseResult(value, scientificRequest)).toThrow()
  })
  it('preserves missing/undefined azimuth as null rather than zero', () => {
    const fixture = structuredClone(mockFixture) as unknown as ScenarioResult
    fixture.observations![0].sun_azimuth_deg = { ...fixture.observations![0].sun_azimuth_deg, value: null, status: 'unavailable', reason: 'Undefined at pole' }
    const result = parseResult(fixture, mockRequest)
    expect(formatAngle(result.observations![0].sun_azimuth_deg)).toBe('Unavailable')
    expect(formatAngle(result.observations![0].sun_elevation_deg, true)).toBe('-9.356°')
  })
  it('posts only the explicitly selected mode and reports structured missing-kernel errors without fallback', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ errors: [{ code: 'MISSING_DATA', message: 'Required kernel missing' }] }, { status: 503 }))
    await expect(requestAnalysis(scientificRequest, new AbortController().signal, fetcher)).rejects.toThrow('MISSING_DATA')
    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(JSON.parse(String(fetcher.mock.calls[0][1]?.body)).provider_mode).toBe('scientific')
  })
  it('handles offline, malformed, HTTP and incompatible successful responses', async () => {
    const controller = new AbortController()
    const offline = vi.fn<typeof fetch>().mockRejectedValue(new TypeError('offline'))
    await expect(requestAnalysis(mockRequest, controller.signal, offline)).rejects.toThrow('Cannot reach')
    const malformed = vi.fn<typeof fetch>().mockResolvedValue(new Response('not JSON', { status: 502 }))
    await expect(requestAnalysis(mockRequest, controller.signal, malformed)).rejects.toThrow('unreadable')
    const incompatible = vi.fn<typeof fetch>().mockResolvedValue(Response.json(scientificFixture))
    await expect(requestAnalysis(mockRequest, controller.signal, incompatible)).rejects.toThrow('incompatible')
  })
  it('accepts successful mock POST without calling another endpoint', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json(mockFixture))
    const result = await requestAnalysis(mockRequest, new AbortController().signal, fetcher, '/backend/')
    expect(result.provider_mode).toBe('mock')
    expect(fetcher.mock.calls[0][0]).toBe('/backend/api/v1/scenarios/analyze')
    expect(fetcher.mock.calls[0][1]?.method).toBe('POST')
  })
})

describe('chart samples and rendered scientific labels', () => {
  it('maps actual UTC values, breaks lines at missing measurements, and clamps sample selection', () => {
    const result = mock(), rows = result.observations!
    const points = chartData(rows)
    expect(points[0].time).toBe(Date.parse(rows[0].time_utc))
    expect(points[0].sun).toBe(rows[0].sun_elevation_deg.value)
    points[1].sun = null
    const path = linePath(points, 'sun', v => v, v => v)
    expect(path.match(/M/g)?.length).toBe(2)
    expect(observationAt(rows, 999)?.time_utc).toBe(rows.at(-1)?.time_utc)
    expect(observationAt([], 0)).toBeUndefined()
  })
  it('synchronizes SVG cursor and position readouts to the selected returned sample', () => {
    const result = science(), rows = result.observations!
    const readout = renderToStaticMarkup(<PositionReadout kind="solar" observation={observationAt(rows, 1)} provider="scientific"/>)
    expect(readout).toContain(rows[1].time_utc)
    expect(readout).toContain(formatAngle(rows[1].sun_elevation_deg, true))
    const svg = renderToStaticMarkup(<ElevationPlot result={result} index={1} onSelect={() => {}}/>)
    expect(svg).toContain('x1="461"')
    expect(svg).toContain('0° geometric horizon')
    expect(svg).not.toContain('Terrain horizon (deg)')
  })
  it('renders actual provenance and persistent mock warnings without a scientific validation claim', () => {
    const html = renderToStaticMarkup(<ResultProvenance result={mock()}/>)
    expect(html).toContain('MOCK DATA — NOT LUNAR PREDICTIONS')
    expect(html).toContain('MockAnalysisProvider')
    expect(html).toContain('Synthetic demonstration data')
    const actual = renderToStaticMarkup(<ResultProvenance result={science()}/>)
    expect(actual).toContain('SPICE EPHEMERIS')
    expect(actual).toContain('MOON_ME_DE440_ME421')
    expect(actual).toContain('reference_compared')
  })
})

describe('analysis request lifecycle', () => {
  it('publishes loading, removes stale results, and ignores old responses even if abort is ignored', async () => {
    const states: AnalysisState[] = []
    let resolveOld!: (value: ScenarioResult) => void
    const transport = vi.fn().mockImplementationOnce(() => new Promise<ScenarioResult>(resolve => { resolveOld = resolve })).mockResolvedValueOnce(mock())
    const runner = new AnalysisRunner(state => states.push(state), transport)
    const old = runner.run(scientificRequest)
    expect(states.at(-1)).toEqual({ status: 'loading', result: null, message: '' })
    await runner.run(mockRequest)
    resolveOld(science())
    await old
    expect(states.at(-1)?.result?.provider_mode).toBe('mock')
    expect(transport.mock.calls[0][1].aborted).toBe(true)
    runner.clear()
    expect(states.at(-1)).toEqual(emptyAnalysis)
  })
  it('ignores a pending response after input edits and surfaces current errors', async () => {
    const states: AnalysisState[] = []
    let resolve!: (value: ScenarioResult) => void
    const transport = vi.fn().mockImplementationOnce(() => new Promise<ScenarioResult>(done => { resolve = done })).mockRejectedValueOnce(new Error('backend unavailable'))
    const runner = new AnalysisRunner(state => states.push(state), transport)
    const pending = runner.run(mockRequest)
    runner.clear()
    resolve(mock())
    await pending
    expect(states.at(-1)).toEqual(emptyAnalysis)
    await runner.run(mockRequest)
    expect(states.at(-1)).toEqual({ status: 'error', result: null, message: 'backend unavailable' })
  })
})
