import { ArrowRight, GitCompareArrows, Info } from 'lucide-react'
import { Link } from 'react-router'
import { MissionControls } from '../components/MissionControls'
import { LunarMapPlaceholder } from '../components/LunarMapPlaceholder'
import { ScientificChartPanel } from '../components/ScientificChartPanel'
import { MetricCard, PanelHeader, ScenarioCard, TextLink } from '../components/ui'
import { useMission } from '../state/MissionContext'
import { AnalysisProvenance } from '../components/AnalysisProvenance'
import { AtlasIntroduction } from '../components/AtlasIntroduction'

export function Dashboard() {
  const { comparison, alternatives } = useMission()
  const baseline = comparison.scenarios.find(s => s.id === comparison.baselineId)
  return <><AtlasIntroduction/>
    <div className="dashboard-workbench">
      <div id="mission-configuration"><MissionControls compact/></div>
      <LunarMapPlaceholder/>
      <aside className="metrics-stack" aria-label="Selected sample geometry"><MetricCard kind="solar"/><MetricCard kind="earth"/></aside>
    </div>
    <div className="context-note"><Info size={14}/><span>Geometry uses the selected provider. Surface artwork remains illustrative. Optional terrain center classifications appear on the Analysis page; conditional power/battery and DTE estimates are also available there when requested.</span><Link to="/sites">Explore locations<ArrowRight size={13}/></Link></div>
    <ScientificChartPanel/>
    <AnalysisProvenance/>
    <section className="comparison-preview"><PanelHeader icon={GitCompareArrows} title="Scenario comparison" detail="SCENARIO PREVIEW" action={<TextLink to="/compare">Open comparison</TextLink>}/><div className="scenario-grid">{baseline && <ScenarioCard selection={baseline.selection} label="01 / Baseline" baseline/>}{alternatives.map((item, index) => <ScenarioCard key={item.id} selection={item} label={`0${index + 2} / Alternative`}/>)}{alternatives.length < 2 && <Link to="/compare" className="add-scenario-card"><span>+</span><strong>Add a site/date scenario</strong><p>Configure an alternative landing location or time.</p></Link>}</div></section>
  </>
}
