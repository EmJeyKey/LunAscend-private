import { ArrowUpRight, CircleDashed, Moon, Radio, Sun, Trash2, type LucideIcon } from 'lucide-react'
import { Link } from 'react-router'
import type { PropsWithChildren, ReactNode } from 'react'
import type { MissionSelection } from '../types/preview'
import { formatUtc } from '../lib/time'
import { useMission } from '../state/MissionContext'
import { formatAngle } from '../lib/analysis'
import type { EphemerisObservation, ProviderMode } from '../types/analysis'
import type {AnalysisState} from '../api/analysis'
import { analysisProblem } from '../lib/humanize'

export function StatusBadge({ children, tone = 'neutral' }: PropsWithChildren<{ tone?: 'gold' | 'cyan' | 'green' | 'neutral' }>) {
  return <span className={`status-badge ${tone}`}><span className="status-dot" />{children}</span>
}

export function PageHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return <header className="page-header"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p className="page-description">{description}</p></div>{action}</header>
}

const sectionExplanations: Record<string, string> = {
  'Lunar site overview': 'View the selected location with illustrative surface artwork. This is not a georeferenced terrain map.',
  'Sun/Earth elevation': 'Follow Sun and Earth elevations through the returned UTC samples, relative to the ideal geometric horizon.',
  'Scenario comparison': 'Keep alternative sites and dates side by side. Open Comparison to calculate conditions and requested engineering estimates.',
  'Terrain horizon': 'Local terrain may obstruct low directions. A verified elevation model is required before calculating this horizon.',
  'Local sky view': 'Use the angular readouts to inspect sky directions. A sky diagram is not yet implemented.',
  'Locations': 'Filter the synthetic input locations and choose one to inspect.',
  'Site coordinates': 'Enter a location, then confirm its reference frame and height before scientific analysis.',
  'Engineering trade-offs': 'This area will compare supported engineering results when those models are available.',
  'Landing delay preview': 'Shift the proposed arrival time to inspect the date change. Conditions are not recalculated here.',
  'Power & battery resilience': 'Electrical generation and storage require engineering models that are not yet implemented.',
  'Communication interruptions': 'Terrain clearance and radio-link modeling are required before predicting communication interruptions.',
}

export function PanelHeader({ icon: Icon, title, detail, action }: { icon?: LucideIcon; title: string; detail?: string; action?: ReactNode }) {
  return <><div className="panel-header"><div className="panel-title">{Icon && <Icon size={17} aria-hidden="true" />}<h2>{title}</h2>{detail && <span className="panel-detail">{detail}</span>}</div>{action}</div>{sectionExplanations[title] && <p className="section-explanation">{sectionExplanations[title]}</p>}</>
}

export function EmptyState({ icon: Icon = CircleDashed, title, description }: { icon?: LucideIcon; title: string; description: string }) {
  return <div className="empty-state"><span className="empty-icon"><Icon size={22} strokeWidth={1.4} aria-hidden="true" /></span><h3>{title}</h3><p>{description}</p></div>
}

export function PositionReadout({ kind, observation, provider }: { kind: 'solar' | 'earth'; observation?: EphemerisObservation; provider?: ProviderMode }) {
  const solar = kind === 'solar'
  const Icon = solar ? Sun : Radio
  const elevation = observation?.[solar ? 'sun_elevation_deg' : 'earth_elevation_deg']
  const azimuth = observation?.[solar ? 'sun_azimuth_deg' : 'earth_azimuth_deg']
  return <section className={`panel metric-card ${solar ? 'solar' : 'earth'}`} aria-label={solar ? 'Sun position' : 'Earth position'}>
    <div className="metric-header"><span className="metric-icon"><Icon size={18} strokeWidth={1.6}/></span><div><h2>{solar ? 'Sun position' : 'Earth position'}</h2><p>{solar ? 'SUN ELEVATION' : 'EARTH ELEVATION'}</p></div><StatusBadge>{observation ? provider === 'mock' ? 'MOCK DATA' : 'SPICE' : 'Unavailable'}</StatusBadge></div>
    <p className="section-explanation">Inspect {solar ? 'the Sun’s' : 'Earth’s'} direction at the selected returned UTC sample.</p>
    <div className="primary-metric"><span className={!elevation || elevation.value === null ? 'unavailable-value' : ''}>{formatAngle(elevation, true)}</span></div>
    <dl className="metric-details"><div><dt>Azimuth / clockwise north</dt><dd>{formatAngle(azimuth)}</dd></div><div><dt>Observation UTC</dt><dd className="observation-time">{observation?.time_utc || 'Unavailable'}</dd></div><div><dt>Metric validation</dt><dd>{elevation?.validation || 'Unavailable'}</dd></div><div><dt>{solar ? 'Terrain obstruction' : 'Radio link feasibility'}</dt><dd>{solar ? 'See terrain-qualified results below; elevation alone is insufficient' : 'Not modeled — Earth visibility is possible access only'}</dd></div></dl>
    <p className="metric-footnote">{azimuth?.reason || (provider === 'mock' ? 'MOCK DATA — NOT LUNAR PREDICTIONS' : 'Center direction relative to the geometric horizon. Inspect optional terrain center classifications on Analysis; global visibility remains unknown.')}</p>
  </section>
}

