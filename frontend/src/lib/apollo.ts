import catalog from '../../../data/manifests/apollo-sites.json'
export const apolloCatalog=catalog
export interface ApolloPin { id:string;name:string;latitude:number;longitude:number;context_latitude:number;context_longitude:number;landing_date:string;historical_utc:string|null }
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
