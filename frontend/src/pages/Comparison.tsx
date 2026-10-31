import { GitCompareArrows, Plus } from 'lucide-react'
import { MissionControls } from '../components/MissionControls'
import { EmptyState, PageHeader, PanelHeader, ScenarioCard, StatusBadge } from '../components/ui'
import { useMission } from '../state/MissionContext'

export function Comparison() {
  const { mission, alternatives, saveAlternative, removeAlternative } = useMission()
  return <><PageHeader eyebrow="SCENARIOS / TRADE-OFFS" title="Scenario Comparison" description="Compare site/date configurations. Scientific differences are unavailable." action={<button className="button primary" onClick={saveAlternative} disabled={alternatives.length >= 2}><Plus size={16}/>Save current as alternative</button>}/><MissionControls/>
    <div className="section-heading"><div><h2>Your scenario workspace</h2><p>Update the baseline or save the current configuration as an alternative.</p></div><StatusBadge>{alternatives.length + 1} / 3 scenarios</StatusBadge></div>
    <div className="scenario-grid"><ScenarioCard selection={mission} label="01 / Baseline" baseline/>{alternatives.map((selection, index) => <ScenarioCard key={selection.id} selection={selection} label={`0${index + 2} / Alternative`} onRemove={() => removeAlternative(selection.id)}/>)}{alternatives.length < 2 && <button className="add-scenario-card" onClick={saveAlternative}><Plus size={25}/><strong>Save a new alternative</strong><p>Snapshot the current site, UTC date and period.</p></button>}</div>
    <section className="panel section-gap"><PanelHeader icon={GitCompareArrows} title="Engineering trade-offs" action={<StatusBadge>Analysis unavailable</StatusBadge>}/><EmptyState icon={GitCompareArrows} title="No comparison results available." description="Illumination, Earth visibility and engineering differences will be compared in a later multi-scenario engineering workflow. No suitability score is calculated."/></section>
    <p className="page-footnote">Scenario selections are temporary browser memory and reset on reload. They contain no scientific results.</p>
  </>
}
