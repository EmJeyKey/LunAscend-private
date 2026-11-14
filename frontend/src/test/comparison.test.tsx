import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import scienceFixture from '../../../docs/validation/step-3-example-result.json'
import mockFixture from './fixtures/mock-result.json'
import { ComparisonStore } from '../state/ComparisonStore'
import { initialOptions, buildRequest } from '../lib/analysis'
import { degrees, difference, differencesAllowed, nearestSample, percent, summarize, timeAtElapsed } from '../lib/comparison'
import { toUtc } from '../lib/time'
import { ComparisonMetrics } from '../components/ComparisonMetrics'
import { ComparisonCharts } from '../components/ComparisonCharts'
import { ResultProvenance } from '../components/AnalysisProvenance'
import type { ScenarioRequest, ScenarioResult } from '../types/analysis'
import {apolloCatalog} from '../lib/apollo'

const selection = { site: { id: 'reference', name: 'Test observer', latitude: -89, longitude: 42, description: 'Synthetic test observer' }, startUtc: '2026-11-14T00:00:00Z', durationHours: 24 }
const options = { ...initialOptions, surfaceElevationM: '0', sampleStepS: '43200', frameConfirmed: true }
const setup = (name = 'Baseline') => ({ name, selection: structuredClone(selection), options: { ...options } })
// Transport stubs exercise orchestration only; their values are never lunar reference evidence.
function reply(request: ScenarioRequest): ScenarioResult {
  return { ...structuredClone(request.provider_mode === 'mock' ? mockFixture : scienceFixture) as unknown as ScenarioResult, request, provider_mode: request.provider_mode }
}
const success = vi.fn(async (request: ScenarioRequest) => reply(request))

describe('bounded scenarios and Explorer snapshots', () => {
  it('adds a deep snapshot of site/date/options, caps at three, and keeps distinct identifiers', () => {
    const store = new ComparisonStore([setup()])
    const saved = structuredClone(selection)
    const id = store.add(saved, options, 'Explorer selection')!
    saved.site.latitude = 1
    expect(store.getSnapshot().scenarios[1].selection.site.latitude).toBe(-89)
    expect(store.getSnapshot().scenarios[1].options.frameConfirmed).toBe(true)
    expect(store.getSnapshot().scenarios[1].selection.startUtc).toBe(selection.startUtc)
    expect(store.duplicate(id)).toBeTruthy()
    expect(store.add(selection, options)).toBeNull()
    expect(new Set(store.getSnapshot().scenarios.map(s => s.id)).size).toBe(3)
  })
  it('selects and removes a baseline without changing independent settings', () => {
    const store = new ComparisonStore([setup(), setup('Second')])
    store.setBaseline('scenario-2')
    expect(store.getSnapshot().baselineId).toBe('scenario-2')
    store.remove('scenario-2')
    expect(store.getSnapshot().baselineId).toBe('scenario-1')
    store.remove('scenario-1')
    expect(store.getSnapshot().scenarios).toHaveLength(0)
    expect(store.add(selection, options)).toBe(store.getSnapshot().baselineId)
  })
  it('duplicates a baseline, renames it and edits its UTC date independently', () => {
    const store = new ComparisonStore([setup()])
    const id = store.duplicate('scenario-1')!
    store.edit(id, { name: 'Delayed arrival', selection: { ...selection, startUtc: toUtc('2026-11-19T00:00:00.123')! } })
    expect(store.getSnapshot().scenarios[0].selection.startUtc).toBe(selection.startUtc)
    expect(store.getSnapshot().scenarios[1].selection.startUtc).toBe('2026-11-19T00:00:00.123Z')
    expect(store.getSnapshot().scenarios[1].name).toBe('Delayed arrival')
  })
})

