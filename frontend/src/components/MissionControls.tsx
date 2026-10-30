import { ArrowRight, CalendarDays, Clock3, MapPin } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { durationOptions, previewSites } from '../data/preview'
import { toUtc } from '../lib/time'
import { useMission } from '../state/MissionContext'

export function MissionControls() {
  const { mission, updateMission } = useMission()
  const [siteId, setSiteId] = useState(mission.site.id)
  const [hours, setHours] = useState(mission.durationHours)
  const [message, setMessage] = useState('')
  useEffect(() => { setSiteId(mission.site.id); setHours(mission.durationHours) }, [mission])

  function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const startUtc = toUtc(String(new FormData(event.currentTarget).get('start_utc') || ''))
    if (!startUtc) { setMessage('Enter a valid UTC date and time.'); return }
    const site = previewSites.find(item => item.id === siteId) || mission.site
    updateMission({ site, startUtc, durationHours: hours })
    setMessage('Preview updated. Scientific results remain unavailable.')
  }

  return <div className="mission-controls-wrap"><form className="mission-controls panel" onSubmit={apply}>
    <label className="control-field"><span><MapPin size={13} /> LANDING SITE <span className="field-hint">SYNTHETIC</span></span><select aria-label="Landing site" value={siteId} onChange={event => setSiteId(event.target.value)}>{previewSites.map(site => <option key={site.id} value={site.id}>{site.name}</option>)}{!previewSites.some(site => site.id === mission.site.id) && <option value={mission.site.id}>{mission.site.name}</option>}</select></label>
    <label className="control-field"><span><CalendarDays size={13} /> LANDING DATE & TIME <span className="field-hint">UTC</span></span><input key={mission.startUtc} name="start_utc" aria-label="Landing date and time in UTC" type="datetime-local" min="2000-01-01T00:00" max="2100-12-31T23:59" required defaultValue={mission.startUtc.slice(0, 16)} /></label>
    <label className="control-field period-field"><span><Clock3 size={13} /> ANALYSIS PERIOD</span><select aria-label="Analysis period" value={hours} onChange={event => setHours(Number(event.target.value))}>{durationOptions.map(value => <option key={value} value={value}>{value} hours</option>)}</select></label>
    <button className="button primary" type="submit">Update preview<ArrowRight size={16} /></button>
  </form><p className="form-feedback" role="status">{message}</p></div>
}
