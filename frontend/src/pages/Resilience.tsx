import { BatteryCharging, Clock3, Radio, RotateCcw } from 'lucide-react'
import { useState } from 'react'
import { EmptyState, PageHeader, PanelHeader, ScenarioCard, StatusBadge } from '../components/ui'
import { formatUtc, shiftHours } from '../lib/time'
import { useMission } from '../state/MissionContext'

export function Resilience() {
  const { mission } = useMission()
  const [delay, setDelay] = useState(24)
  const shifted = { ...mission, startUtc: shiftHours(mission.startUtc, delay) }
  return <><PageHeader eyebrow="RESILIENCE / WHAT IF" title="Mission Resilience" description="Landing-time offsets and future power/communication impact analysis."/>
    <div className="workflow-strip" aria-label="Mission delay workflow"><span>01 / ORIGINAL MISSION</span>→<span>02 / DELAYED MISSION</span>→<span>03 / ALTERNATIVE OPPORTUNITIES · PENDING</span></div><section className="panel delay-panel"><PanelHeader icon={Clock3} title="Landing delay preview" action={<StatusBadge tone="gold">Interface only</StatusBadge>}/><div className="delay-controls"><div><span className="eyebrow">SHIFT THE LANDING WINDOW</span><div className="delay-number">{delay > 0 ? '+' : ''}{delay}<span>hours</span></div></div><div className="delay-slider"><label htmlFor="landing-delay">Landing date shift</label><input id="landing-delay" type="range" min="-72" max="72" step="6" value={delay} onChange={event => setDelay(Number(event.target.value))}/><div><span>−72 h</span><span>Baseline</span><span>+72 h</span></div></div><button className="button secondary" onClick={() => setDelay(0)}><RotateCcw size={15}/>Reset</button></div><p className="delay-caption">Preview arrival: <strong>{formatUtc(shifted.startUtc)} UTC</strong>. This changes timestamps only; conditions are not recalculated.</p></section>
    <div className="two-columns section-gap"><ScenarioCard selection={mission} label="01 / Baseline" baseline/><ScenarioCard selection={shifted} label="02 / Shifted landing"/></div>
    <div className="two-columns section-gap"><section className="panel"><PanelHeader icon={BatteryCharging} title="Power & battery resilience"/><EmptyState icon={BatteryCharging} title="Power analysis unavailable." description="Future estimates will state panel orientation, efficiency, load and battery assumptions. Sunlight alone is not usable electrical power."/></section><section className="panel"><PanelHeader icon={Radio} title="Communication interruptions"/><EmptyState icon={Radio} title="No blackout prediction is available." description="Future windows will distinguish geometric Earth visibility, terrain obstruction and actual radio-link performance."/></section></div>
  </>
}
