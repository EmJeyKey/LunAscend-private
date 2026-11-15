import {useLocation} from 'react-router'
import { Crosshair, Info, MapPin } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { LunarExplorer } from '../components/LunarExplorer'
import { ExternalSiteResources } from '../components/ExternalSiteResources'
import { PageHeader, PanelHeader, StatusBadge, TextLink } from '../components/ui'
import { useMission } from '../state/MissionContext'
import { formatCoordinate } from '../lib/time'
import {MissionSummary} from '../components/MissionSummary'
import {SiteChooser} from '../components/SiteChooser'

export function SiteExplorer() {
  const {hash}=useLocation()
  useEffect(()=>{if(hash!=='#moon-viewer')return;const frame=requestAnimationFrame(()=>document.getElementById('moon-viewer')?.scrollIntoView({block:'start'}));return()=>cancelAnimationFrame(frame)},[hash])
  const { mission, updateMission, alternatives, saveAlternative, analysis, options } = useMission()
  const [latitude, setLatitude] = useState(String(mission.site.latitude))
  const [longitude, setLongitude] = useState(String(mission.site.longitude))
  const [name, setName] = useState(mission.site.name)
  useEffect(()=>{setLatitude(String(mission.site.latitude));setLongitude(String(mission.site.longitude));setName(mission.site.name)},[mission.site])
  const [message, setMessage] = useState('')
  function apply(event: FormEvent) {
    event.preventDefault()
    const lat = Number(latitude), lon = Number(longitude)
    if (!name.trim() || latitude.trim() === '' || longitude.trim() === '' || !Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon >= 180) {
      setMessage('Enter a site name, latitude −90 to +90 and east-positive longitude −180 to less than +180.'); return
    }
    updateMission({ ...mission, site: { id: 'custom', name, latitude: lat, longitude: lon, description: 'User-entered coordinates. Confirm the scientific frame and elevation before analysis.' } })
    setMessage('Custom coordinates selected. Confirm the reference frame and height on the Analysis page.')
  }
  return <><PageHeader eyebrow="LUNAR ATLAS / SITE CONTEXT" title="Explore the Moon" description="Choose a location. Explore lunar imagery and available terrain."/>
    <div className="explorer-grid">
      <section className="panel atlas-sites"><details><summary>Choose another NASA location</summary><SiteChooser/></details><PanelHeader icon={Crosshair} title="Site coordinates"/><form className="coordinate-form" onSubmit={apply}><label>Site name<input aria-label="Custom site name" required maxLength={500} value={name} onChange={event => setName(event.target.value)}/></label><label>Latitude / degrees<input aria-label="Custom latitude" type="number" step="any" min="-90" max="90" required value={latitude} onChange={event => setLatitude(event.target.value)}/><small>North positive · planetocentric</small></label><label>Longitude / degrees<input aria-label="Custom longitude" type="number" step="any" min="-180" max="179.999999999" required value={longitude} onChange={event => setLongitude(event.target.value)}/><small>East positive · [−180°, +180°)</small></label><button className="button primary" type="submit">Select coordinates<MapPin size={14}/></button><p className="form-feedback" role="status">{message}</p></form></section>
      <LunarExplorer/>
      <aside className="explorer-sidebar"><section className="panel"><header className="section-introduction"><h2>Selected landing site</h2><p>Review your location and analysis status.</p></header><div className="selected-site-detail"><span className="eyebrow">SELECTED LOCATION</span><strong>{mission.site.name}</strong><p className="scientific-coordinates">{formatCoordinate(mission.site.latitude, true)}<br/>{formatCoordinate(mission.site.longitude, false)}</p><p>{mission.site.description}</p><p>Planetocentric latitude · east-positive longitude. The reference globe uses declared DE440/ME421 inputs; local DEM geometry is reconciled to native DE421.</p><p>Source: {options.providerMode === 'mock' ? 'MOCK / NOT LUNAR PREDICTIONS' : 'Scientific SPICE selected'}. {analysis.status === 'success' ? 'Observations available on Analysis.' : 'No current observations loaded.'}</p><p>Height and lunar reference must be confirmed for scientific analysis.</p><TextLink to="/analysis">Configure analysis</TextLink><button className="button secondary comparison-save" disabled={alternatives.length >= 2} onClick={() => { saveAlternative(); setMessage(analysis.result?'Configuration and its calculated result saved for comparison.':'Configuration saved. Run analysis in Comparison to calculate values.') }}>{alternatives.length >= 2 ? 'Comparison slots full' : 'Add to comparison'}</button><p>Saves this configuration and any matching results. Otherwise, run analysis in Comparison.</p><TextLink to="/compare">Review saved configurations ({alternatives.length}/2)</TextLink><p role="status">{message}</p></div></section></aside>
    </div>
    <MissionSummary/>
    <ExternalSiteResources latitude={mission.site.latitude} longitude={mission.site.longitude} epoch={mission.startUtc}/>
    <div className="info-banner"><Info size={19}/><div><strong>Context globe and finite georeferenced terrain.</strong><p>The globe is a reference sphere without global elevation. Local terrain and polar windows use the selected NASA dataset heights and the exact frame bridge; missing data stays unavailable.</p></div><StatusBadge>Finite DEM coverage</StatusBadge></div>
  </>
}
