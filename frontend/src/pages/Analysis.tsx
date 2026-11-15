import {TerrainTimePlots} from '../components/TerrainTimePlots'
import { MissionControls } from '../components/MissionControls'
import { ScientificChartPanel } from '../components/ScientificChartPanel'
import { MetricCard, PageHeader } from '../components/ui'
import {MissionReport} from '../components/MissionReport'
import { TerrainVisibilityPanel } from '../components/TerrainVisibilityPanel'
import { EngineeringPanel } from '../components/EngineeringPanel'

export function Analysis() {
 return <><PageHeader eyebrow="SUNLIGHT / EARTH / POWER" title="Sunlight & Earth Visibility" description="Configure your mission, calculate conditions, then review the results."/><div id="mission-configuration"><MissionControls/></div>
 <MissionReport geometry={<><ScientificChartPanel interactive/><div className="two-columns section-gap"><MetricCard kind="solar"/><MetricCard kind="earth"/></div></>} terrain={<><TerrainTimePlots/><TerrainVisibilityPanel/></>} power={<EngineeringPanel section="power"/>} communications={<EngineeringPanel section="communications"/>}/></>
}
