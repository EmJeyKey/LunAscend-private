import { Crosshair, Info, MapPin } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { LunarMapPlaceholder } from '../components/LunarMapPlaceholder'
import { PageHeader, PanelHeader, StatusBadge } from '../components/ui'
import { previewSites } from '../data/preview'
import { useMission } from '../state/MissionContext'

export function SiteExplorer() {
  const { mission, updateMission } = useMission()
  const [latitude, setLatitude] = useState(String(mission.site.latitude))
  const [longitude, setLongitude] = useState(String(mission.site.longitude))
  const [message, setMessage] = useState('')
  function apply(event: FormEvent) {
    event.preventDefault()
    const lat = Number(latitude), lon = Number(longitude)
    if (latitude.trim() === '' || longitude.trim() === '' || !Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon >= 180) {
      setMessage('Use latitude −90 to +90 and east-positive longitude −180 to less than +180.'); return
    }
    updateMission({ ...mission, site: { id: 'custom', name: 'Custom preview location', latitude: lat, longitude: lon, description: 'User-entered coordinates. Reference frame and elevation are not assigned.' } })
    setMessage('Custom coordinates selected. The artwork is not georeferenced.')
  }
  return <><PageHeader eyebrow="SITE EXPLORATION / CONTEXT" title="Find a new perspective." description="Explore input locations before real lunar terrain and reference frames are connected."/>
    <div className="explorer-grid"><LunarMapPlaceholder large/><div className="explorer-sidebar"><section className="panel"><PanelHeader icon={MapPin} title="Preview locations"/><div className="site-options">{previewSites.map(site => <button key={site.id} className={`site-option ${mission.site.id === site.id ? 'selected' : ''}`} onClick={() => { updateMission({ ...mission, site }); setLatitude(String(site.latitude)); setLongitude(String(site.longitude)); setMessage('Synthetic preview location selected.') }}><span><strong>{site.name}</strong><small>Synthetic location · not surveyed</small></span><span className="selection-ring"/></button>)}</div></section>
    <section className="panel"><PanelHeader icon={Crosshair} title="Custom coordinates"/><form className="coordinate-form" onSubmit={apply}><label>Latitude / degrees<input type="number" step="any" min="-90" max="90" required value={latitude} onChange={event => setLatitude(event.target.value)}/><small>North positive · planetocentric input</small></label><label>Longitude / degrees<input type="number" step="any" min="-180" max="179.999999999" required value={longitude} onChange={event => setLongitude(event.target.value)}/><small>East positive · [−180°, +180°)</small></label><button className="button primary" type="submit">Use preview coordinates<MapPin size={15}/></button><p className="form-feedback" role="status">{message}</p></form></section></div></div>
    <div className="info-banner"><Info size={19}/><div><strong>A canvas for future lunar data.</strong><p>No scale, projection or terrain registration is applied to this illustration. Real sites will require a named lunar frame, reference surface and elevation source.</p></div><StatusBadge>Terrain unavailable</StatusBadge></div>
  </>
}
