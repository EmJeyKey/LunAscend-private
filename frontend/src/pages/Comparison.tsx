import { useMission } from '../state/MissionContext'
import type { CSSProperties } from 'react'
import { PageHeader } from '../components/ui'
import { ComparisonScenarioPanel } from '../components/ComparisonScenarioPanel'
import { ComparisonCharts } from '../components/ComparisonCharts'
import { ComparisonMetrics } from '../components/ComparisonMetrics'
import { TerrainComparison } from '../components/TerrainComparison'
import { EngineeringComparison } from '../components/EngineeringComparison'
import {FriendlyComparison} from '../components/FriendlyComparison'
import {ScientificDetails} from '../components/PresentationControls'

export function Comparison() {
  const { comparison, comparisonStore: store, saveAlternative } = useMission()
  const { scenarios, baselineId } = comparison
  const mixed = new Set(scenarios.map(s => s.options.providerMode)).size > 1
  return <><PageHeader eyebrow="LOCATIONS / DATES / ASSUMPTIONS" title="Compare Mission Options" description="Compare up to three landing plans and see which modeled conditions change. Each option keeps its own location, date and assumptions."/>
    <div className="comparison-toolbar"><button className="button primary" disabled={scenarios.length >= 3} onClick={saveAlternative}>Add current site & date</button><button className="button primary" disabled={scenarios.length < 2 || scenarios.every(s => s.analysis.status === 'loading')} onClick={() => { void store.runAll() }}>Run comparison</button><span>{scenarios.length} / 3 scenarios - unchanged results reused</span></div>
    {mixed && <p className="comparison-mixed" role="alert">MIXED PROVIDERS - mock and scientific results are not a scientifically meaningful comparison. Cross-provider differences are withheld.</p>}
    {scenarios.some(s => s.options.providerMode === 'mock') && <p className="mock-warning">MOCK DATA - NOT LUNAR PREDICTIONS. Mock summaries and charts are illustrative.</p>}
    <p className="section-explanation">Choose a baseline, edit each site and UTC date independently, then run comparison. Duplicate a baseline to inspect a landing-date delay. Explorer saves enter this same workspace.</p>
    <div className="comparison-workspace" style={{ '--scenario-count': Math.max(1, scenarios.length) } as CSSProperties}>{scenarios.map(scenario => <ComparisonScenarioPanel key={scenario.id} scenario={scenario}/>)}</div>
    {scenarios.length < 2 && <p className="form-feedback">Add or duplicate a scenario to compare at least two configurations.</p>}
    <FriendlyComparison scenarios={scenarios} baselineId={baselineId}/>
    {scenarios.length>0&&<ComparisonMetrics scenarios={scenarios} baselineId={baselineId}/>}
    <EngineeringComparison/>
    <ScientificDetails title="Show comparison measurements and engineering details">{scenarios.length > 0 && <ComparisonCharts scenarios={scenarios} baselineId={baselineId}/>}<TerrainComparison/></ScientificDetails>
    <p className="page-footnote">Geometric curves remain separate from optional, coverage-qualified terrain center classifications. Power/battery and DTE estimates remain conditional on their hardware assumptions. Full-disk illumination and radio link budgets remain unavailable. Scenarios, settings and results persist during navigation in this session; reload clears them. Absolute-UTC overlay mode is deferred; each chart and readout retains its own UTC epoch.</p>
  </>
}
