import {memo,useCallback,useEffect,useMemo,useRef,useState,type MouseEvent} from 'react'
import {Link} from 'react-router'
import {useMission} from '../state/MissionContext'
import {inspectTerrain,requestMesh} from '../api/visualization'
import {elevationColor,geographicToScene,globalDirection,localDirection,rendererLease} from '../lib/lunarScene'
import type {DirectionOverlay,MeshRequest,RenderStats,TerrainInspection,TerrainMesh} from '../types/visualization'
import type {LunarView,Pick} from '../visualization/LunarRenderer'

const number=(v:number|null|undefined,places=3)=>v==null?'Unavailable':v.toFixed(places)

function PolarWindow({mesh,onInspect}:{mesh:TerrainMesh;onInspect:(index:number)=>void}) {
  const width=mesh.grid_shape[1],x0=mesh.projected_x_m[0],y0=mesh.projected_y_m[0]
  const spanX=mesh.projected_x_m.at(-1)!-x0,spanY=y0-mesh.projected_y_m.at(-1)!
  const point=(i:number)=>[(mesh.projected_x_m[i%width]-x0)/spanX*900,(y0-mesh.projected_y_m[Math.floor(i/width)])/spanY*900]
  const polygons=useMemo(()=>Array.from({length:mesh.indices.length/3},(_,i)=>{
    const ids=mesh.indices.slice(i*3,i*3+3),h=ids.reduce((sum,id)=>sum+mesh.elevation_m[id]!,0)/3
    return {ids,points:ids.map(index=>point(index).join(',')).join(' '),fill:`rgb(${elevationColor(h,mesh.original_elevation_range_m).map(c=>Math.round(c*255)).join(',')})`}
  }),[mesh])
  const marker=[((mesh.requested_bounds_m[0]+mesh.requested_bounds_m[2])/2-x0)/spanX*900,(y0-(mesh.requested_bounds_m[1]+mesh.requested_bounds_m[3])/2)/spanY*900]
  const pick=(event:MouseEvent<SVGPolygonElement>,ids:number[])=>{
    const svg=event.currentTarget.ownerSVGElement,matrix=svg?.getScreenCTM()
    if(!svg||!matrix)return
    const cursor=svg.createSVGPoint();cursor.x=event.clientX;cursor.y=event.clientY
    const local=cursor.matrixTransform(matrix.inverse())
    const index=[...ids].sort((a,b)=>{const p=point(a),q=point(b);return (p[0]-local.x)**2+(p[1]-local.y)**2-(q[0]-local.x)**2-(q[1]-local.y)**2})[0]
    onInspect(index)
  }
  return <div className="polar-window"><svg viewBox="-30 -30 960 960" role="img" aria-label="Georeferenced LOLA polar stereographic DEM window. Up is projected positive Y, right positive X; these are not universally local north/east. Click a retained vertex region to inspect original DEM data.">{polygons.map((p,i)=><polygon key={i} points={p.points} fill={p.fill} onClick={event=>pick(event,p.ids)}/>) }{marker&&<g transform={`translate(${marker})`}><circle r="12" fill="none" stroke="#f2d38b" strokeWidth="4"/><path d="M-22 0H22M0-22V22" stroke="#f2d38b" strokeWidth="3"/></g>}</svg><p>MOON_ME_DE421 · south-polar stereographic · projected +Y ↑ / +X →. Window retains its real source registration; blank areas have no supported triangles.</p></div>
}
const MemoPolarWindow=memo(PolarWindow)

