import { createContext, useContext, useEffect, useRef, useState, useSyncExternalStore, type PropsWithChildren } from 'react'
import {defaultConstraints} from '../lib/resilience'
import type {MissionConstraints} from '../types/resilience'
import type { MissionSelection, PreviewScenario } from '../types/preview'
import type { AnalysisOptions } from '../types/analysis'
import { AnalysisRunner, emptyAnalysis } from '../api/analysis'
import { buildRequest, initialOptions, observationAt } from '../lib/analysis'
import { ComparisonStore, type ComparisonState } from './ComparisonStore'
import {needsCatalogEpoch,resolveCatalogEpoch} from '../lib/apollo'

interface MissionContextValue {
  requirements: MissionConstraints
  setRequirements: (value: MissionConstraints) => void
  requirePower: boolean
  setRequirePower: (value: boolean) => void
  requireCommunication: boolean
  setRequireCommunication: (value: boolean) => void
  mission: MissionSelection
  updateMission: (value: MissionSelection) => void
  alternatives: PreviewScenario[]
  saveAlternative: () => void
  removeAlternative: (id: string) => void
  analysis: typeof emptyAnalysis
  options: AnalysisOptions
  updateOptions: (value: AnalysisOptions) => void
  runAnalysis: (selection: MissionSelection, requestedOptions?: AnalysisOptions) => void
  invalidate: () => void
  sampleIndex: number
  resultsCleared: boolean
  selectSample: (index: number) => void
  observation: ReturnType<typeof observationAt>
  comparison: ComparisonState
  comparisonStore: ComparisonStore
  inspectScenario: (id: string) => void
}

const MissionContext = createContext<MissionContextValue | null>(null)

export function MissionProvider({ children }: PropsWithChildren) {
  const [mission, setMission] = useState<MissionSelection>({site:{id:'custom',name:'LOLA Site01 example',latitude:-89.46315760953222,longitude:-137.50097847854008,description:'Documented DEM pixel-center example; not an approved landing site.'},startUtc:'2026-11-14T00:00:00.000Z',durationHours:24})
  const [requirements,setRequirements]=useState(defaultConstraints)
  const [requirePower,setRequirePower]=useState(true)
  const [requireCommunication,setRequireCommunication]=useState(false)
  const [analysis, setAnalysis] = useState(emptyAnalysis)
  const [options, setOptions] = useState(initialOptions)
  const [sampleIndex, setSampleIndex] = useState(0)
  const [resultsCleared,setResultsCleared]=useState(false)
  const [runner] = useState(() => new AnalysisRunner(setAnalysis))
  const catalogJob=useRef<AbortController|null>(null)
  const invalidate = () => { catalogJob.current?.abort();setResultsCleared(value=>value||analysis.result!==null||analysis.status==='loading'); runner.clear(); setSampleIndex(0) }
  const updateMission = (value: MissionSelection) => { invalidate(); setMission(value) }
  const updateOptions = (value: AnalysisOptions) => { invalidate(); setOptions(value) }
  const series = analysis.result?.observations || []
  const selectSample = (index: number) => setSampleIndex(Math.max(0, Math.min(series.length - 1, Math.trunc(index))))
  const runAnalysis = (selection: MissionSelection, requestedOptions=options) => {
    invalidate()
    setResultsCleared(false)
    const apply=(resolved:MissionSelection,settings:AnalysisOptions)=>{
      try { const request = buildRequest(resolved, settings); setOptions(settings); setMission(resolved); void runner.run(request) }
      catch (error) { setAnalysis({ status: 'error', result: null, message: error instanceof Error ? error.message : 'Invalid analysis inputs.' }) }
    }
    if(needsCatalogEpoch(selection,requestedOptions)){
      const controller=new AbortController();catalogJob.current=controller
      setAnalysis({status:'loading',result:null,message:'Converting the fixed native catalog point at the selected UTC…'})
      void resolveCatalogEpoch(selection,requestedOptions,controller.signal).then(value=>{if(!controller.signal.aborted)apply(value.selection,value.options)},error=>{if(!controller.signal.aborted)setAnalysis({status:'error',result:null,message:error instanceof Error?error.message:'Exact catalog frame conversion unavailable.'})})
    }else apply(selection,requestedOptions)
  }
  useEffect(() => () => {catalogJob.current?.abort();runner.clear()}, [runner])
  const [comparisonStore] = useState(() => new ComparisonStore([]))
  const comparison = useSyncExternalStore(comparisonStore.subscribe, comparisonStore.getSnapshot, comparisonStore.getSnapshot)
  useEffect(() => () => comparisonStore.dispose(), [comparisonStore])
  const alternatives: PreviewScenario[] = comparison.scenarios.filter(s => s.id !== comparison.baselineId).map(s => ({ ...s.selection, id: s.id }))
  const saveAlternative = () => {
    if(analysis.result)comparisonStore.addResult(mission,options,analysis.result,mission.site.name)
    else comparisonStore.add(mission, options)
  }
  const removeAlternative = (id: string) => comparisonStore.remove(id)
  const inspectScenario = (id: string) => {
    const scenario = comparisonStore.getSnapshot().scenarios.find(s => s.id === id)
    if (!scenario) return
    invalidate(); setResultsCleared(false); setMission(structuredClone(scenario.selection)); setOptions({ ...scenario.options }); setAnalysis(scenario.analysis)
  }
  return <MissionContext.Provider value={{ requirements,setRequirements,requirePower,setRequirePower,requireCommunication,setRequireCommunication,mission, updateMission, alternatives, saveAlternative, removeAlternative, analysis, options, updateOptions, runAnalysis, invalidate, sampleIndex, resultsCleared, selectSample, observation: observationAt(series, sampleIndex), comparison, comparisonStore, inspectScenario }}>{children}</MissionContext.Provider>
}

export function useMission() {
  const value = useContext(MissionContext)
  if (!value) throw new Error('MissionProvider is required')
  return value
}
