import type {TerrainMesh,Vector3} from '../types/visualization'
const rad=(v:number)=>v*Math.PI/180
// Rendering transforms only. No independent Sun/Earth ephemeris or visibility model.
export function geographicToScene(latitude:number,longitude:number,radius=1):Vector3 {
  const a=rad(latitude),b=rad(longitude)
  return [radius*Math.cos(a)*Math.cos(b),radius*Math.sin(a),-radius*Math.cos(a)*Math.sin(b)]
}
export function sceneToGeographic([x,y,z]:Vector3) {
  return {latitude:Math.atan2(y,Math.hypot(x,z))*180/Math.PI,longitude:((Math.atan2(-z,x)*180/Math.PI+180)%360+360)%360-180}
}
// Native local scene axes are X=east, Y=radial up, Z=-north (proper rotation).
export function localDirection(azimuth:number|null,elevation:number|null):Vector3|null {
  if(azimuth===null || elevation===null)return null
  const a=rad(azimuth),e=rad(elevation)
  return [Math.cos(e)*Math.sin(a),Math.sin(e),-Math.cos(e)*Math.cos(a)]
}
export function globalDirection(latitude:number,longitude:number,azimuth:number|null,elevation:number|null):Vector3|null {
  const d=localDirection(azimuth,elevation)
  if(!d)return null
  const lat=rad(latitude),lon=rad(longitude)
  const east:Vector3=[-Math.sin(lon),0,-Math.cos(lon)]
  const up=geographicToScene(latitude,longitude)
  const north:Vector3=[-Math.sin(lat)*Math.cos(lon),Math.cos(lat),Math.sin(lat)*Math.sin(lon)]
  return east.map((v,i)=>v*d[0]+up[i]*d[1]-north[i]*d[2]) as Vector3
}
export function exaggeratedPositions(mesh:TerrainMesh,factor:number):Float32Array {
  if(!Number.isFinite(factor)||factor<1||factor>10)throw new Error('Vertical exaggeration must be 1× to 10×.')
  return new Float32Array(mesh.positions_m.flatMap((p,i)=>p?p.map((v,j)=>v+(factor-1)*(mesh.elevation_m[i]!-mesh.surface_elevation_m)*mesh.radial_vectors_scene[i][j]):[0,0,0]))
}
export function elevationColor(value:number,range:[number,number]):Vector3 {
  const f=Math.max(0,Math.min(1,(value-range[0])/Math.max(1e-12,range[1]-range[0])))
  return [.16+.62*f,.20+.43*f,.26+.18*f]
}
// Async renderer ownership is independently testable without requiring a GPU.
export function rendererLease<T extends {dispose:()=>void}>(factory:()=>Promise<T>,ready:(value:T)=>void,failed:(error:unknown)=>void) {
  let cancelled=false,current:T|null=null
  void factory().then(value=>{if(cancelled)value.dispose();else{current=value;ready(value)}},error=>{if(!cancelled)failed(error)})
  return ()=>{cancelled=true;current?.dispose();current=null}
}
