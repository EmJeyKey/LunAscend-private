import { ArrowRight, ArrowUpRight, Compass, GitCompareArrows, Info } from 'lucide-react'
import { Link } from 'react-router'
import { MissionControls } from '../components/MissionControls'
import { LunarMapPlaceholder } from '../components/LunarMapPlaceholder'
import { ScientificChartPanel } from '../components/ScientificChartPanel'
import { MetricCard, PageHeader, PanelHeader, ScenarioCard, TextLink } from '../components/ui'
import { useMission } from '../state/MissionContext'

export function Dashboard() {
  const { mission, alternatives } = useMission()
  return <><PageHeader eyebrow="MISSION PLANNING / OVERVIEW" title="Mission Dashboard" description="Every landing begins with a better understanding of the conditions." action={<Link className="button secondary" to="/methodology"><Compass size={16}/>Explore the methodology<ArrowUpRight size={14}/></Link>}/>
    <MissionControls/>
    <div className="dashboard-grid"><LunarMapPlaceholder/><div className="metrics-stack"><MetricCard kind="solar"/><MetricCard kind="earth"/></div></div>
    <div className="context-note"><Info size={14}/><span>You're exploring a visual prototype. Selected coordinates are synthetic inputs; no NASA data is loaded.</span><Link to="/sites">Explore locations<ArrowRight size={13}/></Link></div>
    <ScientificChartPanel/>
    <section className="comparison-preview"><PanelHeader icon={GitCompareArrows} title="Compare the possibilities" detail="SCENARIO PREVIEW" action={<TextLink to="/compare">Open comparison</TextLink>}/><div className="scenario-grid"><ScenarioCard selection={mission} label="01 / Baseline" baseline/>{alternatives.map((item, index) => <ScenarioCard key={item.id} selection={item} label={`0${index + 2} / Alternative`}/>)}{alternatives.length < 2 && <Link to="/compare" className="add-scenario-card"><span>+</span><strong>A different site. A different window.</strong><p>Add another perspective to your mission.</p></Link>}</div></section>
  </>
}
