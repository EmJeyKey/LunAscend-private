import {needsCatalogEpoch,resolveCatalogEpoch} from '../lib/apollo'
import {Link} from 'react-router'
import { EngineeringOptions } from './EngineeringOptions'
import { ArrowRight, CalendarDays, Clock3, MapPin } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { durationOptions } from '../data/preview'
import { toUtc } from '../lib/time'
import { useMission } from '../state/MissionContext'
import type { ProviderMode } from '../types/analysis'
import { TerrainOptions } from './TerrainOptions'
import type { MissionSelection } from '../types/preview'
import {usePresentation} from '../state/PresentationContext'
import {supportedTerrainOptions,initialEngineering} from '../lib/engineering'

export function MissionControls({ compact = false, onDraftChange }: { compact?: boolean; onDraftChange?: (draft: MissionSelection) => void }) {
  const { mission, updateMission, analysis, options, updateOptions, runAnalysis, invalidate } = useMission()
  const {advanced}=usePresentation()
  const [site, setDraftSite] = useState(mission.site)
  const editSite=(value:MissionSelection['site'])=>{
    setDraftSite(value)
    if(value.name.trim()&&Number.isFinite(value.latitude)&&Number.isFinite(value.longitude)&&Math.abs(value.latitude)<=90&&value.longitude>=-180&&value.longitude<180){
      updateMission({...mission,site:value})
      if(value.latitude!==mission.site.latitude||value.longitude!==mission.site.longitude)updateOptions({...options,frameConfirmed:false,coordinateEpochUtc:undefined})
    }
  }
  const [hours, setHours] = useState(String(mission.durationHours))
  const [message, setMessage] = useState('')
  const coverageJob=useRef<AbortController|null>(null)
  useEffect(()=>{coverageJob.current?.abort()},[mission,options])
  useEffect(()=>()=>coverageJob.current?.abort(),[])
  const startInput = useRef<HTMLInputElement>(null)
  const [dateVersion, setDateVersion] = useState(0)
  useEffect(() => { setDraftSite(mission.site); setHours(String(mission.durationHours)) }, [mission])
  // Optional consumer of the existing form draft: resilience must never calculate
  // an older committed site/date while edited inputs are visible in this form.
  useEffect(() => { onDraftChange?.({site,startUtc:toUtc(startInput.current?.value || '') || '',durationHours:Number(hours)}) }, [site,hours,mission,dateVersion,onDraftChange])
  const scientific = options.providerMode === 'scientific'
  async function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const startUtc = toUtc(String(new FormData(event.currentTarget).get('start_utc') || ''))
    if (!startUtc) { invalidate(); setMessage('Enter a valid UTC date and time.'); return }
    setMessage('')
    const full=(event.nativeEvent as SubmitEvent).submitter?.getAttribute('value')==='full'
    if(full&&!options.frameConfirmed){const details=event.currentTarget.querySelector('details');if(details)details.open=true}
    let selection={site,startUtc,durationHours:Number(hours)},settings=options
    coverageJob.current?.abort();const controller=new AbortController();coverageJob.current=controller
    if(full||(scientific&&settings.terrainEnabled)){
      try{
        setMessage('Checking installed terrain coverage…')
        if(needsCatalogEpoch(selection,settings)){const resolved=await resolveCatalogEpoch(selection,settings,controller.signal);selection=resolved.selection;settings=resolved.options}
        const response=await fetch(`${import.meta.env.VITE_API_BASE_URL||'/backend'}/api/v1/terrain/coverage`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({dataset_id:settings.terrainDatasetId||'lola-site01-5m-v2020',latitude_deg:selection.site.latitude,longitude_deg:selection.site.longitude,reference_frame:'MOON_ME_DE440_ME421',coordinate_epoch_utc:startUtc}),signal:AbortSignal.any([controller.signal,AbortSignal.timeout(60000)])})
        if(!response.ok)throw new Error('Terrain coverage could not be verified. Run geometry only using selected options, or retry the backend.')
        const coverage=await response.json()
        if(controller.signal.aborted)return
        if(coverage.dataset_id===null){
          if(!settings.surfaceElevationM.trim())throw new Error('No installed terrain at this location. Enter an explicit surface-height assumption and confirm the frame to calculate geometry. Power, battery and terrain-qualified DTE remain unavailable.')
          settings={...settings,terrainEnabled:false,powerEnabled:false,communicationEnabled:false,coverageNote:{siteId:selection.site.id,startUtc,reason:typeof coverage.reason==='string'?coverage.reason:'No installed terrain supports this location.'}}
          setMessage('Geometry requested. No installed terrain supports this coordinate; power, battery and terrain-qualified DTE are unavailable.')
        }else{
          settings=supportedTerrainOptions(settings,coverage,full)
          setMessage('Verified local DEM selected. Terrain-center visibility requested; finite coverage does not establish global clearance.')
        }
      }catch(error){if(!controller.signal.aborted)setMessage(error instanceof Error?error.message:'Coverage check failed.');return}
    }
    if(!controller.signal.aborted)runAnalysis(selection,settings)
  }
  return <div className="mission-controls-wrap"><form id="mission-analysis-form" className="panel analysis-form" onSubmit={apply} onInvalid={event => { const details = (event.target as HTMLElement).closest('details'); if (details) details.open = true;setMessage('Check the highlighted location, height or reference setting before running analysis.') }} onChange={() => { coverageJob.current?.abort();invalidate(); setMessage('') }}>
    <header className="section-introduction"><h2>Plan this mission</h2><p>Set location, landing time and duration. All times are UTC.</p></header>
    <div className="mission-controls">
      <label className="control-field"><span><MapPin size={13}/>LANDING SITE</span><strong>{site.name}</strong><Link to="/">Choose another NASA site</Link></label>
      <label className="control-field"><span><CalendarDays size={13}/>START TIME (UTC)</span><input ref={startInput} key={mission.startUtc} name="start_utc" aria-label="Landing date and time in UTC" type="datetime-local" step="0.001" required defaultValue={mission.startUtc.replace(/Z$/, '').replace(/\.000$/, '')} onInput={()=>{setDateVersion(v=>v+1);invalidate()}} onBlur={event=>{const utc=toUtc(event.target.value);if(utc&&Date.parse(utc)!==Date.parse(mission.startUtc))updateMission({...mission,startUtc:utc})}}/></label>
      <label className="control-field period-field"><span><Clock3 size={13}/>DURATION (HOURS)</span><input aria-label="Analysis duration in hours" type="number" min="0.000001" max="8784" step="any" list="analysis-periods" required value={hours} onChange={event => {setHours(event.target.value);const duration=Number(event.target.value);if(Number.isFinite(duration)&&duration>0&&duration<=8784)updateMission({...mission,durationHours:duration})}}/><datalist id="analysis-periods">{durationOptions.map(value => <option key={value} value={value}/>)}</datalist></label>
      <label className="control-field"><span>DATA SOURCE</span><select aria-label="Data source" value={options.providerMode} onChange={event => updateOptions({ ...options, providerMode: event.target.value as ProviderMode, terrainEnabled: event.target.value === 'scientific' && options.terrainEnabled, powerEnabled: event.target.value === 'scientific' && options.powerEnabled, communicationEnabled: event.target.value === 'scientific' && options.communicationEnabled })}><option value="scientific">Scientific SPICE</option></select></label>
      <button className="button primary" type="submit" disabled={analysis.status === 'loading'}>{analysis.status === 'loading' ? 'Calculating…' : options.terrainEnabled?'Run Analysis':'Run Geometry Only'}<ArrowRight size={16}/></button>
      <button className="button secondary" type="submit" value="full" formNoValidate disabled={!scientific||analysis.status==='loading'}>Run Full Analysis</button>
    </div>
    <p className="mission-setup-help">{scientific?'Scientific analysis needs confirmed lunar coordinates and a known surface height or supported LOLA terrain. Open the settings below, or start with the documented Site01 example.':'Mock mode shows illustrative curves only; it cannot predict a lunar mission.'}</p>
    {scientific&&<section className="analysis-run-guide" aria-label="Analysis options explained">
      <div><strong>{options.terrainEnabled?'Run Analysis':'Run Geometry Only'}</strong><p>{options.terrainEnabled?'Checks installed terrain and calculates center visibility with your selected engineering options.':'Sun/Earth positions only. Enable terrain below to request obstruction classifications.'}</p><ul className="analysis-option-status"><li>Terrain: <b>{options.terrainEnabled?'On':'Off'}</b></li><li>Power / battery: <b>{options.powerEnabled?'On':'Off'}</b></li><li>Earth access (DTE): <b>{options.communicationEnabled?'On':'Off'}</b></li></ul></div>
      <div><strong>Run Full Analysis</strong><p>Checks installed terrain, then requests supported terrain, power, battery and Earth-access results.</p><p>Without terrain: geometry only, with an explicit surface height.</p></div>
      <div className="analysis-hardware-summary"><strong>Hardware assumptions</strong><p>{(options.engineering||initialEngineering).panel_area_m2} m² panels · {(options.engineering||initialEngineering).orientation_mode.replaceAll('_',' ')} · {(options.engineering||initialEngineering).baseline_load_w} W base load · {(options.engineering||initialEngineering).battery_capacity_wh} Wh battery</p></div>
      <p className="analysis-run-note">Confirm coordinates in the settings below. Neither action starts an opportunity search.</p>
    </section>}
    {scientific && <button className="text-link terrain-example" type="button" onClick={() => {
      updateMission({ site: { id: 'custom', name: 'LOLA Site01 example', latitude: -89.46315760953222, longitude: -137.50097847854008, description: 'Documented Site01 DEM pixel-center example, converted to DE440/ME421 at the original landing epoch; not a surveyed or approved landing site.' }, startUtc: '2026-11-14T00:00:00.000Z', durationHours: 24 })
      updateOptions({ ...options, terrainDatasetId: undefined, coordinateEpochUtc: undefined, terrainEnabled: true, observerHeightM: '2', sampleStepS: '3600', frameConfirmed: false })
    }}>Load Site01 example · confirm frame before analysis</button>}
    <details className="analysis-settings" open={advanced&&!compact?analysis.status!=='success':undefined}><summary>Location, terrain & power settings</summary><div className="analysis-input-grid">
      <label>Site name<input aria-label="Site name" maxLength={500} required value={site.name} onChange={event => editSite({ ...site, name: event.target.value })}/></label>
      <label>Latitude / ° N<input aria-label="Latitude in degrees" type="number" min="-90" max="90" step="any" required value={Number.isNaN(site.latitude) ? '' : site.latitude} onChange={event => editSite({ ...site, id: 'custom', native:undefined, category:'user-selected', latitude: event.target.value === '' ? NaN : Number(event.target.value) })}/></label>
      <label>Longitude / ° E<input aria-label="Longitude in degrees" type="number" min="-180" max="179.999999999" step="any" required value={Number.isNaN(site.longitude) ? '' : site.longitude} onChange={event => editSite({ ...site, id: 'custom', native:undefined, category:'user-selected', longitude: event.target.value === '' ? NaN : Number(event.target.value) })}/></label>
      <label>Surface elevation / m<input aria-label="Surface elevation in meters" type="number" step="any" placeholder={options.terrainEnabled ? 'Derived from LOLA DEM' : 'Explicit height above sphere'} disabled={options.terrainEnabled} required={scientific && !options.terrainEnabled} value={options.terrainEnabled ? '' : options.surfaceElevationM} onChange={event => updateOptions({ ...options, surfaceElevationM: event.target.value })}/></label>
      <label>Observer height / m<input aria-label="Observer height in meters" type="number" min="0" step="any" required value={options.observerHeightM} onChange={event => updateOptions({ ...options, observerHeightM: event.target.value })}/></label>
      <label>Sample step / s<input aria-label="Sample step in seconds" type="number" min="0.001" step="any" required value={options.sampleStepS} onChange={event => updateOptions({ ...options, sampleStepS: event.target.value })}/></label>
    </div><p>Planetocentric latitude · east-positive longitude. Catalog locations are source reference points, not approved landing sites.</p>
    {scientific ? <><p className="frame-note">MOON_ME_DE440_ME421 · DE440/ME421 · sphere radius 1,737,400 m. {options.terrainEnabled ? 'Exact per-epoch DE421 conversion; DEM surface height plus observer height.' : 'No coordinate conversion is performed. Enter 0 m only as an explicit sphere-surface assumption.'}</p><label className="frame-confirm"><input type="checkbox" aria-label="Confirm scientific coordinate reference" checked={options.frameConfirmed} required onChange={event => updateOptions({ ...options, frameConfirmed: event.target.checked })}/>I confirm that these coordinates and heights use this reference frame and sphere.</label></> : <p className="mock-warning">MOCK DATA — NOT LUNAR PREDICTIONS. Heights are not modeled.</p>}
    <TerrainOptions options={options} onChange={updateOptions}/><EngineeringOptions options={options} onChange={updateOptions}/>
    </details>
  </form>{(message || analysis.message) && <p className="analysis-error" role="alert">{message || analysis.message}</p>}
  <p className="form-feedback" role="status" aria-live="polite">{analysis.status === 'loading' ? 'Requesting observations from the selected provider…' : analysis.status === 'success' ? `${analysis.result?.observations?.length || 0} observations received. Select a sample below.` : 'Configure inputs, then run analysis. Editing inputs clears previous results.'}</p></div>
}
