export type EnvironmentId='solar'|'earth'|'shadow'|'screening'
export interface ScreeningCriteria {minimum_solar_fraction:number;minimum_earth_fraction:number;exclude_permanent_shadow:boolean;require_mission_engineering:boolean;maximum_slope_deg:number|null}
export interface EnvironmentRaster {layer:EnvironmentId;mode:'long_term_environment';reference_frame:'MOON_ME_DE421';pixel_size_m:number;shape:[number,number];values:(number|null)[];corners:[number,number][];product:string;product_version:string;units:string;source_sha256:string;source_url:string;attribution:string;coverage:string;time_basis:string;limitations:string[];reasons?:string[][];cell_evidence?:[number|null,number|null,number|null][];criteria?:ScreeningCriteria}
export function parseEnvironment(value:unknown,id:EnvironmentId):EnvironmentRaster {
  if(!value||typeof value!=='object')throw new Error('Invalid NASA layer')
  const r=value as EnvironmentRaster
  const units=id==='screening'?'screening_class':id==='shadow'?'binary_shadow':'fraction_any_disk_visible'
  if(r.units!==units)throw new Error('Incompatible NASA layer units')
  if(r.layer!==id||r.mode!=='long_term_environment'||r.reference_frame!=='MOON_ME_DE421'||r.pixel_size_m!==60||JSON.stringify(r.shape)!=='[65,65]'||!Array.isArray(r.values)||r.values.length!==4225||r.values.some(v=>v!==null&&(!Number.isFinite(v)||v<0||v>(id==='screening'?3:1)||id==='screening'&&!Number.isInteger(v)||id==='shadow'&&v!==0&&v!==1))||!Array.isArray(r.corners)||r.corners.length!==4356||r.corners.some(p=>!Array.isArray(p)||p.length!==2||!p.every(Number.isFinite)||Math.abs(p[0])>90||Math.abs(p[1])>180)||!Array.isArray(r.limitations)||!r.limitations.every(s=>typeof s==='string')||!/^[a-f0-9]{64}$/.test(r.source_sha256)||!r.source_url?.startsWith('https://pgda.gsfc.nasa.gov/data/MoonIllumination/'))throw new Error('Incompatible NASA environment layer')
  if(id==='screening'&&(!Array.isArray(r.reasons)||r.reasons.length!==4225||r.reasons.some(row=>!Array.isArray(row)||!row.every(s=>typeof s==='string'))||!Array.isArray(r.cell_evidence)||r.cell_evidence.length!==4225||r.cell_evidence.some(row=>!Array.isArray(row)||row.length!==3||row.some(v=>v!==null&&(!Number.isFinite(v)||v<0||v>1)))||!r.criteria))throw new Error('Missing screening evidence')
  return r
}
export async function loadEnvironment(id:EnvironmentId,signal:AbortSignal){
  const response=await fetch(`${import.meta.env.VITE_API_BASE_URL||'/backend'}/api/v1/exploration/environment/${id}`,{signal})
  if(!response.ok)throw new Error('NASA layer unavailable. No values or colors substituted.')
  return parseEnvironment(await response.json(),id)
}
export function environmentColor(layer:EnvironmentId,value:number|null){
  if(value===null)return null
  if(layer==='screening')return ['rgba(145,153,164,.4)','rgba(211,102,96,.65)','rgba(233,185,104,.65)','rgba(114,176,136,.65)'][value]||null
  if(layer==='shadow')return value===1?'rgba(180,165,215,.72)':'rgba(220,225,230,.12)'
  return layer==='solar'?`rgba(242,194,95,${.12+.65*value})`:`rgba(123,191,208,${.12+.65*value})`
}
export async function loadScreening(criteria:ScreeningCriteria,signal:AbortSignal){
  const response=await fetch(`${import.meta.env.VITE_API_BASE_URL||'/backend'}/api/v1/exploration/screening`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(criteria),signal})
  if(!response.ok)throw new Error('Screening unavailable. No assessment colors substituted.')
  const result=parseEnvironment(await response.json(),'screening')
  if(JSON.stringify(result.criteria)!==JSON.stringify(criteria))throw new Error('Screening criteria do not match this request')
  return result
}
