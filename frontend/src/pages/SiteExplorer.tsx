import { Crosshair, Info, MapPin } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { LunarExplorer } from '../components/LunarExplorer'
import { ExternalSiteResources } from '../components/ExternalSiteResources'
import { PageHeader, PanelHeader, StatusBadge, TextLink } from '../components/ui'
import { previewSites } from '../data/preview'
import { useMission } from '../state/MissionContext'
import { formatCoordinate } from '../lib/time'

export function SiteExplorer() {
  const { mission, updateMission, alternatives, saveAlternative, analysis, options } = useMission()
  const [latitude, setLatitude] = useState(String(mission.site.latitude))
  const [longitude, setLongitude] = useState(String(mission.site.longitude))
  const [name, setName] = useState(mission.site.name)
  useEffect(()=>{setLatitude(String(mission.site.latitude));setLongitude(String(mission.site.longitude));setName(mission.site.name)},[mission.site])
  const [query, setQuery] = useState('')
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
  const sites = previewSites.filter(site => site.name.toLowerCase().includes(query.toLowerCase()))
  return <><PageHeader eyebrow="LUNAR ATLAS / SITE CONTEXT" title="Lunar Site Explorer" description="Select a location or enter coordinates. Explore a registered reference globe and bounded NASA LOLA terrain; confirm coordinate metadata before loading local data."/>
    <div className="explorer-grid">
      <section className="panel atlas-sites"><PanelHeader icon={MapPin} title="Locations"/><div className="atlas-site-filter"><input aria-label="Filter locations" placeholder="Filter locations" value={query} onChange={event => setQuery(event.target.value)}/></div><div className="site-options">{sites.map(site => <button key={site.id} className={`site-option ${mission.site.id === site.id ? 'selected' : ''}`} onClick={() => { updateMission({ ...mission, site }); setLatitude(String(site.latitude)); setLongitude(String(site.longitude)); setName(site.name); setMessage('Synthetic input location selected.') }}><span><strong>{site.name}</strong><small>Synthetic · not surveyed</small></span><span className="selection-ring"/></button>)}{!sites.length && <p role="status">No matching locations.</p>}</div><PanelHeader icon={Crosshair} title="Site coordinates"/><form className="coordinate-form" onSubmit={apply}><label>Site name<input aria-label="Custom site name" required maxLength={500} value={name} onChange={event => setName(event.target.value)}/></label><label>Latitude / degrees<input aria-label="Custom latitude" type="number" step="any" min="-90" max="90" required value={latitude} onChange={event => setLatitude(event.target.value)}/><small>North positive · planetocentric</small></label><label>Longitude / degrees<input aria-label="Custom longitude" type="number" step="any" min="-180" max="179.999999999" required value={longitude} onChange={event => setLongitude(event.target.value)}/><small>East positive · [−180°, +180°)</small></label><button className="button primary" type="submit">Select coordinates<MapPin size={14}/></button><p className="form-feedback" role="status">{message}</p></form></section>
      <LunarExplorer/>
      <aside className="explorer-sidebar"><section className="panel"><header className="section-introduction"><h2>Selected landing site</h2><p>Inspect the input location and its analysis status before comparing configurations.</p></header><div className="selected-site-detail"><span className="eyebrow">SELECTED LOCATION</span><strong>{mission.site.name}</strong><p className="scientific-coordinates">{formatCoordinate(mission.site.latitude, true)}<br/>{formatCoordinate(mission.site.longitude, false)}</p><p>{mission.site.description}</p><p>Planetocentric latitude · east-positive longitude. The reference globe uses declared DE440/ME421 inputs; local DEM geometry is reconciled to native DE421.</p><p>Source: {options.providerMode === 'mock' ? 'MOCK / NOT LUNAR PREDICTIONS' : 'Scientific SPICE selected'}. {analysis.status === 'success' ? 'Observations available on Analysis.' : 'No current observations loaded.'}</p><p>Height and lunar reference must be confirmed for scientific analysis.</p><TextLink to="/analysis">Configure analysis</TextLink><button className="button secondary comparison-save" disabled={alternatives.length >= 2} onClick={() => { saveAlternative(); setMessage('Configuration saved for comparison; no new results calculated.') }}>{alternatives.length >= 2 ? 'Comparison slots full' : 'Add to comparison'}</button><p>Saves the current site, UTC interval, provider and reference settings. Run it in Comparison.</p><TextLink to="/compare">Review saved configurations ({alternatives.length}/2)</TextLink><p role="status">{message}</p></div></section></aside>
    </div>
    <ExternalSiteResources latitude={mission.site.latitude} longitude={mission.site.longitude} epoch={mission.startUtc}/>
    <div className="info-banner"><Info size={19}/><div><strong>Context globe and finite georeferenced terrain.</strong><p>The globe is a reference sphere without global elevation. Local terrain and polar windows use original Site01 heights and the exact frame bridge; missing data stays unavailable.</p></div><StatusBadge>Finite DEM coverage</StatusBadge></div>
  </>
}
