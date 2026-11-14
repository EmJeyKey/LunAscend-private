import {useEffect,useRef,useState} from 'react'
import {Link} from 'react-router'
import {apolloCatalog,loadApollo,type ApolloPin} from '../lib/apollo'
import {useMission} from '../state/MissionContext'
export function ApolloSitePanel({site,onClose}:{site:ApolloPin;onClose:()=>void}) {
  const {mission,options,runAnalysis,comparisonStore}=useMission()
  const [historical,setHistorical]=useState(false),[height,setHeight]=useState(''),[confirmed,setConfirmed]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState('')
  const job=useRef<AbortController|null>(null)
  useEffect(()=>()=>job.current?.abort(),[])
  useEffect(()=>{job.current?.abort();setBusy(false);setConfirmed(false);setMessage('');setHistorical(false)},[site.id,mission.startUtc])
  const apply=async(compare:boolean)=>{
    job.current?.abort();const controller=new AbortController();job.current=controller;setMessage('')
    try{
      if(!confirmed||!height.trim()||!Number.isFinite(Number(height)))throw new Error('Confirm the hypothetical sphere-relative surface height first.')
      setBusy(true)
      const epoch=historical?site.historical_utc:mission.startUtc
      if(!epoch)throw new Error('Historical dates before 1972 are unsupported by the existing UTC contract.')
      const pin=(await loadApollo(epoch,controller.signal)).find(p=>p.id===site.id)!
      if(controller.signal.aborted)return
      const selection={...mission,startUtc:epoch,site:{id:site.id,name:site.name,latitude:pin.context_latitude,longitude:pin.context_longitude,description:'NASA DE421 LM coordinates transformed exactly at this epoch. Surface height is an explicit hypothetical assumption; local terrain unavailable.'}}
      const settings={...options,providerMode:'scientific' as const,frameConfirmed:true,surfaceElevationM:height,observerHeightM:'0',terrainEnabled:false,powerEnabled:false,communicationEnabled:false}
      if(compare){const id=comparisonStore.add(selection,settings);setMessage(id?'Location added. Run it in Comparison.':'Comparison is full. Remove a scenario first.')}
      else {runAnalysis(selection,settings);setMessage('Geometric analysis requested. Terrain visibility and DTE engineering remain unknown.')}
    }catch(error){if(!controller.signal.aborted)setMessage(error instanceof Error?error.message:'Apollo analysis unavailable.')}
    finally{if(!controller.signal.aborted)setBusy(false)}
  }
  return <aside className="apollo-site-panel" aria-label="Apollo site information"><div className="atlas-actions"><h3>{site.name}</h3><button type="button" onClick={onClose}>Close</button></div><p>Landed {site.landing_date} · Lunar Module</p><p className="mono">{site.latitude.toFixed(5)}° N · {site.longitude.toFixed(5)}° E<br/>MOON_ME_DE421 · planetocentric</p><a href={apolloCatalog.source} target="_blank" rel="noopener noreferrer">NASA coordinates</a><p>No local Apollo DEM is installed. Geometry alone does not establish terrain clearance or a radio link.</p><label>Analysis epoch<select value={historical?'historical':'selected'} onChange={e=>{job.current?.abort();setBusy(false);setHistorical(e.target.value==='historical');setMessage('')}}><option value="selected">Selected mission date</option><option value="historical" disabled={!site.historical_utc}>Historical landing {!site.historical_utc?'(pre-1972 unsupported)':''}</option></select></label><label>Hypothetical surface height / m above 1,737,400 m sphere<input type="number" value={height} onChange={e=>{job.current?.abort();setBusy(false);setHeight(e.target.value);setConfirmed(false)}} placeholder="Explicit assumption required"/></label><label><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>I confirm this assumed height; it is not a surveyed LM elevation.</label><div className="atlas-actions"><button disabled={busy||!confirmed} onClick={()=>void apply(false)}>Analyze this site</button><button disabled={busy||!confirmed} onClick={()=>void apply(true)}>Compare this location</button><Link to="/compare">Open comparison</Link></div><p role="status">{busy?'Converting exact lunar frame…':message}</p><p>Modern hypothetical geometry, not a reconstruction of Apollo power or vehicle performance.</p></aside>
}
