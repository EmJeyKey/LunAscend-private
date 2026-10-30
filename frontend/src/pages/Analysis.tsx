import { ScanLine, SunMoon } from 'lucide-react'
import { MissionControls } from '../components/MissionControls'
import { ScientificChartPanel } from '../components/ScientificChartPanel'
import { EmptyState, MetricCard, PageHeader, PanelHeader } from '../components/ui'

export function Analysis() {
  return <><PageHeader eyebrow="GEOMETRY / VISIBILITY" title="Sun & Earth Analysis" description="One timeline for the light, the horizon and the connection home."/><MissionControls/><ScientificChartPanel interactive/>
    <div className="two-columns section-gap"><MetricCard kind="solar"/><MetricCard kind="earth"/></div>
    <div className="two-columns section-gap"><section className="panel"><PanelHeader icon={ScanLine} title="Terrain horizon"/><EmptyState icon={ScanLine} title="The horizon is still unknown." description="Directional terrain obstruction requires a verified lunar elevation model and observer height."/></section><section className="panel"><PanelHeader icon={SunMoon} title="Local sky view"/><EmptyState icon={SunMoon} title="Directions need a reference frame." description="Azimuth and elevation indicators will use validated backend observations, never decorative positions."/></section></div>
  </>
}
