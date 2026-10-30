import { ChartNoAxesCombined, Clock3, Radio, Sun } from 'lucide-react'
import { useState } from 'react'
import { formatUtc, shiftHours } from '../lib/time'
import { useMission } from '../state/MissionContext'
import { PanelHeader, StatusBadge } from './ui'

export function ScientificChartPanel({ interactive = false }: { interactive?: boolean }) {
  const { mission } = useMission()
  const [position, setPosition] = useState(0)
  return <section className="panel timeline-panel">
    <PanelHeader icon={ChartNoAxesCombined} title="Sun/Earth elevation & visibility" detail={`${mission.durationHours} h interval`} action={<StatusBadge>Data unavailable</StatusBadge>}/>
    <figure className="scientific-figure" aria-label="Sun and Earth elevation chart. No observations or calculated curves are available.">
      <figcaption className="chart-legend">
        <span><i className="gold-line"/>Sun elevation (deg)</span>
        <span><i className="cyan-line"/>Earth elevation (deg)</span>
        <span><i className="gray-line"/>Terrain horizon (deg)</span>
      </figcaption>
      <div className="empty-chart">
        <span className="elevation-axis">Elevation (deg)</span>
        <div className="chart-grid" aria-hidden="true">
          {['+60', '+30', '0', '−30'].map(value => <div key={value}><span>{value}</span></div>)}
          {interactive && <span className="chart-cursor" style={{ left: `${position}%` }}/>}
        </div>
        <div className="plot-status" role="status"><strong>No ephemeris data available.</strong><span>Sun/Earth observations and terrain horizon are unavailable.</span></div>
      </div>
      <div className="chart-ticks">{[0, .25, .5, .75, 1].map(fraction => <span key={fraction}>{formatUtc(shiftHours(mission.startUtc, mission.durationHours * fraction), true)}</span>)}</div>
      <div className="time-axis">Time (UTC)</div>
    </figure>
    <div className="availability-tracks" aria-label="Visibility windows unavailable">
      <div><span><Sun size={13}/>Solar visibility</span><div className="availability-track gold-track">Unavailable — no calculated windows</div></div>
      <div><span><Radio size={13}/>Direct-to-Earth line of sight</span><div className="availability-track cyan-track">Unavailable — no calculated windows</div></div>
    </div>
    {interactive && <div className="time-control"><label htmlFor="preview-time"><Clock3 size={15}/>Preview cursor (UTC)<span>{formatUtc(shiftHours(mission.startUtc, mission.durationHours * position / 100))} UTC</span></label><input id="preview-time" type="range" min="0" max="100" value={position} onChange={event => setPosition(Number(event.target.value))}/><p>Cursor changes the displayed time only. No observations are generated.</p></div>}
  </section>
}
