import { EngineeringOptions } from './EngineeringOptions'
import { ArrowRight, CalendarDays, Clock3, MapPin } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { durationOptions, previewSites } from '../data/preview'
import { toUtc } from '../lib/time'
import { useMission } from '../state/MissionContext'
import type { ProviderMode } from '../types/analysis'
import { TerrainOptions } from './TerrainOptions'
import type { MissionSelection } from '../types/preview'
import {usePresentation} from '../state/PresentationContext'
import {fullAnalysisOptions,initialEngineering} from '../lib/engineering'

export function MissionControls({ compact = false, onDraftChange }: { compact?: boolean; onDraftChange?: (draft: MissionSelection) => void }) {
  const { mission, updateMission, analysis, options, updateOptions, runAnalysis, invalidate } = useMission()
  const {advanced}=usePresentation()
  const [site, setSite] = useState(mission.site)
  const [hours, setHours] = useState(String(mission.durationHours))
  const [message, setMessage] = useState('')
  const startInput = useRef<HTMLInputElement>(null)
  const [dateVersion, setDateVersion] = useState(0)
  useEffect(() => { setSite(mission.site); setHours(String(mission.durationHours)) }, [mission])
  // Optional consumer of the existing form draft: resilience must never calculate
  // an older committed site/date while edited inputs are visible in this form.
  useEffect(() => { onDraftChange?.({site,startUtc:toUtc(startInput.current?.value || '') || '',durationHours:Number(hours)}) }, [site,hours,mission,dateVersion,onDraftChange])
  const scientific = options.providerMode === 'scientific'
  function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const startUtc = toUtc(String(new FormData(event.currentTarget).get('start_utc') || ''))
    if (!startUtc) { invalidate(); setMessage('Enter a valid UTC date and time.'); return }
    setMessage('')
    const full=(event.nativeEvent as SubmitEvent).submitter?.getAttribute('value')==='full'
    if(full&&!options.frameConfirmed){const details=event.currentTarget.querySelector('details');if(details)details.open=true}
    runAnalysis({ site, startUtc, durationHours: Number(hours) },full?fullAnalysisOptions(options):options)
  }
  return <div className="mission-controls-wrap"><form id="mission-analysis-form" className="panel analysis-form" onSubmit={apply} onInvalid={event => { const details = (event.target as HTMLElement).closest('details'); if (details) details.open = true;setMessage('Check the highlighted location, height or reference setting before running analysis.') }} onChange={() => { invalidate(); setMessage('') }}>
    <header className="section-introduction"><h2>Plan this mission</h2><p>Set location, landing time and duration. All times are UTC.</p></header>
    <div className="mission-controls">
      <label className="control-field"><span><MapPin size={13}/>LANDING SITE</span><select aria-label="Landing site" value={site.id} onChange={event => setSite(previewSites.find(item => item.id === event.target.value) || { ...site, id: 'custom' })}>{previewSites.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}<option value="custom">Custom coordinates</option></select></label>
      <label className="control-field"><span><CalendarDays size={13}/>START TIME (UTC)</span><input ref={startInput} key={mission.startUtc} name="start_utc" aria-label="Landing date and time in UTC" type="datetime-local" step="0.001" required defaultValue={mission.startUtc.replace(/Z$/, '').replace(/\.000$/, '')} onInput={()=>{setDateVersion(v=>v+1);invalidate()}}/></label>
      <label className="control-field period-field"><span><Clock3 size={13}/>DURATION (HOURS)</span><input aria-label="Analysis duration in hours" type="number" min="0.000001" max="8784" step="any" list="analysis-periods" required value={hours} onChange={event => setHours(event.target.value)}/><datalist id="analysis-periods">{durationOptions.map(value => <option key={value} value={value}/>)}</datalist></label>
      <label className="control-field"><span>DATA SOURCE</span><select aria-label="Data source" value={options.providerMode} onChange={event => updateOptions({ ...options, providerMode: event.target.value as ProviderMode, terrainEnabled: event.target.value === 'scientific' && options.terrainEnabled, powerEnabled: event.target.value === 'scientific' && options.powerEnabled, communicationEnabled: event.target.value === 'scientific' && options.communicationEnabled })}><option value="scientific">Scientific SPICE</option><option value="mock">Mock Demonstration</option></select></label>
      <button className="button primary" type="submit" disabled={analysis.status === 'loading'}>{analysis.status === 'loading' ? 'Calculating…' : 'Run Analysis'}<ArrowRight size={16}/></button>
      <button className="button secondary" type="submit" value="full" formNoValidate disabled={!scientific||analysis.status==='loading'}>Run Full Analysis</button>
    </div>
    <p className="mission-setup-help">{scientific?'Scientific analysis needs confirmed lunar coordinates and a known surface height or supported LOLA terrain. Open the settings below, or start with the documented Site01 example.':'Mock mode shows illustrative curves only; it cannot predict a lunar mission.'}</p>
    {scientific&&<p className="mission-setup-help">Run Analysis uses selected options: terrain {options.terrainEnabled?'on':'off'}, power/battery {options.powerEnabled?'on':'off'}, DTE {options.communicationEnabled?'on':'off'}. Run Full Analysis explicitly requests all three for this site/date, with the panel and battery settings below. Current assumptions: {(options.engineering||initialEngineering).panel_area_m2} m² panels, {(options.engineering||initialEngineering).orientation_mode.replaceAll('_',' ')}, {(options.engineering||initialEngineering).baseline_load_w} W base load, {(options.engineering||initialEngineering).battery_capacity_wh} Wh battery. Coordinate confirmation is still required; coverage is checked by the backend. No opportunity search is started.</p>}
    {scientific && <button className="text-link terrain-example" type="button" onClick={() => {
      updateMission({ site: { id: 'custom', name: 'LOLA Site01 example', latitude: -89.46315760953222, longitude: -137.50097847854008, description: 'Documented Site01 DEM pixel-center example, converted to DE440/ME421 at the original landing epoch; not a surveyed or approved landing site.' }, startUtc: '2026-11-14T00:00:00.000Z', durationHours: 24 })
      updateOptions({ ...options, terrainEnabled: true, observerHeightM: '2', sampleStepS: '3600', frameConfirmed: false })
    }}>Load Site01 example · confirm frame before analysis</button>}
    <details className="analysis-settings" open={advanced&&!compact?analysis.status!=='success':undefined}><summary>Location, terrain & power settings</summary><div className="analysis-input-grid">
      <label>Site name<input aria-label="Site name" maxLength={500} required value={site.name} onChange={event => setSite({ ...site, name: event.target.value })}/></label>
      <label>Latitude / ° N<input aria-label="Latitude in degrees" type="number" min="-90" max="90" step="any" required value={Number.isNaN(site.latitude) ? '' : site.latitude} onChange={event => setSite({ ...site, id: 'custom', latitude: event.target.value === '' ? NaN : Number(event.target.value) })}/></label>
      <label>Longitude / ° E<input aria-label="Longitude in degrees" type="number" min="-180" max="179.999999999" step="any" required value={Number.isNaN(site.longitude) ? '' : site.longitude} onChange={event => setSite({ ...site, id: 'custom', longitude: event.target.value === '' ? NaN : Number(event.target.value) })}/></label>
      <label>Surface elevation / m<input aria-label="Surface elevation in meters" type="number" step="any" placeholder={options.terrainEnabled ? 'Derived from LOLA DEM' : 'Explicit height above sphere'} disabled={options.terrainEnabled} required={scientific && !options.terrainEnabled} value={options.terrainEnabled ? '' : options.surfaceElevationM} onChange={event => updateOptions({ ...options, surfaceElevationM: event.target.value })}/></label>
      <label>Observer height / m<input aria-label="Observer height in meters" type="number" min="0" step="any" required value={options.observerHeightM} onChange={event => updateOptions({ ...options, observerHeightM: event.target.value })}/></label>
      <label>Sample step / s<input aria-label="Sample step in seconds" type="number" min="0.001" step="any" required value={options.sampleStepS} onChange={event => updateOptions({ ...options, sampleStepS: event.target.value })}/></label>
    </div><p>Planetocentric latitude · east-positive longitude. Sites are synthetic input examples, not surveyed landing sites.</p>
    {scientific ? <><p className="frame-note">MOON_ME_DE440_ME421 · DE440/ME421 · sphere radius 1,737,400 m. {options.terrainEnabled ? 'Exact per-epoch DE421 conversion; DEM surface height plus observer height.' : 'No coordinate conversion is performed. Enter 0 m only as an explicit sphere-surface assumption.'}</p><label className="frame-confirm"><input type="checkbox" aria-label="Confirm scientific coordinate reference" checked={options.frameConfirmed} required onChange={event => updateOptions({ ...options, frameConfirmed: event.target.checked })}/>I confirm that these coordinates and heights use this reference frame and sphere.</label></> : <p className="mock-warning">MOCK DATA — NOT LUNAR PREDICTIONS. Heights are not modeled.</p>}
    <TerrainOptions options={options} onChange={updateOptions}/><EngineeringOptions options={options} onChange={updateOptions}/>
    </details>
  </form>{(message || analysis.message) && <p className="analysis-error" role="alert">{message || analysis.message}</p>}
  <p className="form-feedback" role="status" aria-live="polite">{analysis.status === 'loading' ? 'Requesting observations from the selected provider…' : analysis.status === 'success' ? `${analysis.result?.observations?.length || 0} observations received. Select a sample below.` : 'Configure inputs, then run analysis. Editing inputs clears previous results.'}</p></div>
}
