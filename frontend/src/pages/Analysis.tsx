import { ScanLine, SunMoon } from 'lucide-react'
import { MissionControls } from '../components/MissionControls'
import { ScientificChartPanel } from '../components/ScientificChartPanel'
import { EmptyState, MetricCard, PageHeader, PanelHeader } from '../components/ui'
import { AnalysisProvenance } from '../components/AnalysisProvenance'

export function Analysis() {
  return <><PageHeader eyebrow="GEOMETRY / VISIBILITY" title="Sun & Earth Analysis" description="Sun/Earth elevation, terrain horizon and visibility windows."/><MissionControls/><ScientificChartPanel interactive/>
    <div className="two-columns section-gap"><MetricCard kind="solar"/><MetricCard kind="earth"/></div>
    <AnalysisProvenance/>
    <div className="two-columns section-gap"><section className="panel"><PanelHeader icon={ScanLine} title="Terrain horizon"/><EmptyState icon={ScanLine} title="NOT YET CALCULATED" description="Directional terrain obstruction requires a verified lunar elevation model and observer height."/></section><section className="panel"><PanelHeader icon={SunMoon} title="Local sky view"/><EmptyState icon={SunMoon} title="Sky diagram not implemented." description="Use the returned azimuth and elevation readouts above. Terrain visibility remains unknown."/></section></div>
  </>
}