describe('independent analysis and request reuse', () => {
  it('reconciles edited catalog dates, then shares the identical calculation transport',async()=>{
    const nativeSelection={...selection,site:{...selection.site,id:'apollo-11'},startUtc:'2026-11-15T00:00:00Z'}
    const nativeOptions={...options,coordinateEpochUtc:selection.startUtc}
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:true,json:async()=>({context_frame:'MOON_ME_DE440_ME421',coordinate_epoch_utc:nativeSelection.startUtc,sites:apolloCatalog.sites.map(s=>({...s,context_latitude:s.latitude+.001,context_longitude:s.longitude+.002}))})}))
    try{
      const transport=vi.fn(async(r:ScenarioRequest)=>reply(r))
      const store=new ComparisonStore([{selection:nativeSelection,options:nativeOptions,name:'A'},{selection:nativeSelection,options:nativeOptions,name:'B'}],transport)
      await store.runAll()
      expect(transport).toHaveBeenCalledTimes(1)
      expect(transport.mock.calls[0][0].site.latitude_deg).toBeCloseTo(.67516,8)
      expect(store.getSnapshot().scenarios.every(s=>s.options.coordinateEpochUtc===nativeSelection.startUtc&&s.analysis.status==='success')).toBe(true)
    }finally{vi.unstubAllGlobals()}
  })
  it('ignores a late catalog conversion after a scenario is edited',async()=>{
    let finish!:(value:unknown)=>void
    const pending=new Promise(resolve=>{finish=resolve})
    vi.stubGlobal('fetch',vi.fn().mockReturnValue(pending))
    try{
      const draft={...selection,site:{...selection.site,id:'apollo-11'},startUtc:'2026-11-15T00:00:00Z'}
      const transport=vi.fn(async(r:ScenarioRequest)=>reply(r))
      const store=new ComparisonStore([{selection:draft,options:{...options,coordinateEpochUtc:selection.startUtc},name:'A'}],transport)
      const job=store.run('scenario-1');store.edit('scenario-1',{selection:{...draft,durationHours:12}})
      finish({ok:true,json:async()=>({context_frame:'MOON_ME_DE440_ME421',coordinate_epoch_utc:draft.startUtc,sites:apolloCatalog.sites.map(s=>({...s,context_latitude:s.latitude,context_longitude:s.longitude}))})})
      await job
      expect(transport).not.toHaveBeenCalled()
      expect(store.getSnapshot().scenarios[0].selection.durationHours).toBe(12)
      expect(store.getSnapshot().scenarios[0].analysis.result).toBeNull()
    }finally{vi.unstubAllGlobals()}
  })
  it('constructs exact requests with independent coordinates, duration, observer height and provider', async () => {
    const transport = vi.fn(async (r: ScenarioRequest) => reply(r))
    const store = new ComparisonStore([setup()], transport)
    const id = store.add({ ...selection, durationHours: 48, site: { ...selection.site, latitude: -88, longitude: 15 } }, { ...options, providerMode: 'mock', observerHeightM: '3' })!
    await store.runAll()
    expect(transport).toHaveBeenCalledTimes(2)
    const request = transport.mock.calls[1][0]
    expect(request.provider_mode).toBe('mock')
    expect(request.site.latitude_deg).toBe(-88)
    expect(request.site.observer_height_m).toBe(3)
    expect(request.end_utc).toBe('2026-11-16T00:00:00.000Z')
    expect(store.getSnapshot().scenarios.find(s => s.id === id)?.analysis.result?.request).toEqual(request)
    expect(transport.mock.calls[0][0].site.coordinate_reference.frame_id).toBe('MOON_ME_DE440_ME421')
  })
  it('validates each scenario and leaves a valid result intact beside an invalid draft', async () => {
    const transport = vi.fn(async (r: ScenarioRequest) => reply(r))
    const store = new ComparisonStore([setup(), { ...setup('Invalid'), options: initialOptions }], transport)
    await store.runAll()
    expect(store.getSnapshot().scenarios.map(s => s.analysis.status)).toEqual(['success', 'error'])
    expect(transport).toHaveBeenCalledTimes(1)
    expect(store.getSnapshot().scenarios[1].analysis.message).toContain('explicit')
  })
  it('keeps successful results when a backend scenario fails, then retries only the failure', async () => {
    let fail = true
    const transport = vi.fn(async (r: ScenarioRequest) => { if (r.site.latitude_deg === -88 && fail) throw new Error('MISSING_DATA: unavailable kernel'); return reply(r) })
    const store = new ComparisonStore([setup(), { ...setup('Second'), selection: { ...selection, site: { ...selection.site, latitude: -88 } } }], transport)
    await store.runAll()
    expect(store.getSnapshot().scenarios.map(s => s.analysis.status)).toEqual(['success', 'error'])
    expect(store.getSnapshot().scenarios[1].analysis.message).toContain('MISSING_DATA')
    fail = false
    await store.runAll()
    expect(transport).toHaveBeenCalledTimes(3)
    expect(store.getSnapshot().scenarios.every(s => s.analysis.status === 'success')).toBe(true)
    expect(transport.mock.calls.every(([r]) => r.provider_mode === 'scientific')).toBe(true)
  })
  it('deduplicates concurrent identical requests and reuses completed results after rename', async () => {
    const transport = vi.fn(async (r: ScenarioRequest) => reply(r))
    const store = new ComparisonStore([setup(), setup('Identical')], transport)
    await Promise.all([store.runAll(), store.runAll()])
    expect(transport).toHaveBeenCalledTimes(1)
    expect(store.getSnapshot().scenarios.every(s => s.analysis.status === 'success')).toBe(true)
    store.edit('scenario-2', { name: 'Renamed only' })
    await store.runAll()
    expect(transport).toHaveBeenCalledTimes(1)
  })
  it.each(['coordinates', 'date', 'duration', 'provider', 'height', 'sampling'] as const)('invalidates only the changed scenario: %s', async kind => {
    const transport = vi.fn(async (r: ScenarioRequest) => reply(r))
    const store = new ComparisonStore([setup(), setup('Second')], transport)
    await store.runAll()
    const item = store.getSnapshot().scenarios[1]
    if (kind === 'coordinates') store.edit(item.id, { selection: { ...item.selection, site: { ...item.selection.site, longitude: 43 } } })
    if (kind === 'date') store.edit(item.id, { selection: { ...item.selection, startUtc: '2026-11-19T00:00:00Z' } })
    if (kind === 'duration') store.edit(item.id, { selection: { ...item.selection, durationHours: 48 } })
    if (kind === 'provider') store.edit(item.id, { options: { ...options, providerMode: 'mock' } })
    if (kind === 'height') store.edit(item.id, { options: { ...options, observerHeightM: '2' } })
    if (kind === 'sampling') store.edit(item.id, { options: { ...options, sampleStepS: '21600' } })
    expect(store.getSnapshot().scenarios.map(s => s.analysis.status)).toEqual(['success', 'idle'])
    await store.runAll()
    expect(transport).toHaveBeenCalledTimes(2)
  })
  it('ignores a late response after editing even when transport ignores cancellation', async () => {
    const resolvers: ((value: ScenarioResult) => void)[] = []
    const transport = vi.fn((r: ScenarioRequest) => new Promise<ScenarioResult>(resolve => resolvers.push(() => resolve(reply(r)))))
    const store = new ComparisonStore([setup()], transport)
    const old = store.run('scenario-1')
    store.edit('scenario-1', { selection: { ...selection, durationHours: 48 } })
    const current = store.run('scenario-1')
    resolvers[1](reply(buildRequest(selection, options))); await current
    resolvers[0](reply(buildRequest(selection, options))); await old
    expect(store.getSnapshot().scenarios[0].analysis.result?.request.end_utc).toBe('2026-11-16T00:00:00.000Z')
  })
  it('retains a shared request for the remaining consumer after the other is removed', async () => {
    let resolve!: (r: ScenarioResult) => void
    const transport = vi.fn(() => new Promise<ScenarioResult>(r => { resolve = r }))
    const store = new ComparisonStore([setup(), setup('Second')], transport)
    const running = store.runAll()
    store.remove('scenario-1')
    resolve(reply(buildRequest(selection, options)))
    await running
    expect(store.getSnapshot().scenarios).toHaveLength(1)
    expect(store.getSnapshot().scenarios[0].analysis.status).toBe('success')
  })
  it('cancels deleted/disposing jobs and publishes no late result', async () => {
    let resolve!: (r: ScenarioResult) => void
    let signal!: AbortSignal
    const store = new ComparisonStore([setup()], (_r, s) => { signal = s; return new Promise(r => { resolve = r }) })
    const pending = store.run('scenario-1')
    store.dispose()
    expect(signal.aborted).toBe(true)
    resolve(reply(buildRequest(selection, options))); await pending
    expect(store.getSnapshot().scenarios[0].analysis.status).toBe('idle')
  })
})

