import { emptyAnalysis, requestAnalysis, parseResult, type AnalysisState } from '../api/analysis'
import { buildRequest } from '../lib/analysis'
import type { AnalysisOptions, ScenarioRequest, ScenarioResult } from '../types/analysis'
import type { MissionSelection } from '../types/preview'

export interface ComparisonScenario {
  id: string
  name: string
  selection: MissionSelection
  options: AnalysisOptions
  analysis: AnalysisState
}
export interface ComparisonState { scenarios: ComparisonScenario[]; baselineId: string }
type Transport = (request: ScenarioRequest, signal: AbortSignal) => Promise<ScenarioResult>
interface Job { controller: AbortController; consumers: Map<string, number>; promise: Promise<void> }
const keyOf = (scenario: ComparisonScenario) => {
  try { return JSON.stringify(buildRequest(scenario.selection, scenario.options)) } catch { return null }
}

// At most three scenarios, one in-memory result per current request identity.
// Display names are UI metadata; scientific site identity remains in the request.
export class ComparisonStore {
  private snapshot: ComparisonState
  private listeners = new Set<() => void>()
  private versions = new Map<string, number>()
  private jobs = new Map<string, Job>()
  private cache = new Map<string, ScenarioResult>()
  constructor(initial: { selection: MissionSelection; options: AnalysisOptions; name: string }[], private transport: Transport = requestAnalysis) {
    const scenarios = initial.slice(0, 3).map((item, i) => ({ ...structuredClone(item), id: `scenario-${i + 1}`, analysis: emptyAnalysis }))
    this.snapshot = { scenarios, baselineId: scenarios[0]?.id || '' }
  }
  getSnapshot = () => this.snapshot
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener) } }
  private publish(scenarios: ComparisonScenario[], baselineId = this.snapshot.baselineId) {
    this.snapshot = { scenarios, baselineId }
    const keys = new Set(scenarios.map(keyOf))
    for (const key of this.cache.keys()) if (!keys.has(key)) this.cache.delete(key)
    this.listeners.forEach(listener => listener())
  }
  private detach(id: string) {
    this.versions.set(id, (this.versions.get(id) || 0) + 1)
    for (const [key, job] of this.jobs) {
      job.consumers.delete(id)
      if (!job.consumers.size) { job.controller.abort(); this.jobs.delete(key) }
    }
  }
  add(selection: MissionSelection, options: AnalysisOptions, name = selection.site.name) {
    if (this.snapshot.scenarios.length >= 3) return null
    const id = crypto.randomUUID()
    this.publish([...this.snapshot.scenarios, { id, name, selection: structuredClone(selection), options: { ...options }, analysis: emptyAnalysis }], this.snapshot.baselineId || id)
    return id
  }
  duplicate(id: string) {
    const item = this.snapshot.scenarios.find(s => s.id === id)
    return item ? this.add(item.selection, item.options, `${item.name} copy`.slice(0, 100)) : null
  }
  addResult(selection: MissionSelection, options: AnalysisOptions, result: ScenarioResult) {
    const verified = parseResult(result, buildRequest(selection, options))
    const id = this.add(selection, structuredClone(options), selection.site.name+' · opportunity')
    if (id) {
      this.cache.set(JSON.stringify(buildRequest(selection, options)), verified)
      this.status(id, { status:'success', result:verified, message:'' })
    }
    return id
  }
  remove(id: string) {
    this.detach(id)
    const scenarios = this.snapshot.scenarios.filter(s => s.id !== id)
    this.publish(scenarios, id === this.snapshot.baselineId ? scenarios[0]?.id || '' : this.snapshot.baselineId)
  }
  setBaseline(id: string) { if (this.snapshot.scenarios.some(s => s.id === id)) this.publish(this.snapshot.scenarios, id) }
  edit(id: string, patch: Partial<Pick<ComparisonScenario, 'name' | 'selection' | 'options'>>) {
    this.publish(this.snapshot.scenarios.map(item => {
      if (item.id !== id) return item
      const next = { ...item, ...structuredClone(patch) }
      // Invalid drafts also invalidate results, even when both keys are null.
      if (!keyOf(next) || keyOf(next) !== keyOf(item)) { this.detach(id); next.analysis = emptyAnalysis }
      return next
    }))
  }
  private status(id: string, analysis: AnalysisState) { this.publish(this.snapshot.scenarios.map(s => s.id === id ? { ...s, analysis } : s)) }
  async run(id: string) {
    const item = this.snapshot.scenarios.find(s => s.id === id)
    if (!item) return
    let request: ScenarioRequest
    try { request = buildRequest(item.selection, item.options) }
    catch (error) { this.status(id, { status: 'error', result: null, message: error instanceof Error ? error.message : 'Invalid scenario inputs.' }); return }
    const key = JSON.stringify(request)
    const cached = this.cache.get(key)
    if (cached) { this.status(id, { status: 'success', result: cached, message: '' }); return }
    const version = this.versions.get(id) || 0
    this.status(id, { status: 'loading', result: null, message: '' })
    const pending = this.jobs.get(key)
    if (pending) { pending.consumers.set(id, version); return pending.promise }
    const job: Job = { controller: new AbortController(), consumers: new Map([[id, version]]), promise: Promise.resolve() }
    this.jobs.set(key, job)
    job.promise = (async () => {
      let state: AnalysisState
      try { state = { status: 'success', result: await this.transport(request, job.controller.signal), message: '' } }
      catch (error) { state = { status: 'error', result: null, message: error instanceof Error ? error.message : 'Analysis failed.' } }
      if (this.jobs.get(key) !== job) return // Cancelled/replaced, including transports ignoring AbortSignal.
      this.jobs.delete(key)
      if (state.result) this.cache.set(key, state.result)
      this.publish(this.snapshot.scenarios.map(s => job.consumers.has(s.id) && job.consumers.get(s.id) === (this.versions.get(s.id) || 0) && keyOf(s) === key ? { ...s, analysis: state } : s))
    })()
    return job.promise
  }
  runAll = () => Promise.all(this.snapshot.scenarios.map(s => this.run(s.id)))
  dispose() {
    for (const job of this.jobs.values()) job.controller.abort()
    this.jobs.clear()
    this.publish(this.snapshot.scenarios.map(s => s.analysis.status === 'loading' ? { ...s, analysis: emptyAnalysis } : s))
  }
}
