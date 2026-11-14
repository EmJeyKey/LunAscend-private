export type EnvironmentId='solar'|'earth'|'shadow'
export interface EnvironmentRaster {layer:EnvironmentId;mode:'long_term_environment';reference_frame:'MOON_ME_DE421';pixel_size_m:number;shape:[number,number];values:(number|null)[];corners:[number,number][];product:string;product_version:string;units:string;source_sha256:string;source_url:string;attribution:string;coverage:string;time_basis:string;limitations:string[]}
export function parseEnvironment(value:unknown,id:EnvironmentId):EnvironmentRaster {
  if(!value||typeof value!=='object')throw new Error('Invalid NASA layer')
  const r=value as EnvironmentRaster
  if(r.layer!==id||r.mode!=='long_term_environment'||r.reference_frame!=='MOON_ME_DE421'||r.pixel_size_m!==60||JSON.stringify(r.shape)!=='[65,65]'||!Array.isArray(r.values)||r.values.length!==4225||r.values.some(v=>v!==null&&(!Number.isFinite(v)||v<0||v>1||id==='shadow'&&v!==0&&v!==1))||!Array.isArray(r.corners)||r.corners.length!==4356||r.corners.some(p=>!Array.isArray(p)||p.length!==2||!p.every(Number.isFinite)||Math.abs(p[0])>90||Math.abs(p[1])>180)||!Array.isArray(r.limitations)||!r.limitations.every(s=>typeof s==='string')||!/^[a-f0-9]{64}$/.test(r.source_sha256)||!r.source_url?.startsWith('https://pgda.gsfc.nasa.gov/data/MoonIllumination/'))throw new Error('Incompatible NASA environment layer')
  return r
}
export async function loadEnvironment(id:EnvironmentId,signal:AbortSignal){
  const response=await fetch(`${import.meta.env.VITE_API_BASE_URL||'/backend'}/api/v1/exploration/environment/${id}`,{signal})
  if(!response.ok)throw new Error('NASA layer unavailable. No values or colors substituted.')
  return parseEnvironment(await response.json(),id)
}
export function environmentColor(layer:EnvironmentId,value:number|null){
  if(value===null)return null
  if(layer==='shadow')return value===1?'rgba(180,165,215,.72)':'rgba(220,225,230,.12)'
  return layer==='solar'?`rgba(242,194,95,${.12+.65*value})`:`rgba(123,191,208,${.12+.65*value})`
}
