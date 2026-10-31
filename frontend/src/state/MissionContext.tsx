import { createContext, useContext, useEffect, useState, useSyncExternalStore, type PropsWithChildren } from 'react'
import { initialStartUtc, previewSites } from '../data/preview'
import type { MissionSelection, PreviewScenario } from '../types/preview'
import type { AnalysisOptions } from '../types/analysis'
import { AnalysisRunner, emptyAnalysis } from '../api/analysis'
import { buildRequest, initialOptions, observationAt } from '../lib/analysis'
import { ComparisonStore, type ComparisonState } from './ComparisonStore'

interface MissionContextValue {
  mission: MissionSelection
  updateMission: (value: MissionSelection) => void
  alternatives: PreviewScenario[]
  saveAlternative: () => void
  removeAlternative: (id: string) => void
  analysis: typeof emptyAnalysis
  options: AnalysisOptions
  updateOptions: (value: AnalysisOptions) => void
  runAnalysis: (selection: MissionSelection) => void
  invalidate: () => void
  sampleIndex: number
  selectSample: (index: number) => void
  observation: ReturnType<typeof observationAt>
  comparison: ComparisonState
  comparisonStore: ComparisonStore
  inspectScenario: (id: string) => void
}

const MissionContext = createContext<MissionContextValue | null>(null)

export function MissionProvider({ children }: PropsWithChildren) {
  const [mission, setMission] = useState<MissionSelection>({ site: previewSites[0], startUtc: initialStartUtc, durationHours: 48 })
  const [analysis, setAnalysis] = useState(emptyAnalysis)
  const [options, setOptions] = useState(initialOptions)
  const [sampleIndex, setSampleIndex] = useState(0)
  const [runner] = useState(() => new AnalysisRunner(setAnalysis))
  const invalidate = () => { runner.clear(); setSampleIndex(0) }
  const updateMission = (value: MissionSelection) => { invalidate(); setMission(value) }
  const updateOptions = (value: AnalysisOptions) => { invalidate(); setOptions(value) }
  const series = analysis.result?.observations || []
  const selectSample = (index: number) => setSampleIndex(Math.max(0, Math.min(series.length - 1, Math.trunc(index))))
  const runAnalysis = (selection: MissionSelection) => {
    invalidate()
    try { const request = buildRequest(selection, options); setMission(selection); void runner.run(request) }
    catch (error) { setAnalysis({ status: 'error', result: null, message: error instanceof Error ? error.message : 'Invalid analysis inputs.' }) }
  }
  useEffect(() => () => runner.clear(), [runner])
  const [comparisonStore] = useState(() => new ComparisonStore([
    { selection: mission, options: initialOptions, name: 'Baseline' },
    { selection: { ...mission, site: previewSites[1] }, options: initialOptions, name: 'Alternative' },
  ]))
  const comparison = useSyncExternalStore(comparisonStore.subscribe, comparisonStore.getSnapshot, comparisonStore.getSnapshot)
  useEffect(() => () => comparisonStore.dispose(), [comparisonStore])
  const alternatives: PreviewScenario[] = comparison.scenarios.filter(s => s.id !== comparison.baselineId).map(s => ({ ...s.selection, id: s.id }))
  const saveAlternative = () => { comparisonStore.add(mission, options) }
  const removeAlternative = (id: string) => comparisonStore.remove(id)
  const inspectScenario = (id: string) => {
    const scenario = comparisonStore.getSnapshot().scenarios.find(s => s.id === id)
    if (!scenario) return
    invalidate(); setMission(structuredClone(scenario.selection)); setOptions({ ...scenario.options }); setAnalysis(scenario.analysis)
  }
  return <MissionContext.Provider value={{ mission, updateMission, alternatives, saveAlternative, removeAlternative, analysis, options, updateOptions, runAnalysis, invalidate, sampleIndex, selectSample, observation: observationAt(series, sampleIndex), comparison, comparisonStore, inspectScenario }}>{children}</MissionContext.Provider>
}

export function useMission() {
  const value = useContext(MissionContext)
  if (!value) throw new Error('MissionProvider is required')
  return value
}
