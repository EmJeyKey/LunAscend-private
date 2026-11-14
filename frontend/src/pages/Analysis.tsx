import { SunMoon } from 'lucide-react'
import { MissionControls } from '../components/MissionControls'
import { ScientificChartPanel } from '../components/ScientificChartPanel'
import { EmptyState, MetricCard, PageHeader, PanelHeader } from '../components/ui'
import { AnalysisProvenance } from '../components/AnalysisProvenance'
import { TerrainVisibilityPanel } from '../components/TerrainVisibilityPanel'
import { EngineeringPanel } from '../components/EngineeringPanel'
import { OperationalConditions } from '../components/OperationalConditions'
import { ScientificDetails } from '../components/PresentationControls'

export function Analysis() {
  return <><PageHeader eyebrow="SUNLIGHT / EARTH / POWER" title="Sunlight & Earth Visibility" description="Inspect Sun, Earth and terrain conditions. Request power and battery estimates when needed."/><div id="mission-configuration"><MissionControls/></div><OperationalConditions/>
    <ScientificDetails><ScientificChartPanel interactive/>
    <div className="two-columns section-gap"><MetricCard kind="solar"/><MetricCard kind="earth"/></div>
    <TerrainVisibilityPanel/><EngineeringPanel/><AnalysisProvenance/>
    <section className="panel"><PanelHeader icon={SunMoon} title="Local sky view"/><EmptyState icon={SunMoon} title="Inspect directions in the Lunar Site Explorer." description="The explorer displays returned Sun/Earth center directions at the shared UTC sample. Use the numerical terrain classifications here; body-disk illumination and validated browser shadows remain unavailable."/></section>
    </ScientificDetails></>
}