// Explicitly synthetic angular sequences test summary mathematics, not lunar physics.
function sequence(values: (number | null)[], times = values.map((_, i) => i * 12)): ScenarioResult {
  const result = reply(buildRequest(selection, options))
  const template = result.observations![0]
  result.observations = values.map((value, i) => ({ ...template, time_utc: new Date(Date.parse(selection.startUtc) + times[i] * 3600000).toISOString(), sun_elevation_deg: { ...template.sun_elevation_deg, value } }))
  return result
}
describe('geometric summary limits and differences', () => {
  it('splits weighted segments at horizon crossings instead of counting samples', () => {
    const summary = summarize(sequence([-10, 10, 10], [0, 6, 24]), 'sun')
    expect(summary).toMatchObject({ start: -10, min: -10, max: 10, coverage: 1, samples: 3 })
    expect(summary.aboveFraction).toBeCloseTo(21 / 24)
  })
  it.each([{ values: [0, 0, 0], fraction: 0 }, { values: [0, 10, 0], fraction: 1 }, { values: [10, -10, 10], fraction: .5 }])('treats zero and crossing endpoints consistently: $values', ({ values, fraction }) => {
    expect(summarize(sequence(values), 'sun').aboveFraction).toBe(fraction)
  })
  it('excludes missing intervals and absent start samples rather than assigning zero', () => {
    const summary = summarize(sequence([null, 10, 10]), 'sun')
    expect(summary.start).toBeNull()
    expect(summary.coverage).toBe(.5)
    expect(summary.aboveFraction).toBe(1)
    expect(summarize(sequence([10, 10], [6, 24]), 'sun').start).toBeNull()
    expect(summarize(sequence([null, null, null]), 'sun').min).toBeNull()
    expect(summarize(sequence([10]), 'sun').aboveFraction).toBeNull()
  })
  it('returns correct signed differences and preserves unknown values', () => {
    expect(difference(2, 5)).toBe(-3)
    expect(difference(null, 0)).toBeNull()
    expect(degrees(difference(2, 5), true)).toBe('-3.00°')
    expect(percent(.876)).toBe('88%')
  })
  it('withholds numerical differences for mixed providers or unmatched model/frame', () => {
    const a = sequence([1, 2, 3]), b = structuredClone(a)
    expect(differencesAllowed(a, b)).toBe(true)
    b.provider_mode = 'mock'; expect(differencesAllowed(a, b)).toBe(false)
    b.provider_mode = 'scientific'; b.model_version = 'other'; expect(differencesAllowed(a, b)).toBe(false)
    b.model_version = a.model_version; b.request.site.coordinate_reference.frame_id = 'other'; expect(differencesAllowed(a, b)).toBe(false)
  })
  it('aligns elapsed time while keeping different UTC dates and shorter coverage distinct', () => {
    const a = sequence([1, 2, 3]), b = sequence([1, 2, 3])
    b.request.start_utc = '2026-11-19T00:00:00Z'
    b.request.end_utc = '2026-11-20T00:00:00Z'
    b.observations = b.observations!.map((r, i) => ({ ...r, time_utc: new Date(Date.parse(b.request.start_utc) + i * 43200000).toISOString() }))
    expect(timeAtElapsed(b, 12) - timeAtElapsed(a, 12)).toBe(5 * 86400000)
    expect(nearestSample(a, 12)).toBe(1)
    expect(nearestSample(b, 12)).toBe(1)
    expect(nearestSample(a, 25)).toBeNull()
  })
  it('renders real fixture provenance, mock warnings and explicit elapsed/UTC chart labels', async () => {
    const store = new ComparisonStore([setup(), { ...setup('Mock demo'), options: { ...options, providerMode: 'mock' } }], success)
    await store.runAll()
    const state = store.getSnapshot()
    const html = renderToStaticMarkup(<><ComparisonMetrics {...state}/><ComparisonCharts {...state}/><ResultProvenance result={state.scenarios[0].analysis.result!}/></>)
    expect(html).toContain('NOT LUNAR PREDICTIONS')
    expect(html).toContain('Elapsed-time mode')
    expect(html).toContain('Start UTC:')
    expect(html).toContain('Δ unavailable')
    expect(html).toContain('Provenance records')
    expect(html).toContain('piecewise-linear')
  })
  it('withholds fraction differences with missing coverage while retaining known sampled extrema', async () => {
    const store = new ComparisonStore([setup(), setup('Partial coverage')], async r => reply(r))
    await store.runAll()
    const state = structuredClone(store.getSnapshot())
    state.scenarios[0].analysis.result = sequence([10, 10, 10])
    state.scenarios[1].analysis.result = sequence([null, 10, 10])
    const html = renderToStaticMarkup(<ComparisonMetrics {...state}/>)
    expect(html).toContain('50%')
    expect(html).toContain('Δ +0.00°')
    expect(html).toContain('Δ unavailable')
    expect(html.split('Earth')[0]).not.toContain('Δ +0 percentage points')
  })
  it('keeps chart bounds finite while a duration field contains an invalid large draft', async () => {
    const store = new ComparisonStore([setup(), setup('Invalid draft')], async r => reply(r))
    await store.run('scenario-1')
    store.edit('scenario-2', { selection: { ...selection, durationHours: 1e308 } })
    expect(() => renderToStaticMarkup(<ComparisonCharts {...store.getSnapshot()}/>)).not.toThrow()
  })
})
