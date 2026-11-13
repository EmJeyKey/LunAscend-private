import type {MeshRequest,TerrainMesh,TerrainInspection} from '../types/visualization'
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v)
const finite=(v:unknown):v is number=>typeof v==='number'&&Number.isFinite(v)
const vector=(v:unknown)=>Array.isArray(v)&&v.length===3&&v.every(finite)
const numbers=(v:unknown)=>Array.isArray(v)&&v.every(finite)
export function parseMesh(value:unknown,request:MeshRequest):TerrainMesh {
  const bad=()=>new Error('Incompatible terrain visualization response; no mesh accepted.')
  if(!object(value)||value.model_version!=='lola-render-mesh-v1'||value.reference_frame!=='MOON_ME_DE421'||value.reference_radius_m!==1737400
    ||value.elevation_units!=='m'||value.vertical_reference!=='Height in meters above 1737400 m sphere'||!object(value.request)
    ||value.request.dataset_id!==request.dataset_id||value.request.site_id!==request.site_id||value.request.latitude_deg!==request.latitude_deg||Math.abs(Number(value.request.longitude_deg)-request.longitude_deg)>1e-10
    ||value.request.reference_frame!==request.reference_frame||value.request.half_extent_m!==request.half_extent_m||value.request.max_grid_side!==request.max_grid_side
    ||value.request.observer_height_m!==request.observer_height_m||!(value.request.coordinate_epoch_utc===null&&request.coordinate_epoch_utc===null||Date.parse(String(value.request.coordinate_epoch_utc))===Date.parse(String(request.coordinate_epoch_utc)))
    ||typeof value.source_sha256!=='string'||!/^[a-f0-9]{64}$/.test(value.source_sha256)||typeof value.source_url!=='string'||typeof value.crs_wkt!=='string')throw bad()
  const m=value as unknown as TerrainMesh
  if(!Array.isArray(m.grid_shape)||m.grid_shape.length!==2||m.grid_shape.some(n=>!Number.isInteger(n)||n<2||n>request.max_grid_side))throw bad()
  const count=m.grid_shape[0]*m.grid_shape[1]
  if(count>16641||!Array.isArray(m.positions_m)||m.positions_m.length!==count||m.positions_m.some(p=>p!==null&&!vector(p))
    ||!Array.isArray(m.radial_vectors_scene)||m.radial_vectors_scene.length!==count||m.radial_vectors_scene.some(p=>!vector(p)||Math.abs(Math.hypot(...p)-1)>1e-8)
    ||!numbers(m.latitude_deg)||m.latitude_deg.length!==count||m.latitude_deg.some(v=>Math.abs(v)>90)
    ||!numbers(m.longitude_deg)||m.longitude_deg.length!==count||m.longitude_deg.some(v=>v< -180||v>180)
    ||!Array.isArray(m.elevation_m)||m.elevation_m.length!==count||m.elevation_m.some((v,i)=>(v===null)!==(m.positions_m[i]===null)||v!==null&&!finite(v))
    ||!Array.isArray(m.indices)||m.indices.length%3!==0||m.indices.length>98304||m.indices.some(i=>!Number.isInteger(i)||i<0||i>=count||m.positions_m[i]===null)
    ||!Array.isArray(m.boundary_edges)||m.boundary_edges.some(edge=>!Array.isArray(edge)||edge.length!==2||edge.some(i=>!Number.isInteger(i)||i<0||i>=count))
    ||!numbers(m.projected_x_m)||m.projected_x_m.length!==m.grid_shape[1]||!numbers(m.projected_y_m)||m.projected_y_m.length!==m.grid_shape[0]
    ||!vector(m.observer_scene_m)||m.observer_scene_m[1]!==request.observer_height_m||!vector(m.body_origin_m)
    ||!Array.isArray(m.body_to_scene)||m.body_to_scene.length!==3||m.body_to_scene.some(v=>!vector(v))
    ||!finite(m.surface_elevation_m)||!finite(m.native_latitude_deg)||!finite(m.native_longitude_deg)||!Array.isArray(m.warnings)||!m.warnings.every(v=>typeof v==='string'))throw bad()
  for(const range of [m.mesh_elevation_range_m,m.original_elevation_range_m])if(!numbers(range)||range.length!==2||range[0]>range[1])throw bad()
  return m
}
async function post(path:string,body:unknown,signal:AbortSignal) {
  const base=import.meta.env.VITE_API_BASE_URL||'/backend'
  const response=await fetch(`${base.replace(/\/$/,'')}/api/v1/terrain/${path}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.any([signal,AbortSignal.timeout(45000)])})
  const value:unknown=await response.json()
  if(!response.ok)throw new Error(object(value)&&Array.isArray(value.errors)?value.errors.map(e=>object(e)?`${e.code}: ${e.message}`:'Terrain unavailable').join(' '):`Terrain request failed (HTTP ${response.status}).`)
  return value
}
const meshes=new Map<string,TerrainMesh>()
export async function requestMesh(request:MeshRequest,signal:AbortSignal,refresh=false) {
  const key=JSON.stringify(request)
  if(!refresh&&meshes.has(key))return meshes.get(key)!
  const result=parseMesh(await post('mesh',request,signal),request)
  if(!signal.aborted){meshes.set(key,result);while(meshes.size>2)meshes.delete(meshes.keys().next().value!)}
  return result
}
export async function inspectTerrain(anchor:MeshRequest,latitude_deg:number,longitude_deg:number,signal:AbortSignal):Promise<TerrainInspection> {
  const value=await post('inspect',{anchor,latitude_deg,longitude_deg},signal)
  if(!object(value)||value.reference_frame!=='MOON_ME_DE421'||value.latitude_deg!==latitude_deg||value.longitude_deg!==longitude_deg
    ||value.dataset_id!==anchor.dataset_id||value.input_reference_frame!==anchor.reference_frame
    ||!['elevation_m','distance_from_site_m','input_frame_latitude_deg','input_frame_longitude_deg'].every(k=>finite(value[k]))
    ||value.method!=='bilinear original DEM; four finite neighbors'||typeof value.source_sha256!=='string')throw new Error('Incompatible terrain inspection response.')
  return value as unknown as TerrainInspection
}
