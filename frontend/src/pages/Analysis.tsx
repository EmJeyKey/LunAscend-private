import { SunMoon } from 'lucide-react'
import { MissionControls } from '../components/MissionControls'
import { ScientificChartPanel } from '../components/ScientificChartPanel'
import { EmptyState, MetricCard, PageHeader, PanelHeader } from '../components/ui'
import { AnalysisProvenance } from '../components/AnalysisProvenance'
import { TerrainVisibilityPanel } from '../components/TerrainVisibilityPanel'

export function Analysis() {
  return <><PageHeader eyebrow="GEOMETRY / VISIBILITY" title="Sun & Earth Analysis" description="Sun/Earth elevation, terrain horizon and visibility windows."/><MissionControls/><ScientificChartPanel interactive/>
    <div className="two-columns section-gap"><MetricCard kind="solar"/><MetricCard kind="earth"/></div>
    <TerrainVisibilityPanel/><AnalysisProvenance/>
    <section className="panel"><PanelHeader icon={SunMoon} title="Local sky view"/><EmptyState icon={SunMoon} title="Sky diagram not implemented." description="Use the returned azimuth, elevation and terrain clearance readouts. No 3D or body-disk model is implemented."/></section>
  </>
}
