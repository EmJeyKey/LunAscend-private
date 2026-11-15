import { ChartNoAxesCombined, Clock3, Radio, Sun } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useMission } from '../state/MissionContext'
import { chartData, formatAngle, linePath } from '../lib/analysis'
import type { ScenarioResult } from '../types/analysis'
import { PanelHeader, StatusBadge } from './ui'

export function ElevationPlot({ result, index, onSelect }: { result: ScenarioResult; index: number; onSelect: (index: number) => void }) {
  const data = chartData(result.observations || [])
  const [hover, setHover] = useState<number | null>(null)
  const [width, setWidth] = useState(900)
  const svgRef = useRef<SVGSVGElement>(null)
  useEffect(() => {
    const observer = new ResizeObserver(entries => setWidth(Math.max(360, entries[0].contentRect.width)))
    if (svgRef.current) observer.observe(svgRef.current)
    return () => observer.disconnect()
  }, [])
  if (!data.length) return <p>No observations returned.</p>
  const first = data[0].time, last = data[data.length - 1].time
  const x = (time: number) => 54 + (last === first ? .5 : (time - first) / (last - first)) * (width - 86)
  const values=data.flatMap(row=>[row.sun,row.earth]).filter((v):v is number=>v!==null)
  const span=Math.max(1,Math.max(0,...values)-Math.min(0,...values)),padding=span*.12
  const low=Math.max(-90,Math.min(0,...values)-padding),high=Math.min(90,Math.max(0,...values)+padding)
  const y = (value: number) => 16 + (high - value) / (high-low) * 224
  const activeIndex = Math.max(0, Math.min(data.length - 1, index))
  const tooltipIndex = hover ?? activeIndex
  const tooltip = result.observations![tooltipIndex]
  const pick = (event: React.PointerEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const coordinate = (event.clientX - rect.left) / rect.width * width
    const time = first + Math.max(0, Math.min(1, (coordinate - 54) / (width - 86))) * (last - first)
    return data.reduce((best, row, i) => Math.abs(row.time - time) < Math.abs(data[best].time - time) ? i : best, 0)
  }
  return <><svg ref={svgRef} className="elevation-plot" data-axis-min={low} data-axis-max={high} data-plot-width={width} viewBox={`0 0 ${width} 285`} role="img" aria-label="Sun and Earth elevation against UTC. Gold Sun, dashed cyan Earth. Zero degrees is the ideal geometric horizon. Use the sample slider for keyboard inspection." onPointerMove={event => setHover(pick(event))} onPointerLeave={() => setHover(null)} onClick={event => { const rect = event.currentTarget.getBoundingClientRect(); const time = first + Math.max(0, Math.min(1, ((event.clientX - rect.left) / rect.width * width - 54) / (width - 86))) * (last - first); onSelect(data.reduce((best, row, i) => Math.abs(row.time - time) < Math.abs(data[best].time - time) ? i : best, 0)) }}>
    {Array.from(new Set([low,low+(high-low)/4,low+(high-low)/2,low+3*(high-low)/4,high,0])).filter(value=>value===0||Math.abs(value)>(high-low)*.08).sort((a,b)=>a-b).map(value => <g key={value}><line x1="54" x2={width - 32} y1={y(value)} y2={y(value)} className={value === 0 ? 'geometric-line' : 'elevation-grid'}/><text x="45" y={y(value) + 4} textAnchor="end">{value > 0 ? '+' : ''}{value.toFixed(2)}°</text></g>)}
    <text x="60" y={y(0) - 6} className="horizon-label">0° geometric horizon</text>
    <path d={linePath(data, 'sun', x, y)} className="sun-curve"/><path d={linePath(data, 'earth', x, y)} className="earth-curve"/>
    <line x1={x(data[activeIndex].time)} x2={x(data[activeIndex].time)} y1="16" y2="240" className="sample-cursor"/>
    {(['sun','earth'] as const).flatMap(key=>data.map((row,i)=>row[key]===null?null:<circle key={`${key}-${row.utc}`} data-graph-series={`${key}_elevation_deg`} data-utc={row.utc} data-value={row[key]} cx={x(row.time)} cy={y(row[key]!)} r={i===activeIndex?4:2.2} className={key==='sun'?'sun-point':'earth-point'}><title>{row.utc} · {key} {row[key]}°</title></circle>))}
    {(width < 500 ? [0, .5, 1] : [0, .25, .5, .75, 1]).map(fraction => { const time = first + fraction * (last - first); return <text key={fraction} x={x(time)} y="261" textAnchor={fraction === 0 ? 'start' : fraction === 1 ? 'end' : 'middle'}>{new Date(time).toISOString().slice(last - first < 600000 ? 11 : 5, last - first < 10000 ? 23 : last - first < 600000 ? 19 : 16).replace('T', ' ')}</text> })}
    <text x={width / 2} y="282" textAnchor="middle">Time (UTC) · geometric center elevation (degrees)</text>
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
    <p className="geometry-note">Positive center elevation is above the ideal geometric horizon. {result?.terrain_visibility ? 'Terrain-qualified classifications appear in the Analysis terrain panel.' : 'Local terrain visibility is unknown.'}</p>
    {!result?.terrain_visibility && <div className="availability-tracks" aria-label="Visibility windows not yet calculated"><div><span><Sun size={13}/>Solar visibility</span><div className="availability-track gold-track">NOT YET CALCULATED</div></div><div><span><Radio size={13}/>Direct-to-Earth line of sight</span><div className="availability-track cyan-track">NOT YET CALCULATED</div></div></div>}
  </section>
}
