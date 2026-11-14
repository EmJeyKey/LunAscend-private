import { ArrowRight, GitCompareArrows, Info } from 'lucide-react'
import { Link } from 'react-router'
import { MissionControls } from '../components/MissionControls'
import { LunarExplorer } from '../components/LunarExplorer'
import { ScientificChartPanel } from '../components/ScientificChartPanel'
import { MetricCard, PanelHeader, ScenarioCard, TextLink } from '../components/ui'
import { useMission } from '../state/MissionContext'
import { AnalysisProvenance } from '../components/AnalysisProvenance'
import { AtlasIntroduction } from '../components/AtlasIntroduction'
import { OperationalConditions } from '../components/OperationalConditions'
import { ScientificDetails } from '../components/PresentationControls'
import { usePresentation } from '../state/PresentationContext'

export function Dashboard() {
  const { comparison, alternatives } = useMission()
  const {advanced}=usePresentation()
  const baseline = comparison.scenarios.find(s => s.id === comparison.baselineId)
  return <><AtlasIntroduction/>
    <div className="dashboard-workbench">
      <div id="mission-configuration"><MissionControls compact/></div>
      <LunarExplorer compact/>
      {advanced&&<aside className="metrics-stack" aria-label="Selected sample geometry"><MetricCard kind="solar"/><MetricCard kind="earth"/></aside>}
    </div>
    <div className="context-note"><Info size={14}/><span>Geometry uses the selected provider. The context globe has no global terrain; local DEM visualization uses explicitly confirmed, supported coordinates. Optional terrain center classifications appear on the Analysis page; conditional power/battery and DTE estimates are also available there when requested.</span><Link to="/sites">Explore locations<ArrowRight size={13}/></Link></div>
    <OperationalConditions compact/>
    <ScientificDetails><ScientificChartPanel/><AnalysisProvenance/></ScientificDetails>
    <section className="comparison-preview"><PanelHeader icon={GitCompareArrows} title="Scenario comparison" detail="SCENARIO PREVIEW" action={<TextLink to="/compare">Open comparison</TextLink>}/><div className="scenario-grid">{baseline && <ScenarioCard selection={baseline.selection} label="01 / Baseline" baseline/>}{alternatives.map((item, index) => <ScenarioCard key={item.id} selection={item} label={`0${index + 2} / Alternative`}/>)}{alternatives.length < 2 && <Link to="/compare" className="add-scenario-card"><span>+</span><strong>Add a site/date scenario</strong><p>Configure an alternative landing location or time.</p></Link>}</div></section>
  </>
}
