import { BrowserRouter, Link, Route, Routes } from 'react-router'
import { AppShell } from './components/AppShell'
import { EmptyState } from './components/ui'
import { Analysis } from './pages/Analysis'
import { Comparison } from './pages/Comparison'
import { Dashboard } from './pages/Dashboard'
import { Methodology } from './pages/Methodology'
import { Resilience } from './pages/Resilience'
import { SiteExplorer } from './pages/SiteExplorer'
import { MissionProvider } from './state/MissionContext'

export default function App() {
  return <BrowserRouter><MissionProvider><Routes><Route element={<AppShell/>}>
    <Route index element={<Dashboard/>}/><Route path="sites" element={<SiteExplorer/>}/>
    <Route path="analysis" element={<Analysis/>}/><Route path="compare" element={<Comparison/>}/>
    <Route path="resilience" element={<Resilience/>}/><Route path="methodology" element={<Methodology/>}/>
    <Route path="*" element={<><EmptyState title="Page not found." description="The requested page does not exist in this preview."/><Link className="button secondary" to="/">Return to dashboard</Link></>}/>
  </Route></Routes></MissionProvider></BrowserRouter>
}
