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
import {supportedTerrainOptions,initialEngineering,engineeringSettings} from '../lib/engineering'
export function MissionControls({ compact = false, onDraftChange }: { compact?: boolean; onDraftChange?: (draft: MissionSelection) => void }) {
  const { mission, updateMission, analysis, options, updateOptions, runAnalysis, invalidate } = useMission()
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
  const [checking,setChecking]=useState(false)
  const coverageJob=useRef<AbortController|null>(null)
  useEffect(()=>{coverageJob.current?.abort();setChecking(false)},[mission,options])
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
    const full=true
    if(!options.frameConfirmed){setMessage('Confirm the scientific coordinate reference before analysis.');return}
    let selection={site,startUtc,durationHours:Number(hours)},settings=options
    coverageJob.current?.abort();const controller=new AbortController();coverageJob.current=controller
    if(full||(scientific&&settings.terrainEnabled)){
      try{
        setChecking(true)
        setMessage('Checking installed terrain coverage…')
        if(needsCatalogEpoch(selection,settings)){const resolved=await resolveCatalogEpoch(selection,settings,controller.signal);selection=resolved.selection;settings=resolved.options}
        const response=await fetch(`${import.meta.env.VITE_API_BASE_URL||'/backend'}/api/v1/terrain/coverage`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({dataset_id:settings.terrainDatasetId||'lola-site01-5m-v2020',latitude_deg:selection.site.latitude,longitude_deg:selection.site.longitude,reference_frame:'MOON_ME_DE440_ME421',coordinate_epoch_utc:startUtc}),signal:AbortSignal.any([controller.signal,AbortSignal.timeout(60000)])})
        if(!response.ok)throw new Error('Terrain coverage could not be verified. Retry when the backend is available.')
        const coverage=await response.json()
        if(controller.signal.aborted)return
        if(coverage.dataset_id===null){
          if(!settings.surfaceElevationM.trim())throw new Error('No installed terrain at this location. Enter an explicit surface-height assumption and confirm the frame to calculate geometry. Power, battery and terrain-qualified DTE remain unavailable.')
          settings={...settings,terrainEnabled:false,powerEnabled:false,communicationEnabled:false,coverageNote:{siteId:selection.site.id,startUtc,reason:typeof coverage.reason==='string'?coverage.reason:'No installed terrain supports this location.'}}
          setMessage('Geometry requested. No installed terrain supports this coordinate; power, battery and terrain-qualified DTE are unavailable.')
        }else{
          settings=supportedTerrainOptions(settings,coverage,full)
          const notes:string[]=[]
          for(const product of ['power','communication'] as const){
            try{engineeringSettings({...settings,powerEnabled:product==='power',communicationEnabled:product==='communication'})}
            catch(error){settings={...settings,[product==='power'?'powerEnabled':'communicationEnabled']:false};notes.push(`${product==='power'?'Electricity':'Communications'} settings need attention: ${error instanceof Error?error.message:'Missing settings'}`)}
          }
          settings={...settings,productNotes:notes}
          setMessage('Verified local DEM selected. Terrain-center visibility requested; finite coverage does not establish global clearance.')
        }
      }catch(error){if(!controller.signal.aborted)setMessage(error instanceof Error?error.message:'Coverage check failed.');return}finally{setChecking(false)}
    }
    if(!controller.signal.aborted){setMessage('');runAnalysis(selection,settings)}
  }
  return <div className="mission-controls-wrap"><form id="mission-analysis-form" className="panel analysis-form" onSubmit={apply} onInvalid={event => { const details = (event.target as HTMLElement).closest('details'); if (details) details.open = true;setMessage('Check the highlighted location, height or reference setting before running analysis.') }} onChange={() => { coverageJob.current?.abort();setChecking(false);invalidate(); setMessage('') }}>
    <header className="section-introduction"><h2>Plan this mission</h2><p>Set location, landing time and duration. All times are UTC.</p></header>
    <div className="mission-controls">
      <label className="control-field"><span><MapPin size={13}/>LANDING SITE</span><strong>{site.name}</strong><Link to="/">Choose another NASA site</Link></label>
      <label className="control-field"><span><CalendarDays size={13}/>START TIME (UTC)</span><input ref={startInput} key={mission.startUtc} name="start_utc" aria-label="Landing date and time in UTC" type="datetime-local" step="0.001" required defaultValue={mission.startUtc.replace(/Z$/, '').replace(/\.000$/, '')} onInput={()=>{setDateVersion(v=>v+1);invalidate()}} onBlur={event=>{const utc=toUtc(event.target.value);if(utc&&Date.parse(utc)!==Date.parse(mission.startUtc))updateMission({...mission,startUtc:utc})}}/></label>
      <label className="control-field period-field"><span><Clock3 size={13}/>DURATION (HOURS)</span><input aria-label="Analysis duration in hours" type="number" min="0.000001" max="8784" step="any" list="analysis-periods" required value={hours} onChange={event => {setHours(event.target.value);const duration=Number(event.target.value);if(Number.isFinite(duration)&&duration>0&&duration<=8784)updateMission({...mission,durationHours:duration})}}/><datalist id="analysis-periods">{durationOptions.map(value => <option key={value} value={value}/>)}</datalist></label>
      <label className="control-field"><span>DATA SOURCE</span><select aria-label="Data source" value={options.providerMode} onChange={event => updateOptions({ ...options, providerMode: event.target.value as ProviderMode, terrainEnabled: event.target.value === 'scientific' && options.terrainEnabled, powerEnabled: event.target.value === 'scientific' && options.powerEnabled, communicationEnabled: event.target.value === 'scientific' && options.communicationEnabled })}><option value="scientific">Scientific SPICE</option></select></label>
      <button className="button primary" type="submit" value="full" formNoValidate disabled={!scientific||checking||analysis.status==='loading'}>{checking?'Checking terrain…':analysis.status==='loading'?'Calculating…':'Run Complete Mission Analysis'}<ArrowRight size={16}/></button>
    </div>
    <ul className="mission-setup-help"><li>Calculates every supported product using installed terrain and your hardware settings.</li><li>No terrain? An explicit surface-height assumption is required for geometry.</li><li>No automatic site or date search.</li></ul>
    <p className="analysis-hardware-summary">{(options.engineering||initialEngineering).panel_area_m2} m² panels · {(options.engineering||initialEngineering).orientation_mode.replaceAll('_',' ')} · {(options.engineering||initialEngineering).baseline_load_w} W base load · {(options.engineering||initialEngineering).battery_capacity_wh} Wh battery</p>
    {scientific&&<label className="frame-confirm"><input type="checkbox" aria-label="Confirm scientific coordinate reference" checked={options.frameConfirmed} onChange={event=>updateOptions({...options,frameConfirmed:event.target.checked})}/>I confirm the selected coordinates use DE440/ME421 and heights above the 1,737,400 m lunar sphere.</label>}
    {scientific && <button className="text-link terrain-example" type="button" onClick={() => {
      updateMission({ site: { id: 'custom', name: 'LOLA Site01 example', latitude: -89.46315760953222, longitude: -137.50097847854008, description: 'Documented Site01 DEM pixel-center example, converted to DE440/ME421 at the original landing epoch; not a surveyed or approved landing site.' }, startUtc: '2026-11-14T00:00:00.000Z', durationHours: 24 })
      updateOptions({ ...options, terrainDatasetId: undefined, coordinateEpochUtc: undefined, terrainRadiusM: '2500', terrainAzimuthSamples: '360', terrainRadialStepM: '5', terrainEnabled: true, observerHeightM: '2', sampleStepS: '3600', frameConfirmed: false })
    }}>Load Site01 example · confirm frame before analysis</button>}
    <details className="analysis-settings" data-compact={compact||undefined}><summary>Location, terrain & power settings</summary><div className="analysis-input-grid">
      <label>Site name<input aria-label="Site name" maxLength={500} required value={site.name} onChange={event => editSite({ ...site, name: event.target.value })}/></label>
      <label>Latitude / ° N<input aria-label="Latitude in degrees" type="number" min="-90" max="90" step="any" required value={Number.isNaN(site.latitude) ? '' : site.latitude} onChange={event => editSite({ ...site, id: 'custom', native:undefined, category:'user-selected', latitude: event.target.value === '' ? NaN : Number(event.target.value) })}/></label>
      <label>Longitude / ° E<input aria-label="Longitude in degrees" type="number" min="-180" max="179.999999999" step="any" required value={Number.isNaN(site.longitude) ? '' : site.longitude} onChange={event => editSite({ ...site, id: 'custom', native:undefined, category:'user-selected', longitude: event.target.value === '' ? NaN : Number(event.target.value) })}/></label>
      <label>Surface elevation / m<input aria-label="Surface elevation in meters" type="number" step="any" placeholder={options.terrainEnabled ? 'Derived from LOLA DEM' : 'Explicit height above sphere'} required={scientific && !options.terrainEnabled} value={options.surfaceElevationM} onChange={event => updateOptions({ ...options, surfaceElevationM: event.target.value })}/></label>
      <label>Observer height / m<input aria-label="Observer height in meters" type="number" min="0" step="any" required value={options.observerHeightM} onChange={event => updateOptions({ ...options, observerHeightM: event.target.value })}/></label>
      <label>Sample step / s<input aria-label="Sample step in seconds" type="number" min="0.001" step="any" required value={options.sampleStepS} onChange={event => updateOptions({ ...options, sampleStepS: event.target.value })}/></label>
    </div><p>Planetocentric latitude · east-positive longitude. Catalog locations are source reference points, not approved landing sites.</p>
    {scientific ? <><p className="frame-note">MOON_ME_DE440_ME421 · DE440/ME421 · sphere radius 1,737,400 m. {options.terrainEnabled ? 'Exact per-epoch DE421 conversion; DEM surface height plus observer height.' : 'No coordinate conversion is performed. Enter 0 m only as an explicit sphere-surface assumption.'}</p></> : <p className="mock-warning">MOCK DATA — NOT LUNAR PREDICTIONS. Heights are not modeled.</p>}
    <TerrainOptions options={options} onChange={updateOptions}/><EngineeringOptions options={options} onChange={updateOptions}/>
    </details>
  </form>{(message || analysis.message) && <p className={checking?"form-feedback":"analysis-error"} role={checking?"status":"alert"}>{message || analysis.message}</p>}
  <p className="form-feedback" role="status" aria-live="polite">{analysis.status === 'loading' ? 'Requesting observations from the selected provider…' : analysis.status === 'success' ? `${analysis.result?.observations?.length || 0} observations received. Select a sample below.` : 'Configure inputs, then run analysis. Editing inputs clears previous results.'}</p></div>
}
