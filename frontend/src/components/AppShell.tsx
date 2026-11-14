import { ArrowUpRight, BookOpen, CalendarDays, ChevronRight, FlaskConical, LayoutDashboard, Map, MapPin, Menu, Moon, Orbit, PanelsTopLeft, RefreshCw, ShieldCheck, SunMoon, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router'
import { useBackend } from '../hooks/useBackend'
import { formatUtc } from '../lib/time'
import { useMission } from '../state/MissionContext'
import { StatusBadge } from './ui'
import { PresentationControls,Glossary } from './PresentationControls'
import {usePresentation} from '../state/PresentationContext'

const navigation = [
  { to: '/', title: 'Mission Overview', icon: LayoutDashboard },
  { to: '/sites', title: 'Explore the Moon', icon: Map },
  { to: '/analysis', title: 'Sunlight & Earth Visibility', icon: SunMoon },
  { to: '/compare', title: 'Compare Mission Options', icon: PanelsTopLeft },
  { to: '/resilience', title: 'What If the Mission Is Delayed?', icon: Orbit },
  { to: '/methodology', title: 'How It Works', icon: BookOpen },
]

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  return <><NavLink to="/" className="brand" onClick={onNavigate} aria-label="LunAscend home"><img src="/brand/lunascend-original.png" alt="LunAscend golden lunar orbit logo" width="190" height="143"/></NavLink>
    <div className="sidebar-label">MISSION WORKSPACE</div><nav aria-label="Main navigation">{navigation.map(({ to, title, icon: Icon }) => <NavLink key={to} to={to} end={to === '/'} onClick={onNavigate} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}><Icon size={18} strokeWidth={1.6}/><span>{title}</span><ChevronRight size={13} className="nav-chevron"/></NavLink>)}</nav>
    <div className="sidebar-bottom"><div className="integrity-note"><ShieldCheck size={20}/><strong>Understand the limits</strong><p>Terrain coverage is limited. Power and battery results depend on your assumptions. Seeing Earth does not guarantee a radio connection.</p><NavLink to="/methodology" onClick={onNavigate}>Sources & assumptions<ArrowUpRight size={13}/></NavLink></div><div className="sidebar-version"><span className="tiny-dot"/>LOCAL WORKSPACE<span>v0.6</span></div></div></>
}

export function AppShell() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const {mode}=usePresentation()
  const location = useLocation()
  const currentPage = navigation.find(item => item.to === location.pathname)?.title || 'Page not found'
  const { mission, analysis, options, comparison } = useMission()
  const comparing = location.pathname === '/compare'
  const headerMission = comparing ? comparison.scenarios.find(s => s.id === comparison.baselineId)?.selection || mission : mission
  const comparisonModes = new Set(comparison.scenarios.map(s => s.options.providerMode))
  const comparisonMock = comparing && comparisonModes.has('mock')
  const sourceLabel = comparing ? comparisonModes.size > 1 ? 'MIXED PROVIDERS' : comparisonModes.has('mock') ? 'MOCK SCENARIOS' : comparisonModes.size ? 'SPICE SCENARIOS' : 'No scenarios' : analysis.result ? analysis.result.provider_mode === 'mock' ? 'MOCK DATA' : 'SPICE EPHEMERIS' : options.providerMode === 'mock' ? 'Mock selected' : 'SPICE selected'
  const { connection, refresh } = useBackend()
  const mobileNav = useRef<HTMLDialogElement>(null)
  const mainRef = useRef<HTMLElement>(null)
  useEffect(() => { document.title = `LunAscend · ${currentPage}`; window.scrollTo(0, 0); mainRef.current?.focus({ preventScroll: true }) }, [currentPage])
  const connected = connection.status === 'connected'

  return <div className={`app-shell mode-${mode}${sidebarCollapsed ? ' sidebar-collapsed' : ''}`}><a className="skip-link" href="#main-content">Skip to content</a>
    <aside id="desktop-sidebar" className="sidebar" inert={sidebarCollapsed}><Sidebar/></aside>
    <dialog ref={mobileNav} className="mobile-drawer"><button className="drawer-close icon-button" onClick={() => mobileNav.current?.close()} aria-label="Close navigation"><X size={20}/></button><Sidebar onNavigate={() => mobileNav.current?.close()}/></dialog>
    <div className="app-main"><header className="topbar"><div className="breadcrumb"><button type="button" className="sidebar-toggle" onClick={() => setSidebarCollapsed(value => !value)} aria-controls="desktop-sidebar" aria-expanded={!sidebarCollapsed} title={sidebarCollapsed ? 'Show sidebar' : 'Hide sidebar'}><Menu size={18}/><span>{sidebarCollapsed ? 'Show sidebar' : 'Hide sidebar'}</span></button><button className="mobile-menu icon-button" onClick={() => mobileNav.current?.showModal()} aria-label="Open navigation"><Menu size={20}/></button><span className="workspace-word">Workspace</span><ChevronRight size={13}/><strong>{currentPage}</strong></div><div className="topbar-context"><span><MapPin size={13}/>{headerMission.site.name || 'Unnamed site'}</span><span><CalendarDays size={13}/>{Number.isFinite(Date.parse(headerMission.startUtc)) ? `${formatUtc(headerMission.startUtc, true)} UTC` : 'UTC required'}</span><StatusBadge tone="gold">{sourceLabel}</StatusBadge></div></header>
      <main id="main-content" tabIndex={-1} ref={mainRef} className="content"><PresentationControls/><Outlet/><Glossary/></main>
      <footer className="app-footer"><span><Moon size={13}/>LunAscend<span className="footer-divider">/</span>Scientific analysis workspace</span><button className={`backend-status ${connected ? 'connected' : ''}`} onClick={refresh} disabled={connection.status === 'checking'} aria-label="Check backend connection"><span className="status-dot"/><span role="status">{connection.status === 'checking' ? 'Checking backend…' : connected ? 'Backend connected' : 'Backend disconnected'}</span><RefreshCw size={12}/></button></footer>
      <div className="preview-notice"><FlaskConical size={14}/><span>{(comparisonMock || (!comparing && analysis.result?.provider_mode === 'mock')) ? <strong>MOCK DATA — NOT LUNAR PREDICTIONS</strong> : <strong>{(comparing ? comparison.scenarios.some(s => s.analysis.result?.terrain_visibility) : !!analysis.result?.terrain_visibility) ? 'TERRAIN CENTER MODEL' : 'GEOMETRY ONLY'}</strong>} · Optical photographs and LOLA elevations are separate datasets. Rendered lighting is illustrative. Terrain coverage is limited; engineering estimates depend on selected assumptions. A radio link budget is not modeled.</span></div>
    </div>
  </div>
}
