import { ArrowRight, CalendarDays, Clock3, MapPin } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { durationOptions, previewSites } from '../data/preview'
import { toUtc } from '../lib/time'
import { useMission } from '../state/MissionContext'
import type { ProviderMode } from '../types/analysis'

export function MissionControls() {
  const { mission, analysis, options, updateOptions, runAnalysis, invalidate } = useMission()
  const [site, setSite] = useState(mission.site)
  const [hours, setHours] = useState(String(mission.durationHours))
  const [message, setMessage] = useState('')
  useEffect(() => { setSite(mission.site); setHours(String(mission.durationHours)) }, [mission])
  const scientific = options.providerMode === 'scientific'
  function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const startUtc = toUtc(String(new FormData(event.currentTarget).get('start_utc') || ''))
    if (!startUtc) { invalidate(); setMessage('Enter a valid UTC date and time.'); return }
    setMessage('')
    runAnalysis({ site, startUtc, durationHours: Number(hours) })
  }
  return <div className="mission-controls-wrap"><form className="panel analysis-form" onSubmit={apply} onChange={() => { invalidate(); setMessage('') }}>
    <header className="section-introduction"><h2>Mission configuration</h2><p>Choose the site, UTC interval and data source used for this analysis.</p></header>
    <div className="mission-controls">
      <label className="control-field"><span><MapPin size={13}/>LANDING SITE</span><select aria-label="Landing site" value={site.id} onChange={event => setSite(previewSites.find(item => item.id === event.target.value) || { ...site, id: 'custom' })}>{previewSites.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}<option value="custom">Custom coordinates</option></select></label>
      <label className="control-field"><span><CalendarDays size={13}/>START TIME (UTC)</span><input key={mission.startUtc} name="start_utc" aria-label="Landing date and time in UTC" type="datetime-local" step="0.001" required defaultValue={mission.startUtc.replace(/Z$/, '').replace(/\.000$/, '')}/></label>
      <label className="control-field period-field"><span><Clock3 size={13}/>DURATION (HOURS)</span><input aria-label="Analysis duration in hours" type="number" min="0.000001" max="8784" step="any" list="analysis-periods" required value={hours} onChange={event => setHours(event.target.value)}/><datalist id="analysis-periods">{durationOptions.map(value => <option key={value} value={value}/>)}</datalist></label>
      <label className="control-field"><span>DATA SOURCE</span><select aria-label="Data source" value={options.providerMode} onChange={event => updateOptions({ ...options, providerMode: event.target.value as ProviderMode })}><option value="scientific">Scientific SPICE</option><option value="mock">Mock Demonstration</option></select></label>
      <button className="button primary" type="submit" disabled={analysis.status === 'loading'}>{analysis.status === 'loading' ? 'Calculating…' : 'Run Analysis'}<ArrowRight size={16}/></button>
    </div>
    <details className="analysis-settings" open={analysis.status !== 'success'}><summary>Coordinates, heights & sampling</summary><div className="analysis-input-grid">
      <label>Site name<input aria-label="Site name" maxLength={500} required value={site.name} onChange={event => setSite({ ...site, name: event.target.value })}/></label>
      <label>Latitude / ° N<input aria-label="Latitude in degrees" type="number" min="-90" max="90" step="any" required value={Number.isNaN(site.latitude) ? '' : site.latitude} onChange={event => setSite({ ...site, id: 'custom', latitude: event.target.value === '' ? NaN : Number(event.target.value) })}/></label>
      <label>Longitude / ° E<input aria-label="Longitude in degrees" type="number" min="-180" max="179.999999999" step="any" required value={Number.isNaN(site.longitude) ? '' : site.longitude} onChange={event => setSite({ ...site, id: 'custom', longitude: event.target.value === '' ? NaN : Number(event.target.value) })}/></label>
      <label>Surface elevation / m<input aria-label="Surface elevation in meters" type="number" step="any" placeholder="Explicit height above sphere" required={scientific} value={options.surfaceElevationM} onChange={event => updateOptions({ ...options, surfaceElevationM: event.target.value })}/></label>
      <label>Observer height / m<input aria-label="Observer height in meters" type="number" min="0" step="any" required value={options.observerHeightM} onChange={event => updateOptions({ ...options, observerHeightM: event.target.value })}/></label>
      <label>Sample step / s<input aria-label="Sample step in seconds" type="number" min="0.001" step="any" required value={options.sampleStepS} onChange={event => updateOptions({ ...options, sampleStepS: event.target.value })}/></label>
    </div><p>Planetocentric latitude · east-positive longitude. Sites are synthetic input examples, not surveyed landing sites.</p>
    {scientific ? <><p className="frame-note">MOON_ME_DE440_ME421 · DE440/ME421 · sphere radius 1,737,400 m. No coordinate conversion is performed. Enter 0 m only as an explicit sphere-surface assumption.</p><label className="frame-confirm"><input type="checkbox" aria-label="Confirm scientific coordinate reference" checked={options.frameConfirmed} required onChange={event => updateOptions({ ...options, frameConfirmed: event.target.checked })}/>I confirm that these coordinates and heights use this reference frame and sphere.</label></> : <p className="mock-warning">MOCK DATA — NOT LUNAR PREDICTIONS. Heights are not modeled.</p>}
    </details>
  </form>{(message || analysis.message) && <p className="analysis-error" role="alert">{message || analysis.message}</p>}
  <p className="form-feedback" role="status" aria-live="polite">{analysis.status === 'loading' ? 'Requesting observations from the selected provider…' : analysis.status === 'success' ? `${analysis.result?.observations?.length || 0} observations received. Select a sample below.` : 'Configure inputs, then run analysis. Editing inputs clears previous results.'}</p></div>
}
