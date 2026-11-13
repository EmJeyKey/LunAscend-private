import { SunMoon } from 'lucide-react'
import { MissionControls } from '../components/MissionControls'
import { ScientificChartPanel } from '../components/ScientificChartPanel'
import { EmptyState, MetricCard, PageHeader, PanelHeader } from '../components/ui'
import { AnalysisProvenance } from '../components/AnalysisProvenance'
import { TerrainVisibilityPanel } from '../components/TerrainVisibilityPanel'
import { EngineeringPanel } from '../components/EngineeringPanel'

export function Analysis() {
  return <><PageHeader eyebrow="GEOMETRY / VISIBILITY" title="Sun & Earth Analysis" description="Sun/Earth elevation, terrain horizon and visibility windows."/><MissionControls/><ScientificChartPanel interactive/>
    <div className="two-columns section-gap"><MetricCard kind="solar"/><MetricCard kind="earth"/></div>
    <TerrainVisibilityPanel/><EngineeringPanel/><AnalysisProvenance/>
    <section className="panel"><PanelHeader icon={SunMoon} title="Local sky view"/><EmptyState icon={SunMoon} title="Inspect directions in the Lunar Site Explorer." description="The explorer displays returned Sun/Earth center directions at the shared UTC sample. Use the numerical terrain classifications here; body-disk illumination and validated browser shadows remain unavailable."/></section>
  </>
}
