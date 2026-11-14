import type {ImageAnchor} from '../components/LunarImageMap'

export async function requestImageAnchor(latitude:number,longitude:number,epoch:string,signal:AbortSignal):Promise<ImageAnchor> {
  const base=import.meta.env.VITE_API_BASE_URL||'/backend'
  const response=await fetch(`${base.replace(/\/$/,'')}/api/v1/imagery/anchor`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({latitude_deg:latitude,longitude_deg:longitude,coordinate_epoch_utc:epoch}),signal:AbortSignal.any([signal,AbortSignal.timeout(35000)])})
  if(!response.ok)throw new Error('Exact scientific coordinate anchor unavailable; input remains unconverted.')
  const value:unknown=await response.json()
  if(!value||typeof value!=='object')throw new Error('Invalid image anchor')
  const v=value as Record<string,unknown>
  const request=v.request as Record<string,unknown>|undefined,bridge=v.frame_transform as Record<string,unknown>|undefined
  if(typeof v.latitude_deg!=='number'||!Number.isFinite(v.latitude_deg)||Math.abs(v.latitude_deg)>90||typeof v.longitude_deg!=='number'||!Number.isFinite(v.longitude_deg)||Math.abs(v.longitude_deg)>180||v.reference_frame!=='MOON_ME_DE421'||v.registration_verified!==false
    ||request?.latitude_deg!==latitude||request?.longitude_deg!==longitude||typeof request?.coordinate_epoch_utc!=='string'||Date.parse(request.coordinate_epoch_utc)!==Date.parse(epoch)
    ||bridge?.source_frame!=='MOON_ME_DE440_ME421'||bridge?.destination_frame!=='MOON_ME_DE421'||typeof bridge?.epoch_utc!=='string'||Date.parse(bridge.epoch_utc)!==Date.parse(epoch))throw new Error('Incompatible image anchor')
  return {latitude:v.latitude_deg,longitude:v.longitude_deg,qualification:'Scientific input reconciled exactly to native DE421 at its input epoch. The image’s tie to that frame is unverified.'}
}