export function LunarExplorer({compact=false}:{compact?:boolean}) {
  const {mission,options,updateMission,updateOptions,analysis,sampleIndex,selectSample}=useMission()
  const result=analysis.result
  const [mode,setMode]=useState<'globe'|'terrain'|'polar'>('globe')
  const [api,setApi]=useState<LunarView|null>(null),[gpuError,setGpuError]=useState(''),[compatibility,setCompatibility]=useState(false)
  const [meshState,setMeshState]=useState<{key:string;value:TerrainMesh}|null>(null),[loading,setLoading]=useState(false),[error,setError]=useState('')
  const [extent,setExtent]=useState(1000),[detail,setDetail]=useState<33|65|129>(65),[factor,setFactor]=useState(1),[colors,setColors]=useState(true),[retry,setRetry]=useState(0)
  const [inspection,setInspection]=useState<TerrainInspection|null>(null),[inspectMessage,setInspectMessage]=useState('')
  const [stats,setStats]=useState<RenderStats|null>(null)
  const host=useRef<HTMLDivElement>(null),meshRef=useRef<TerrainMesh|null>(null),pickRef=useRef<(p:Pick)=>void>(()=>{})
  const inspectionJob=useRef<AbortController|null>(null)
  const consumedRefresh=useRef(0)
  const site=mission.site
  const request=useMemo<MeshRequest>(()=>({dataset_id:'lola-site01-5m-v2020',site_id:site.id,latitude_deg:site.latitude,longitude_deg:site.longitude,
    reference_frame:'MOON_ME_DE440_ME421',coordinate_epoch_utc:mission.startUtc,observer_height_m:Number(options.observerHeightM),half_extent_m:extent,max_grid_side:detail}),
    [site.id,site.latitude,site.longitude,mission.startUtc,options.observerHeightM,extent,detail])
  const requestKey=JSON.stringify(request)
  const mesh=options.providerMode==='scientific'&&options.frameConfirmed&&meshState?.key===requestKey?meshState.value:null
  const inspect=useCallback((index:number)=>{
    const current=meshRef.current
    if(!current||current.elevation_m[index]===null)return
    inspectionJob.current?.abort();const controller=new AbortController();inspectionJob.current=controller
    setInspection(null);setInspectMessage('Sampling original DEM at the nearest retained vertex coordinate…')
    void inspectTerrain(current.request,current.latitude_deg[index],current.longitude_deg[index],controller.signal).then(value=>{
      if(!controller.signal.aborted){setInspection(value);setInspectMessage('Original DEM sample at the selected retained vertex; not an interpolated exaggerated mesh height.')}
    },reason=>{if(!controller.signal.aborted)setInspectMessage(reason instanceof Error?reason.message:'Terrain sample unavailable.')})
  },[])
  pickRef.current=pick=>{
    if(pick.kind==='terrain')inspect(pick.index)
    else{
      const pickedEpoch=result?.provider_mode==='scientific'?result.observations?.[sampleIndex]?.time_utc||mission.startUtc:mission.startUtc
      updateMission({...mission,startUtc:pickedEpoch,site:{id:'custom',name:'Globe-selected coordinate',latitude:pick.latitude,longitude:pick.longitude,description:'Planetocentric / east-positive coordinate on the DE440/ME421 context sphere at the displayed UTC epoch. DEM coverage not established.'}})
      updateOptions({...options,frameConfirmed:false});setInspectMessage('Globe location selected; confirm its coordinate frame before loading terrain or analyzing.')
    }
  }
  useEffect(()=>{
    if(compatibility||!host.current)return
    const element=host.current
    return rendererLease(async()=>{
      const module=await import('../visualization/LunarRenderer')
      return new module.LunarRenderer(element,p=>pickRef.current(p),setStats,message=>{setGpuError(message);setApi(null)})
    },value=>{setApi(value);setGpuError('')},reason=>{setApi(null);setGpuError(`3D unavailable: ${reason instanceof Error?reason.message:'WebGL initialization failed'}. The coordinate form, polar DEM map and scientific analysis remain available.`)})
  },[compatibility])
  useEffect(()=>{
    setMeshState(null);meshRef.current=null;setError('');setInspection(null);inspectionJob.current?.abort()
    if(mode==='globe'){setLoading(false);return}
    if(options.providerMode!=='scientific'||!options.frameConfirmed){setLoading(false);setError('Confirm Scientific SPICE and the DE440/ME421 coordinate reference before loading NASA terrain. Mock data never supplies georeferenced terrain.');return}
    const controller=new AbortController();setLoading(true)
    const refresh=retry!==consumedRefresh.current;consumedRefresh.current=retry
    void requestMesh(request,controller.signal,refresh).then(value=>{
      if(!controller.signal.aborted){meshRef.current=value;setMeshState({key:requestKey,value});setLoading(false)}
    },reason=>{if(!controller.signal.aborted){setError(reason instanceof Error?reason.message:'NASA terrain unavailable.');setLoading(false)}})
    return ()=>controller.abort()
    // Sample index/time cursor is deliberately absent: cached static terrain is independent of ephemeris selection.
  },[requestKey,mode==='globe',options.providerMode,options.frameConfirmed,retry])
  useEffect(()=>()=>inspectionJob.current?.abort(),[])
  useEffect(()=>{api?.setMode(mode==='globe'?'globe':'terrain')},[api,mode])
  useEffect(()=>{api?.setMesh(mesh)},[api,mesh])
  useEffect(()=>{api?.setExaggeration(factor)},[api,factor])
  useEffect(()=>{api?.setColorMode(colors)},[api,colors])
  const observation=result?.provider_mode==='scientific'?result.observations?.[sampleIndex]:null
  const native=result?.provider_mode==='scientific'?result.terrain_visibility?.observations[sampleIndex]:null
  const reconciled=result?.terrain_visibility?.observer_geometry?.[sampleIndex]
  const latitude=typeof reconciled?.latitude_deg_de440==='number'?reconciled.latitude_deg_de440:site.latitude
  const longitude=typeof reconciled?.longitude_deg_de440==='number'?reconciled.longitude_deg_de440:site.longitude
  useEffect(()=>{api?.setMarker(latitude,longitude)},[api,latitude,longitude])
  const overlays=useMemo<DirectionOverlay>(()=>{
    if(mode==='globe')return {origin:geographicToScene(latitude,longitude,1.014),sun:observation&&(!result?.terrain_visibility||reconciled)?globalDirection(latitude,longitude,observation.sun_azimuth_deg.value,observation.sun_elevation_deg.value):null,earth:observation&&(!result?.terrain_visibility||reconciled)?globalDirection(latitude,longitude,observation.earth_azimuth_deg.value,observation.earth_elevation_deg.value):null}
    return {origin:mesh?.observer_scene_m||[0,0,0],sun:mesh&&native?localDirection(native.sun.azimuth_deg,native.sun.elevation_deg):null,earth:mesh&&native?localDirection(native.earth.azimuth_deg,native.earth.elevation_deg):null}
  },[mode,latitude,longitude,observation,native,mesh,reconciled,result])
  useEffect(()=>{api?.setDirections(overlays)},[api,overlays])
  const loadExample=()=>{
    updateMission({site:{id:'custom',name:'LOLA Site01 example',latitude:-89.46315760953222,longitude:-137.50097847854008,description:'DE440/ME421 coordinate at 2026-11-14 00:00 UTC, corresponding to the documented native DE421 Site01 pixel center; not a surveyed landing site.'},startUtc:'2026-11-14T00:00:00Z',durationHours:24})
    updateOptions({...options,providerMode:'scientific',terrainEnabled:true,observerHeightM:'2',sampleStepS:'3600',frameConfirmed:false})
    setMode('terrain')
  }
  const currentTime=observation?.time_utc||mission.startUtc
  return <section className={`panel lunar-explorer ${compact?'compact':''}`} aria-label="Scientific lunar explorer">
    <header className="section-introduction"><h2>Lunar exploration instrument</h2><p>{mode==='globe'?'Geographic context sphere · no global DEM, texture or scientific illumination.':'NASA LOLA Site01 · actual elevations, finite data coverage. Rendering is independently unvalidated.'}</p></header>
    <div className="viewer-toolbar" aria-label="Lunar view"><button aria-pressed={mode==='globe'} onClick={()=>setMode('globe')}>Global Moon</button><button aria-pressed={mode==='polar'} onClick={()=>setMode('polar')}>South polar map</button><button aria-pressed={mode==='terrain'} onClick={()=>setMode('terrain')}>Local terrain</button><button onClick={loadExample}>Load Site01 reference</button></div>
    <div className="viewer-reference"><span>{site.name} · {number(site.latitude,6)}° N · {number(site.longitude,6)}° E</span><span>Input: DE440/ME421 at {mission.startUtc}</span>{<label><input type="checkbox" checked={options.frameConfirmed} onChange={e=>updateOptions({...options,frameConfirmed:e.target.checked})}/>I confirm these coordinates use DE440/ME421 at this UTC epoch.</label>}</div>
    {mode!=='globe'&&<div className="viewer-settings"><label>Window half-width / m<select value={extent} onChange={e=>setExtent(Number(e.target.value))}>{[250,500,1000,2000,4000].map(v=><option key={v} value={v}>{v}</option>)}</select></label><label>Mesh detail / maximum side<select value={detail} onChange={e=>setDetail(Number(e.target.value) as 33|65|129)}><option value="33">33 · low detail</option><option value="65">65 · standard</option><option value="129">129 · high detail</option></select></label><label>Vertical exaggeration<select value={factor} onChange={e=>setFactor(Number(e.target.value))}>{[1,2,5,10].map(v=><option key={v} value={v}>{v}×{v===1?' · true scale':''}</option>)}</select></label><label><input type="checkbox" checked={colors} onChange={e=>setColors(e.target.checked)}/>Elevation colors</label></div>}
    {mode!=='globe'&&<p className="viewer-exaggeration">{factor}× vertical exaggeration · {factor===1?'true-scale spherical geometry':'rendering only; relative to selected-site elevation'}. Direction arrows retain true angles; visual intersections are not visibility classifications.</p>}
    <div className="viewer-stage-wrap">
      <div className="viewer-stage" ref={host} style={{display:mode==='polar'||compatibility?'none':undefined}}/>
      {(mode==='polar'||compatibility)&&mesh&&<MemoPolarWindow mesh={mesh} onInspect={inspect}/>}
      {(mode==='polar'||compatibility)&&!mesh&&<div className="viewer-map-empty">{mode==='globe'?'3D compatibility mode. Select Local terrain or South polar map to load georeferenced data.':'No DEM window available. Check the coordinate confirmation and resource status below.'}</div>}
      <div className="viewer-epoch"><time>{currentTime}</time><span>{observation?'Returned scientific sample':'No scientific sample selected'}</span></div>
      {(loading||error||gpuError)&&<div className="viewer-data-state" role="status">{loading?'Verifying/loading bounded NASA terrain…':error||gpuError}</div>}
    </div>
    <div className="viewer-camera"><button onClick={()=>api?.camera('reset')} disabled={!api||compatibility}>Reset / selected site</button><button onClick={()=>api?.camera(mode==='globe'?'south':'top')} disabled={!api||compatibility}>{mode==='globe'?'South pole':'Top view'}</button><button onClick={()=>api?.camera('in')} disabled={!api||compatibility}>Zoom +</button><button onClick={()=>api?.camera('out')} disabled={!api||compatibility}>Zoom −</button><label><input type="checkbox" checked={compatibility} onChange={e=>{setApi(null);setCompatibility(e.target.checked)}}/>2D compatibility mode</label></div>
    <p>Drag to orbit · scroll/pinch to zoom · right drag or two fingers to pan local terrain. Click a surface to select a context coordinate or inspect its nearest retained DEM vertex. Marker and arrows are annotations, not physical object sizes/distances. A globe click starts the new coordinate selection at the displayed UTC epoch.</p>
    {gpuError&&<p role="alert" className="analysis-error">{gpuError} <button onClick={()=>{setCompatibility(true);setMode('polar')}}>Use polar DEM fallback</button> <Link to="/analysis">Open scientific analysis</Link></p>}
    {loading&&<p role="status">Loading and verifying a bounded NASA DEM window…</p>}{error&&<p role="alert" className="analysis-error">{error}</p>}
    {mode!=='globe'&&<button className="text-link" onClick={()=>setRetry(v=>v+1)} disabled={loading}>Reload verified terrain</button>}
    {mesh&&mode!=='globe'&&<div className="viewer-metadata"><p>Native DE421 site {number(mesh.native_latitude_deg,8)}° N / {number(mesh.native_longitude_deg,8)}° E · surface {number(mesh.surface_elevation_m)} m · observer {number(mesh.request.observer_height_m)} m above terrain.</p><p>Elevation scale: {number(mesh.original_elevation_range_m[0],1)}–{number(mesh.original_elevation_range_m[1],1)} m above the 1,737,400 m sphere · low slate → high sand. Retained {mesh.grid_shape.join(' × ')} vertices / {mesh.indices.length/3} triangles · source {mesh.source_pixel_spacing_m} m pixels, stride {mesh.source_stride_pixels}; last cell spacing may differ. Original read {mesh.source_window_shape.join(' × ')} pixels.</p><p>Gold edges bound the finite rendered surface and nodata holes. Nodata source pixels: {mesh.nodata_pixels}; omitted cells: {mesh.omitted_cells}. Retained window {number(mesh.projected_x_m.at(-1)!-mesh.projected_x_m[0],1)} × {number(mesh.projected_y_m[0]-mesh.projected_y_m.at(-1)!,1)} m. Dataset projected bounds / m: {mesh.dataset_bounds_m.join(', ')}. No terrain is supplied outside supported faces; this decimated window does not replace the native horizon DEM.</p><details><summary>Georeferencing and source provenance</summary><p>{mesh.source_url}</p><p className="mono">SHA256 {mesh.source_sha256}</p><p>{mesh.vertical_reference}</p><pre>{JSON.stringify({body_origin_m:mesh.body_origin_m,body_to_scene:mesh.body_to_scene,frame_transform:mesh.frame_transform,crs_wkt:mesh.crs_wkt},null,2)}</pre>{mesh.warnings.map(w=><p key={w}>{w}</p>)}</details></div>}
    {inspection&&<div className="viewer-inspection"><h3>Original DEM inspection</h3><p>{number(inspection.latitude_deg,8)}° N · {number(inspection.longitude_deg,8)}° E · {number(inspection.elevation_m)} m · {number(inspection.distance_from_site_m)} m from selected site on reference sphere.</p><p>MOON_ME_DE421 · {inspection.dataset_id} · {inspection.method}.</p><button className="button secondary" onClick={()=>{
      updateMission({...mission,site:{id:'custom',name:'Inspected LOLA coordinate',latitude:inspection.input_frame_latitude_deg,longitude:inspection.input_frame_longitude_deg,description:'Coordinate returned by the exact backend frame bridge at the original mission epoch. Reconfirm before analysis.'}});updateOptions({...options,frameConfirmed:false})
    }}>Use inspected coordinate</button></div>}
    {inspectMessage&&<p role="status">{inspectMessage}</p>}
    <div className="viewer-directions"><h3>Returned Sun / Earth directions</h3>{mode==='globe'&&<p>Scene marker at selected epoch: {number(latitude,8)}° N / {number(longitude,8)}° E in DE440/ME421.</p>}<p>Gold = Sun · cyan = Earth. {mode==='globe'?'Body-fixed DE440/ME421 context directions.':'Native DE421 local scene: +X east, +Y up, −Z north. Local arrows require terrain-aware per-epoch reconciliation.'}</p>{(['sun','earth'] as const).map(body=>{
      const b=native?.[body],az=mode==='globe'?observation?.[`${body}_azimuth_deg`].value:b?.azimuth_deg,el=mode==='globe'?observation?.[`${body}_elevation_deg`].value:b?.elevation_deg
      return <p key={body} className={`viewer-${body}`}>{body.toUpperCase()} · azimuth {number(az)}° · elevation {number(el)}° · terrain clearance {number(b?.clearance_deg)}° · {b?.classification.replaceAll('_',' ')||'Terrain classification unavailable'}.</p>
    })}<p>Missing directions are withheld. Center-only geometry; no independently validated browser shadowing or RF link budget. {options.providerMode==='mock'?'MOCK / NOT LUNAR PREDICTIONS: georeferenced direction arrows withheld.':''}</p></div>
    {result?.observations&&result.observations.length>1&&<label className="viewer-timeline">Scientific UTC sample {sampleIndex+1}/{result.observations.length}<input type="range" min="0" max={result.observations.length-1} value={sampleIndex} aria-label="Explorer scientific time sample" onChange={e=>selectSample(Number(e.target.value))}/></label>}
    {stats&&<p className="viewer-performance mono">On-demand draws {stats.draws} · mesh builds {stats.meshBuilds} · vertex updates {stats.vertexUpdates} · submitted triangles {stats.triangles} · buffers {number(stats.bufferBytes/1024,1)} KiB · last CPU render submission {number(stats.lastDrawMs,2)} ms · mesh build {number(stats.meshBuildMs,2)} ms. These are measured JS timings, not GPU frame times or guaranteed FPS.</p>}
    <Link className="text-link" to={compact?'/sites':'/analysis'}>{compact?'Open full terrain explorer':'Configure / run scientific analysis'}</Link>
  </section>
}
