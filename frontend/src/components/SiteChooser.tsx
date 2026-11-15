import {useEffect,useState} from 'react'
import {Link} from 'react-router'
import {catalogIdentity,loadApollo,loadPolarSites,type ApolloPin} from '../lib/apollo'
import {useMission} from '../state/MissionContext'
export function SiteChooser(){
 const {mission,options,updateMission,updateOptions}=useMission()
 const [pins,setPins]=useState<ApolloPin[]>([]),[message,setMessage]=useState('Loading verified locations…'),[query,setQuery]=useState('')
 useEffect(()=>{
  const controller=new AbortController();setPins([]);setMessage('Loading verified locations…')
  void Promise.allSettled([loadApollo(mission.startUtc,controller.signal),loadPolarSites(mission.startUtc,controller.signal)]).then(results=>{
   if(controller.signal.aborted)return
   setPins(results.flatMap(r=>r.status==='fulfilled'?r.value:[]))
   setMessage(results.some(r=>r.status==='rejected')?'Some catalog locations are unavailable. No approximate coordinates substituted.':'')
  });return()=>controller.abort()
 },[mission.startUtc])
 const choose=(pin:ApolloPin)=>{
  updateMission({...mission,site:{...catalogIdentity(pin),id:pin.id,name:pin.name,latitude:pin.context_latitude,longitude:pin.context_longitude,description:pin.point_kind||'Historical NASA Lunar Module location; hypothetical mission at selected UTC.'}})
  updateOptions({...options,providerMode:'scientific',coordinateEpochUtc:mission.startUtc,terrainDatasetId:pin.dataset_id||undefined,terrainEnabled:!!pin.dataset_id,terrainRadiusM:pin.dataset_id?'100':'2500',surfaceElevationM:'',frameConfirmed:false,powerEnabled:false,communicationEnabled:false})
 }
 return <section className="panel site-chooser"><h1>Choose your landing site</h1><p>Select a NASA location, then explore it and configure your mission.</p><label className="site-search"><input aria-label="Find a landing site" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Apollo, Nobile, Shackleton…"/></label><div className="catalog-options">{pins.filter(p=>p.name.toLowerCase().includes(query.toLowerCase())).map(pin=><button key={pin.id} className="site-option" aria-pressed={mission.site.id===pin.id} onClick={()=>choose(pin)}><strong>{pin.name}</strong><small>{pin.dataset_id?'Polar study area · finite local DEM':'Historical Apollo · local DEM unavailable'}</small></button>)}</div><p role="status">{message}</p><div className="atlas-actions"><Link className="custom-site-link" to="/sites#moon-viewer">Or enter custom coordinates (based on the 3d moon)</Link></div>{mission.site.native&&<p className="chosen-site">Selected: <strong>{mission.site.name}</strong></p>}<Link className="button primary" to="/sites#moon-viewer">Continue to explore the Moon Sites →</Link></section>
}
