import catalog from '../../../data/manifests/apollo-sites.json'
import type {MissionSelection} from '../types/preview'
import type {AnalysisOptions} from '../types/analysis'
export const apolloCatalog=catalog
export function needsCatalogEpoch(selection:MissionSelection,options:AnalysisOptions) {
  return options.providerMode==='scientific'&&!!options.frameConfirmed&&!!options.coordinateEpochUtc&&/^(apollo-|pgda-)/.test(selection.site.id)&&Date.parse(selection.startUtc)!==Date.parse(options.coordinateEpochUtc)
}
export async function resolveCatalogEpoch(selection:MissionSelection,options:AnalysisOptions,signal:AbortSignal) {
  const sites=await (selection.site.id.startsWith('pgda-')?loadPolarSites:loadApollo)(selection.startUtc,signal)
  const pin=sites.find(s=>s.id===selection.site.id)
  if(!pin)throw new Error('Selected native catalog point is unavailable at this UTC. No substitute site supplied.')
  return {selection:{...selection,site:{...selection.site,latitude:pin.context_latitude,longitude:pin.context_longitude}},options:{...options,coordinateEpochUtc:selection.startUtc}}
}
export interface ApolloPin { id:string;name:string;latitude:number;longitude:number;context_latitude:number;context_longitude:number;landing_date:string;historical_utc:string|null; category?:'polar-study'|'apollo-historical';landing_site_name?:string;dataset_id?:string|null;point_kind?:string;source?:string;elevation_m?:number;quality?:Record<string,{value:number|null;source_url:string;missing_reason?:string}>;terrain_metadata?:{product_version:string;pixel_resolution_m:number;vertical_reference:string;uncertainty:string} }
export async function loadPolarSites(epoch:string,signal:AbortSignal):Promise<ApolloPin[]> {
  const base=import.meta.env.VITE_API_BASE_URL||'/backend'
  const response=await fetch(`${base}/api/v1/exploration/polar-sites`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({latitude_deg:0,longitude_deg:0,coordinate_epoch_utc:epoch}),signal:AbortSignal.any([signal,AbortSignal.timeout(35000)])})
  if(!response.ok)throw new Error('Verified polar site registry unavailable. No guessed markers shown.')
  const value=await response.json()
  if(value.context_frame!=='MOON_ME_DE440_ME421'||Date.parse(value.coordinate_epoch_utc)!==Date.parse(epoch)||!Array.isArray(value.sites))throw new Error('Incompatible polar site response')
  const ids=new Set<string>()
  return value.sites.filter((s:ApolloPin)=>s.latitude!==null).map((s:ApolloPin)=>{
    if(typeof s.id!=='string'||!s.id.startsWith('pgda-')||ids.has(s.id)||s.category!=='polar-study'||typeof s.name!=='string'||![s.latitude,s.longitude,s.context_latitude,s.context_longitude].every(Number.isFinite)||Math.abs(s.latitude)>90||Math.abs(s.context_latitude)>90||s.longitude< -180||s.longitude>=180||s.context_longitude< -180||s.context_longitude>=180||s.dataset_id!=null&&!/^pgda-[a-z0-9]+-5m-window-v1$/.test(s.dataset_id))throw new Error('Invalid polar site coordinates')
    if(s.elevation_m!==undefined&&!Number.isFinite(s.elevation_m)||s.quality&&Object.values(s.quality).some(q=>q.value!==null&&!Number.isFinite(q.value)))throw new Error('Invalid scientific source values')
    ids.add(s.id);return {...s,landing_date:'',historical_utc:null}
  })
}
export async function loadApollo(epoch:string,signal:AbortSignal):Promise<ApolloPin[]> {
  const base=import.meta.env.VITE_API_BASE_URL||'/backend'
  const response=await fetch(`${base}/api/v1/exploration/apollo`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({latitude_deg:0,longitude_deg:0,coordinate_epoch_utc:epoch}),signal:AbortSignal.any([signal,AbortSignal.timeout(35000)])})
  if(!response.ok)throw new Error('Apollo frame conversion unavailable at this date. No approximate pins shown.')
  const value=await response.json()
  if(value.context_frame!=='MOON_ME_DE440_ME421'||Date.parse(value.coordinate_epoch_utc)!==Date.parse(epoch)||!Array.isArray(value.sites)||value.sites.length!==6)throw new Error('Incompatible Apollo coordinate response')
  return value.sites.map((site:ApolloPin,i:number)=>{
    const source=catalog.sites[i]
    if(site.id!==source.id||site.latitude!==source.latitude||site.longitude!==source.longitude||site.landing_date!==source.landing_date||site.historical_utc!==source.historical_utc||![site.context_latitude,site.context_longitude].every(Number.isFinite)||Math.abs(site.context_latitude)>90||site.context_longitude< -180||site.context_longitude>=180)throw new Error('Invalid Apollo coordinates')
    return {...source,context_latitude:site.context_latitude,context_longitude:site.context_longitude}
  })
}
// Visibility of a spherical surface annotation from a perspective camera.
export function surfaceFacing(point:readonly number[],camera:readonly number[]) {
  return point.reduce((sum,v,i)=>sum+v*(camera[i]-v),0)>0
}

export function catalogIdentity(pin:ApolloPin){
 return {category:pin.category||'apollo-historical',native:{latitude:pin.latitude,longitude:pin.longitude,frame:'MOON_ME_DE421' as const,source:pin.source||apolloCatalog.source,datasetId:pin.dataset_id,quality:pin.quality}}
}
