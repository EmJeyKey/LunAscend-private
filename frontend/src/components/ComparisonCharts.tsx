import { useEffect, useRef, useState, type CSSProperties } from 'react'
import type { ComparisonScenario } from '../state/ComparisonStore'
import { chartData, formatAngle, linePath } from '../lib/analysis'
import { nearestSample, timeAtElapsed } from '../lib/comparison'

function AlignedPlot({ scenario, hours, span, onSelect }: { scenario: ComparisonScenario; hours: number; span: number; onSelect: (hours: number) => void }) {
  const [width, setWidth] = useState(700)
  const ref = useRef<SVGSVGElement>(null)
  useEffect(() => {
    const observer = new ResizeObserver(entries => setWidth(Math.max(320, entries[0].contentRect.width)))
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [scenario.analysis.result])
  const result = scenario.analysis.result
  if (!result) return <p className="comparison-chart-empty">{scenario.analysis.status === 'error' ? 'Scenario failed. Successful scenarios remain available.' : 'Run this scenario to display returned observations.'}</p>
  const data = chartData(result.observations || [])
  const start = Date.parse(result.request.start_utc)
  const x = (time: number) => 45 + (time - start) / (span * 3600000) * (width - 62)
  const y = (angle: number) => 14 + (90 - angle) / 180 * 150
  const index = nearestSample(result, hours)
  const row = index === null ? null : result.observations![index]
  return <><svg ref={ref} viewBox={`0 0 ${width} 208`} className="comparison-plot elevation-plot" role="img" aria-label={`${scenario.name}: Sun gold, Earth cyan elevation in degrees; elapsed hours since its own UTC start.`} onClick={event => { const rect = event.currentTarget.getBoundingClientRect(); onSelect(Math.max(0, Math.min(span, ((event.clientX - rect.left) / rect.width * width - 45) / (width - 62) * span))) }}>
    {[-90, -45, 0, 45, 90].map(angle => <g key={angle}><line x1="45" x2={width - 17} y1={y(angle)} y2={y(angle)} className={angle === 0 ? 'geometric-line' : 'elevation-grid'}/><text x="37" y={y(angle) + 4} textAnchor="end">{angle}°</text></g>)}
    <path d={linePath(data, 'sun', x, y)} className="sun-curve"/><path d={linePath(data, 'earth', x, y)} className="earth-curve"/>
    <line x1={x(timeAtElapsed(result, hours))} x2={x(timeAtElapsed(result, hours))} y1="14" y2="164" className="sample-cursor"/>
    {row && (['sun', 'earth'] as const).map(body => row[`${body}_elevation_deg`].value !== null && <circle key={body} cx={x(Date.parse(row.time_utc))} cy={y(row[`${body}_elevation_deg`].value!)} r="3" className={`${body}-point`}/>)}
    {[0, .5, 1].map(f => <text key={f} x={45 + f * (width - 62)} y="186" textAnchor={f === 0 ? 'start' : f === 1 ? 'end' : 'middle'}>{(span * f).toLocaleString('en', { maximumFractionDigits: 3 })} h</text>)}
    <text x={width / 2} y="204" textAnchor="middle">Elapsed hours · elevation (degrees)</text>
  </svg><div className="chart-tooltip comparison-tooltip"><span>Start UTC: {result.request.start_utc}</span><span>Target UTC: {new Date(timeAtElapsed(result, hours)).toISOString()}</span><span>Nearest returned sample: {row?.time_utc || 'Outside this scenario interval'}</span>{row && <><span className="sun-text">Sun {formatAngle(row.sun_elevation_deg, true)}</span><span className="earth-text">Earth {formatAngle(row.earth_elevation_deg, true)}</span></>}</div></>
}
export function ComparisonCharts({ scenarios, baselineId }: { scenarios: ComparisonScenario[]; baselineId: string }) {
  const [cursor, setCursor] = useState(0)
  const span = Math.max(1 / 3600000, ...scenarios.map(s => Number.isFinite(s.selection.durationHours) && s.selection.durationHours > 0 && s.selection.durationHours <= 8784 ? s.selection.durationHours : 0))
  const hours = cursor / 1000 * span
  return <section className="panel comparison-charts" aria-label="Aligned scenario charts"><header className="section-introduction"><h2>Aligned Sun & Earth geometry</h2><p>Elapsed-time mode: each scenario starts at its own UTC epoch. Different dates are not simultaneous.</p></header>
    <div className="chart-legend"><span><i className="gold-line"/>Sun / degrees</span><span><i className="cyan-line"/>Earth / degrees</span><span><i className="gray-line"/>0° ideal geometric horizon</span></div>
    <label className="comparison-cursor">Shared elapsed cursor: {hours.toLocaleString('en', { maximumFractionDigits: 3 })} h<input aria-label="Comparison elapsed time" type="range" min="0" max="1000" step="1" value={cursor} onChange={event => setCursor(Number(event.target.value))}/></label>
    <div className="comparison-chart-grid" style={{ '--scenario-count': Math.max(1, scenarios.length) } as CSSProperties}>{scenarios.map((scenario, index) => <figure key={scenario.id}><figcaption>{index + 1} / {scenario.name || 'Unnamed scenario'}{scenario.id === baselineId ? ' · Baseline' : ''} · {scenario.options.providerMode === 'mock' ? 'MOCK / NOT LUNAR PREDICTIONS' : 'SPICE'}</figcaption><AlignedPlot scenario={scenario} hours={hours} span={span} onSelect={value => setCursor(Math.round(value / span * 1000))}/></figure>)}</div>
    <p className="geometry-note">Lines join available samples linearly and break at missing values. Cursor readouts select the nearest returned sample, with its actual UTC; they do not interpolate measurements. Crossings between samples are estimates. No terrain, communication or power availability is calculated.</p>
  </section>
}
