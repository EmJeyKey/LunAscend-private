import { ChartNoAxesCombined, Clock3, Radio, Sun } from 'lucide-react'
import { useState } from 'react'
import { useMission } from '../state/MissionContext'
import { chartData, formatAngle, linePath } from '../lib/analysis'
import type { ScenarioResult } from '../types/analysis'
import { PanelHeader, StatusBadge } from './ui'

export function ElevationPlot({ result, index, onSelect }: { result: ScenarioResult; index: number; onSelect: (index: number) => void }) {
  const data = chartData(result.observations || [])
  const [hover, setHover] = useState<number | null>(null)
  if (!data.length) return <p>No observations returned.</p>
  const first = data[0].time, last = data[data.length - 1].time
  const x = (time: number) => 54 + (last === first ? .5 : (time - first) / (last - first)) * 814
  const y = (value: number) => 16 + (90 - value) / 180 * 224
  const activeIndex = Math.max(0, Math.min(data.length - 1, index))
  const tooltipIndex = hover ?? activeIndex
  const tooltip = result.observations![tooltipIndex]
  const pick = (event: React.PointerEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const coordinate = (event.clientX - rect.left) / rect.width * 900
    const time = first + Math.max(0, Math.min(1, (coordinate - 54) / 814)) * (last - first)
    return data.reduce((best, row, i) => Math.abs(row.time - time) < Math.abs(data[best].time - time) ? i : best, 0)
  }
  return <><svg className="elevation-plot" viewBox="0 0 900 285" role="img" aria-label="Sun and Earth elevation against UTC. Gold Sun, dashed cyan Earth. Zero degrees is the ideal geometric horizon. Use the sample slider for keyboard inspection." onPointerMove={event => setHover(pick(event))} onPointerLeave={() => setHover(null)} onClick={event => { const rect = event.currentTarget.getBoundingClientRect(); const time = first + Math.max(0, Math.min(1, ((event.clientX - rect.left) / rect.width * 900 - 54) / 814)) * (last - first); onSelect(data.reduce((best, row, i) => Math.abs(row.time - time) < Math.abs(data[best].time - time) ? i : best, 0)) }}>
    {[-90, -60, -30, 0, 30, 60, 90].map(value => <g key={value}><line x1="54" x2="868" y1={y(value)} y2={y(value)} className={value === 0 ? 'geometric-line' : 'elevation-grid'}/><text x="45" y={y(value) + 4} textAnchor="end">{value > 0 ? '+' : ''}{value}°</text></g>)}
    <text x="60" y={y(0) - 6} className="horizon-label">0° geometric horizon</text>
    <path d={linePath(data, 'sun', x, y)} className="sun-curve"/><path d={linePath(data, 'earth', x, y)} className="earth-curve"/>
    <line x1={x(data[activeIndex].time)} x2={x(data[activeIndex].time)} y1="16" y2="240" className="sample-cursor"/>
    {(['sun', 'earth'] as const).map(key => data[activeIndex][key] !== null && <circle key={key} cx={x(data[activeIndex].time)} cy={y(data[activeIndex][key]!)} r="4" className={key === 'sun' ? 'sun-point' : 'earth-point'}/>)}
    {[0, .25, .5, .75, 1].map(fraction => { const time = first + fraction * (last - first); return <text key={fraction} x={x(time)} y="261" textAnchor={fraction === 0 ? 'start' : fraction === 1 ? 'end' : 'middle'}>{new Date(time).toISOString().slice(5, 16).replace('T', ' ')}</text> })}
    <text x="460" y="282" textAnchor="middle">Time (UTC) · elevation (degrees)</text>
  </svg><div className="chart-tooltip" aria-live="off"><time>{tooltip.time_utc}</time><span className="sun-text">Sun {formatAngle(tooltip.sun_elevation_deg, true)}</span><span className="earth-text">Earth {formatAngle(tooltip.earth_elevation_deg, true)}</span></div></>
}

export function ScientificChartPanel({ interactive = false }: { interactive?: boolean }) {
  const { analysis, sampleIndex, selectSample, observation } = useMission()
  const result = analysis.result
  const series = result?.observations || []
  return <section className="panel timeline-panel">
    <PanelHeader icon={ChartNoAxesCombined} title="Sun/Earth elevation" detail={result ? `${series.length} SAMPLES` : 'GEOMETRY ONLY'} action={<StatusBadge tone={result?.provider_mode === 'mock' ? 'gold' : 'cyan'}>{result ? result.provider_mode === 'mock' ? 'MOCK DATA' : 'SPICE EPHEMERIS' : analysis.status === 'loading' ? 'Calculating…' : 'No observations'}</StatusBadge>}/>
    {result?.provider_mode === 'mock' && <p className="mock-warning chart-warning">MOCK DATA — NOT LUNAR PREDICTIONS</p>}
    <figure className="scientific-figure"><figcaption className="chart-legend"><span><i className="gold-line"/>Sun elevation (deg)</span><span><i className="cyan-line"/>Earth elevation (deg)</span><span><i className="gray-line"/>0° geometric horizon</span></figcaption>
      {result ? <ElevationPlot key={result.scenario_id} result={result} index={sampleIndex} onSelect={selectSample}/> : <div className="empty-chart"><span className="elevation-axis">Elevation (deg)</span><div className="chart-grid" aria-hidden="true">{['+60', '+30', '0', '−30'].map(value => <div key={value}><span>{value}</span></div>)}</div><div className="plot-status" role="status"><strong>{analysis.status === 'loading' ? 'Requesting ephemeris observations…' : 'No observations to display.'}</strong><span>{analysis.status === 'error' ? 'Analysis failed. Correct the inputs or connection and retry.' : 'Choose a provider and run analysis.'}</span></div></div>}
    </figure>
    {(interactive || result) && <div className="time-control"><label htmlFor="observation-time"><Clock3 size={15}/>Observation sample (UTC)<span>{observation?.time_utc || 'No sample selected'}</span></label><input id="observation-time" aria-label="Observation sample" type="range" min="0" max={Math.max(0, series.length - 1)} value={sampleIndex} disabled={!series.length} onChange={event => selectSample(Number(event.target.value))}/><p>Cursor selects returned samples only. Gaps remain unavailable; no interpolation or new requests.</p></div>}
    <p className="geometry-note">Positive center elevation is above the ideal geometric horizon; local terrain visibility is unknown.</p>
    <div className="availability-tracks" aria-label="Visibility windows not yet calculated"><div><span><Sun size={13}/>Solar visibility</span><div className="availability-track gold-track">NOT YET CALCULATED</div></div><div><span><Radio size={13}/>Direct-to-Earth line of sight</span><div className="availability-track cyan-track">NOT YET CALCULATED</div></div></div>
  </section>
}
