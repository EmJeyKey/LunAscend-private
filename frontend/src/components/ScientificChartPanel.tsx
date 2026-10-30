import { ChartNoAxesCombined, Clock3, Radio, Sun } from 'lucide-react'
import { useState } from 'react'
import { formatUtc, shiftHours } from '../lib/time'
import { useMission } from '../state/MissionContext'
import { EmptyState, PanelHeader, StatusBadge } from './ui'

export function ScientificChartPanel({ interactive = false }: { interactive?: boolean }) {
  const { mission } = useMission()
  const [position, setPosition] = useState(0)
  return <section className="panel timeline-panel">
    <PanelHeader icon={ChartNoAxesCombined} title="Sun & Earth timeline" detail={`${mission.durationHours} h window`} action={<StatusBadge>Awaiting analysis</StatusBadge>}/>
    <div className="chart-legend"><span><i className="gold-line"/>Sun elevation</span><span><i className="cyan-line"/>Earth elevation</span><span><i className="gray-line"/>Terrain horizon</span><span className="chart-unit">ELEVATION / DEG</span></div>
    <div className="empty-chart"><div className="chart-grid" aria-hidden="true">{['+60°', '+30°', '0°', '−30°'].map(value => <div key={value}><span>{value}</span></div>)}</div>{interactive && <span className="chart-cursor" style={{ left: `${8 + position * .88}%` }}/>}<EmptyState icon={ChartNoAxesCombined} title="A clearer picture, once the science is ready." description="Sun, Earth and terrain curves will appear here when analysis is available."/></div>
    <div className="chart-ticks">{[0, .25, .5, .75, 1].map(fraction => <span key={fraction}>{formatUtc(shiftHours(mission.startUtc, mission.durationHours * fraction), true)}<small>UTC</small></span>)}</div>
    <div className="availability-tracks"><div><span><Sun size={13}/>Solar availability</span><div className="availability-track gold-track">No calculated windows</div></div><div><span><Radio size={13}/>Earth line of sight</span><div className="availability-track cyan-track">No calculated windows</div></div></div>
    {interactive && <div className="time-control"><label htmlFor="preview-time"><Clock3 size={15}/>Explore time <span>{formatUtc(shiftHours(mission.startUtc, mission.durationHours * position / 100))} UTC</span></label><input id="preview-time" type="range" min="0" max="100" value={position} onChange={event => setPosition(Number(event.target.value))}/><p>Interface cursor only. No observations are generated.</p></div>}
  </section>
}