export function MetricCard({ kind }: { kind: 'solar' | 'earth' }) {
  const { observation, analysis, resultsCleared, mission } = useMission()
  if (!observation) return <PositionPending kind={kind} analysis={analysis} resultsCleared={resultsCleared} mission={mission}/>
  return <PositionReadout kind={kind} observation={observation} provider={analysis.result?.provider_mode}/>
}

export function PositionPending({ kind, analysis, resultsCleared, mission }: { kind: 'solar' | 'earth'; analysis: AnalysisState; resultsCleared: boolean; mission: MissionSelection }) {
  const loading = analysis.status === 'loading'
  const failed = analysis.status === 'error'
  const title = kind === 'solar' ? 'Sun position' : 'Earth position'
  return <section className={`panel metric-card position-pending ${kind}`} aria-label={title}>
    <div className="metric-header"><h2>{title}</h2><StatusBadge>{loading ? 'Calculating' : failed ? 'Analysis failed' : analysis.result ? 'No samples' : 'Analysis required'}</StatusBadge></div>
    <p role="status">{loading ? 'Calculating the selected location and date…' : failed ? analysisProblem(analysis.message, analysis.errors) : analysis.result ? 'The analysis returned no observation samples. Inspect the analysis status and provenance.' : resultsCleared ? 'Location, date or settings changed. Run analysis again; previous values were cleared.' : 'Run analysis for this location and date to calculate numerical results. Selecting a map location does not run analysis.'}</p>
    <p>{mission.site.name}<br/><span className="mono">{formatUtc(mission.startUtc, true)} UTC</span></p>
    {!loading && <a className="text-link" href="#mission-configuration">Configure / Run analysis<ArrowUpRight size={15}/></a>}
  </section>
}

export function ScenarioCard({ selection, label, baseline = false, onRemove, analysis }: { selection: MissionSelection; label: string; baseline?: boolean; onRemove?: () => void; analysis?:AnalysisState }) {
  const result=analysis?.result,arrival=result?.observations?.[0]
  return <article className={`scenario-card ${baseline ? 'baseline' : ''}`}>
    <div className="scenario-top"><span className="scenario-label">{label}</span>{onRemove ? <button className="icon-button" onClick={onRemove} aria-label={`Remove ${label}`}><Trash2 size={15} /></button> : <Moon size={15} />}</div>
    <h3>{selection.site.name}</h3><p className="scenario-time">{formatUtc(selection.startUtc, true)} <span>UTC</span></p>
    <div className="scenario-metrics"><div><Sun size={14} /><span>Sun elevation at arrival</span><strong>{formatAngle(arrival?.sun_elevation_deg,true)}</strong></div><div><Radio size={14} /><span>Earth elevation at arrival</span><strong>{formatAngle(arrival?.earth_elevation_deg,true)}</strong></div></div>
    <div className="scenario-footer"><span className="tiny-dot" />{selection.durationHours} h · {result?`${result.observations?.length||0} samples · ${result.provider_mode==='mock'?'MOCK / NOT LUNAR PREDICTIONS':result.status}`:analysis?.status==='loading'?'Calculating…':analysis?.status==='error'?analysis.message:'Run this scenario in Comparison to calculate values.'}</div>
  </article>
}

export function TextLink({ to, children }: PropsWithChildren<{ to: string }>) {
  return <Link className="text-link" to={to}>{children}<ArrowUpRight size={15} /></Link>
}
