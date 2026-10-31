import { ArrowUpRight, BookOpen, CalendarDays, ChevronRight, FlaskConical, LayoutDashboard, Map, MapPin, Menu, Moon, Orbit, PanelsTopLeft, RefreshCw, ShieldCheck, SunMoon, X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router'
import { useBackend } from '../hooks/useBackend'
import { formatUtc } from '../lib/time'
import { useMission } from '../state/MissionContext'
import { StatusBadge } from './ui'

const navigation = [
  { to: '/', title: 'Mission Dashboard', icon: LayoutDashboard },
  { to: '/sites', title: 'Lunar Site Explorer', icon: Map },
  { to: '/analysis', title: 'Sun & Earth Analysis', icon: SunMoon },
  { to: '/compare', title: 'Scenario Comparison', icon: PanelsTopLeft },
  { to: '/resilience', title: 'Mission Resilience', icon: Orbit },
  { to: '/methodology', title: 'Scientific Methodology', icon: BookOpen },
]

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  return <><NavLink to="/" className="brand" onClick={onNavigate} aria-label="LunAscend home"><img src="/favicon.svg" alt="" width="39" height="39"/><div><strong>LunAscend</strong><p>LUNAR MISSION RESILIENCE NAVIGATOR</p></div></NavLink>
    <div className="sidebar-label">MISSION WORKSPACE</div><nav aria-label="Main navigation">{navigation.map(({ to, title, icon: Icon }) => <NavLink key={to} to={to} end={to === '/'} onClick={onNavigate} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}><Icon size={18} strokeWidth={1.6}/><span>{title}</span><ChevronRight size={13} className="nav-chevron"/></NavLink>)}</nav>
    <div className="sidebar-bottom"><div className="integrity-note"><ShieldCheck size={20}/><strong>Scientific status</strong><p>Scientific results will be shown with their source, assumptions and validation status.</p><NavLink to="/methodology" onClick={onNavigate}>Methods & assumptions<ArrowUpRight size={13}/></NavLink></div><div className="sidebar-version"><span className="tiny-dot"/>LOCAL PREVIEW<span>v0.2.5</span></div></div></>
}

export function AppShell() {
  const location = useLocation()
  const currentPage = navigation.find(item => item.to === location.pathname)?.title || 'Page not found'
  const { mission, analysis, options } = useMission()
  const { connection, refresh } = useBackend()
  const mobileNav = useRef<HTMLDialogElement>(null)
  const mainRef = useRef<HTMLElement>(null)
  useEffect(() => { document.title = `LunAscend · ${currentPage}`; window.scrollTo(0, 0); mainRef.current?.focus({ preventScroll: true }) }, [currentPage])
  const connected = connection.status === 'connected'

  return <div className="app-shell"><a className="skip-link" href="#main-content">Skip to content</a>
    <aside className="sidebar"><Sidebar/></aside>
    <dialog ref={mobileNav} className="mobile-drawer"><button className="drawer-close icon-button" onClick={() => mobileNav.current?.close()} aria-label="Close navigation"><X size={20}/></button><Sidebar onNavigate={() => mobileNav.current?.close()}/></dialog>
    <div className="app-main"><header className="topbar"><div className="breadcrumb"><button className="mobile-menu icon-button" onClick={() => mobileNav.current?.showModal()} aria-label="Open navigation"><Menu size={20}/></button><span className="workspace-word">Workspace</span><ChevronRight size={13}/><strong>{currentPage}</strong></div><div className="topbar-context"><span><MapPin size={13}/>{mission.site.name}</span><span><CalendarDays size={13}/>{formatUtc(mission.startUtc, true)} UTC</span><StatusBadge tone="gold">{analysis.result ? analysis.result.provider_mode === 'mock' ? 'MOCK DATA' : 'SPICE EPHEMERIS' : options.providerMode === 'mock' ? 'Mock selected' : 'SPICE selected'}</StatusBadge></div></header>
      <main id="main-content" tabIndex={-1} ref={mainRef} className="content"><Outlet/></main>
      <footer className="app-footer"><span><Moon size={13}/>LunAscend<span className="footer-divider">/</span>Scientific analysis workspace</span><button className={`backend-status ${connected ? 'connected' : ''}`} onClick={refresh} disabled={connection.status === 'checking'} aria-label="Check backend connection"><span className="status-dot"/><span role="status">{connection.status === 'checking' ? 'Checking backend…' : connected ? 'Backend connected' : 'Backend disconnected'}</span><RefreshCw size={12}/></button></footer>
      <div className="preview-notice"><FlaskConical size={14}/><span>{analysis.result?.provider_mode === 'mock' ? <strong>MOCK DATA — NOT LUNAR PREDICTIONS</strong> : <strong>GEOMETRY ONLY</strong>} · Surface artwork is illustrative. Terrain, power and communication are not yet calculated.</span></div>
    </div>
  </div>
}
