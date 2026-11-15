import {useEffect,useRef,useState} from 'react'
import {Link} from 'react-router'
import {apolloCatalog,catalogIdentity,loadApollo,loadPolarSites,type ApolloPin} from '../lib/apollo'
import {useMission} from '../state/MissionContext'
import terrainCatalog from '../../../data/manifests/apollo-terrain/catalog.json'
export function ApolloSitePanel({site,onClose}:{site:ApolloPin;onClose:()=>void}) {
  const {mission,options,runAnalysis,comparisonStore}=useMission()
  const polar=site.category==='polar-study',terrain=!!site.dataset_id
  const [historical,setHistorical]=useState(false),[height,setHeight]=useState(''),[confirmed,setConfirmed]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState('')
  const job=useRef<AbortController|null>(null)
  useEffect(()=>()=>job.current?.abort(),[])
  useEffect(()=>{job.current?.abort();setBusy(false);setConfirmed(false);setMessage('');setHistorical(false)},[site.id,mission.startUtc,mission.durationHours])
  const apply=async(compare:boolean)=>{
    job.current?.abort();const controller=new AbortController();job.current=controller;setMessage('')
    try{
      if(!confirmed||!terrain&&(!height.trim()||!Number.isFinite(Number(height))))throw new Error('Confirm the coordinate reference and height assumptions first.')
      setBusy(true)
      const epoch=historical?site.historical_utc:mission.startUtc
      if(!epoch)throw new Error('Historical dates before 1972 are unsupported by the existing UTC contract.')
      const pin=(await (polar?loadPolarSites:loadApollo)(epoch,controller.signal)).find(p=>p.id===site.id)
      if(!pin)throw new Error('Selected site is unavailable in the verified registry.')
      if(controller.signal.aborted)return
      const selection={...mission,startUtc:epoch,site:{...catalogIdentity(pin),id:site.id,name:site.name,latitude:pin.context_latitude,longitude:pin.context_longitude,description:site.point_kind||'NASA DE421 LM coordinates transformed exactly at this epoch. Explicit hypothetical surface height; local terrain unavailable.'}}
      const settings={...options,providerMode:'scientific' as const,frameConfirmed:true,coordinateEpochUtc:epoch,surfaceElevationM:terrain?'':height,terrainDatasetId:site.dataset_id||undefined,terrainRadiusM:terrain?'100':options.terrainRadiusM,terrainRadialStepM:'5',observerHeightM:terrain?options.observerHeightM:'0',terrainEnabled:terrain,powerEnabled:false,communicationEnabled:terrain}
      if(compare){const id=comparisonStore.add(selection,settings);setMessage(id?'Location added. Run it in Comparison.':'Comparison is full. Remove a scenario first.')}
      else {runAnalysis(selection,settings);setMessage(terrain?'Geometry, finite local terrain and conditional DTE requested. Distant terrain remains unknown.':'Geometric analysis requested. Terrain visibility and DTE engineering remain unknown.')}
    }catch(error){if(!controller.signal.aborted)setMessage(error instanceof Error?error.message:'Apollo analysis unavailable.')}
    finally{if(!controller.signal.aborted)setBusy(false)}
  }
  return <aside className="apollo-site-panel" aria-label="Scientific site information">
    <div className="atlas-actions"><h3>{site.name}</h3><button type="button" onClick={onClose}>Close</button></div>
    <p>{polar?site.point_kind:`${site.landing_site_name||''} · Landed ${site.landing_date} · Lunar Module`}</p>
    <p className="mono">{site.latitude.toFixed(5)}° N · {site.longitude.toFixed(5)}° E<br/>MOON_ME_DE421 · planetocentric</p>
    <a href={site.source||apolloCatalog.source} target="_blank" rel="noopener noreferrer">NASA source coordinates / dataset</a>
    {!polar&&<a href={terrainCatalog.find(t=>t.site_id===site.id)?.catalog_url} target="_blank" rel="noopener noreferrer">LROC terrain product · registration not established locally</a>}
    {terrain?<><p>Source DEM sample: <span className="mono">{site.elevation_m?.toFixed(2)} m</span> above the 1,737,400 m sphere.</p><p className="mono">{site.dataset_id} · 5 m grid · 325 m bounded window</p><p>{site.terrain_metadata?.uncertainty} Horizons use a 100 m local radius; distant terrain remains unknown.</p></>:<p>No verified local Apollo DEM is installed. Geometry does not establish terrain clearance or a radio link.</p>}
    {site.quality&&<details><summary>Source-pixel slope and quality</summary><dl>{[['slope_deg','Slope / °'],['height_rms_m','Height RMS / m'],['slope_rms_deg','Slope RMS / °'],['return_count','LDEC source value']].map(([key,label])=>{const sample=site.quality?.[key];return <div key={key}><dt>{label}</dt><dd className="mono">{sample?.value==null?'Unavailable':sample.value.toFixed(3)}</dd>{sample&&<a href={sample.source_url} target="_blank" rel="noopener noreferrer">Source product</a>}{sample?.missing_reason&&<p>{sample.missing_reason}</p>}</div>})}</dl><p>Values at the native representative pixel. Uncertainty is not propagated into horizon or engineering results. Zero LDEC does not mean zero elevation.</p></details>}
    <label>Analysis epoch<select value={historical?'historical':'selected'} onChange={e=>{job.current?.abort();setBusy(false);setHistorical(e.target.value==='historical');setMessage('')}}><option value="selected">Selected mission date</option>{!polar&&<option value="historical" disabled={!site.historical_utc}>Historical landing {!site.historical_utc?'(pre-1972 unsupported)':''}</option>}</select></label>
    {!terrain&&<label>Hypothetical surface height / m above 1,737,400 m sphere<input type="number" value={height} onChange={e=>{job.current?.abort();setBusy(false);setHeight(e.target.value);setConfirmed(false)}} placeholder="Explicit assumption required"/></label>}
    <label><input type="checkbox" checked={confirmed} onChange={e=>{job.current?.abort();setBusy(false);setConfirmed(e.target.checked)}}/>{terrain?'I confirm this representative dataset point and DEM-derived height.':'I confirm this assumed height; it is not a surveyed LM elevation.'}</label>
    <div className="atlas-actions"><button disabled={busy||!confirmed} onClick={()=>void apply(false)}>Analyze this site</button><button disabled={busy||!confirmed} onClick={()=>void apply(true)}>Compare this location</button><Link to="/compare">Open comparison</Link></div>
    <p role="status">{busy?'Converting exact lunar frame…':message}</p>
    <p>Conditional engineering estimates are not guaranteed mission survival. {polar?'Study-area marker, not an approved landing point.':'Not a reconstruction of Apollo vehicle performance.'}</p>
  </aside>
}
