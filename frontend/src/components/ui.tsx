import { ArrowUpRight, CircleDashed, Moon, Radio, Sun, Trash2, type LucideIcon } from 'lucide-react'
import { Link } from 'react-router'
import type { PropsWithChildren, ReactNode } from 'react'
import type { MissionSelection } from '../types/preview'
import { formatUtc } from '../lib/time'

export function StatusBadge({ children, tone = 'neutral' }: PropsWithChildren<{ tone?: 'gold' | 'cyan' | 'green' | 'neutral' }>) {
  return <span className={`status-badge ${tone}`}><span className="status-dot" />{children}</span>
}

export function PageHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return <header className="page-header"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p className="page-description">{description}</p></div>{action}</header>
}

export function PanelHeader({ icon: Icon, title, detail, action }: { icon?: LucideIcon; title: string; detail?: string; action?: ReactNode }) {
  return <div className="panel-header"><div className="panel-title">{Icon && <Icon size={17} aria-hidden="true" />}<h2>{title}</h2>{detail && <span className="panel-detail">{detail}</span>}</div>{action}</div>
}

export function EmptyState({ icon: Icon = CircleDashed, title, description }: { icon?: LucideIcon; title: string; description: string }) {
  return <div className="empty-state"><span className="empty-icon"><Icon size={22} strokeWidth={1.4} aria-hidden="true" /></span><h3>{title}</h3><p>{description}</p></div>
}

export function MetricCard({ kind }: { kind: 'solar' | 'earth' }) {
  const solar = kind === 'solar'
  const Icon = solar ? Sun : Radio
  return <section className={`panel metric-card ${solar ? 'solar' : 'earth'}`} aria-label={solar ? 'Solar analysis' : 'Communication analysis'}>
    <div className="metric-header"><span className="metric-icon"><Icon size={18} strokeWidth={1.6} /></span><div><h2>{solar ? 'Solar illumination' : 'Earth line of sight'}</h2><p>{solar ? 'SUN ELEVATION' : 'EARTH ELEVATION'}</p></div><StatusBadge>Unavailable</StatusBadge></div>
    <div className="primary-metric"><span aria-label="Unavailable">—</span><span className="metric-unit">deg</span><span className="metric-state">Awaiting ephemeris</span></div>
    <dl className="metric-details"><div><dt>{solar ? 'Solar visibility' : 'Earth line of sight'}</dt><dd>Unavailable</dd></div><div><dt>{solar ? 'Next sunset' : 'Next Earthset'}</dt><dd>— <span>UTC</span></dd></div><div><dt>{solar ? 'Illumination duration' : 'Communication availability'}</dt><dd>{solar ? '— h' : 'Not modeled'}</dd></div></dl>
    <p className="metric-footnote">{solar ? 'No solar geometry has been calculated.' : 'Earth visibility alone does not establish a radio link.'}</p>
  </section>
}

export function ScenarioCard({ selection, label, baseline = false, onRemove }: { selection: MissionSelection; label: string; baseline?: boolean; onRemove?: () => void }) {
  return <article className={`scenario-card ${baseline ? 'baseline' : ''}`}>
    <div className="scenario-top"><span className="scenario-label">{label}</span>{onRemove ? <button className="icon-button" onClick={onRemove} aria-label={`Remove ${label}`}><Trash2 size={15} /></button> : <Moon size={15} />}</div>
    <h3>{selection.site.name}</h3><p className="scenario-time">{formatUtc(selection.startUtc, true)} <span>UTC</span></p>
    <div className="scenario-metrics"><div><Sun size={14} /><span>Sunlight</span><strong>— h</strong></div><div><Radio size={14} /><span>Earth visibility</span><strong>— h</strong></div></div>
    <div className="scenario-footer"><span className="tiny-dot" />{selection.durationHours} h preview · results unavailable</div>
  </article>
}

export function TextLink({ to, children }: PropsWithChildren<{ to: string }>) {
  return <Link className="text-link" to={to}>{children}<ArrowUpRight size={15} /></Link>
}
