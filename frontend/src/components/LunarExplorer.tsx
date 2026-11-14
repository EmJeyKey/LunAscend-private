import {memo,useCallback,useEffect,useMemo,useRef,useState,type MouseEvent} from 'react'
import {Link} from 'react-router'
import {useMission} from '../state/MissionContext'
import {inspectTerrain,requestMesh,requestLocalHorizon} from '../api/visualization'
import {elevationColor,geographicToScene,globalDirection,localDirection,matchingTerrain,rendererLease,surfaceBearing} from '../lib/lunarScene'
import type {DirectionOverlay,MeshRequest,RenderStats,SurfaceBearing,TerrainInspection,TerrainMesh} from '../types/visualization'
import type {TerrainHorizon} from '../types/analysis'
import {LunarHorizon} from './LunarHorizon'
import {usePresentation} from '../state/PresentationContext'
import {ScientificDetails} from './PresentationControls'
import {SourceInfo} from './SourceInfo'
import {conditionSamples} from '../lib/humanize'
import {LunarImageMap,type ImageAnchor} from './LunarImageMap'
import {requestImageAnchor} from '../api/imagery'
import type {GlobeImageStatus} from '../visualization/GlobeImagery'
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
  const {advanced}=usePresentation()
  const result=analysis.result
  const [mode,setMode]=useState<'globe'|'images'|'terrain'|'polar'|'surface'>('globe')
  const localMode=mode!=='globe'&&mode!=='images'
  const [imageStatus,setImageStatus]=useState<GlobeImageStatus|null>(null)
  const [anchorState,setAnchorState]=useState<{key:string;value:ImageAnchor}|null>(null)
  const [api,setApi]=useState<LunarView|null>(null),[gpuError,setGpuError]=useState(''),[compatibility,setCompatibility]=useState(false)
  const [meshState,setMeshState]=useState<{key:string;value:TerrainMesh}|null>(null),[loading,setLoading]=useState(false),[error,setError]=useState('')
  const [extent,setExtent]=useState(1000),[detail,setDetail]=useState<33|65|129>(65),[factor,setFactor]=useState(1),[colors,setColors]=useState(false),[retry,setRetry]=useState(0)
  const [inspection,setInspection]=useState<TerrainInspection|null>(null),[inspectMessage,setInspectMessage]=useState('')
  const [stats,setStats]=useState<RenderStats|null>(null)
  const [surfaceWarning,setSurfaceWarning]=useState('')
  const [bearing,setBearing]=useState<SurfaceBearing>({azimuth:0,elevation:0}),[indicators,setIndicators]=useState(true),[showHorizon,setShowHorizon]=useState(true)
  const [horizonState,setHorizonState]=useState<{key:string;profile:TerrainHorizon}|null>(null),[horizonError,setHorizonError]=useState('')
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
      return new module.LunarRenderer(element,p=>pickRef.current(p),setStats,message=>{setGpuError(message);setApi(null)},setBearing,setSurfaceWarning,setImageStatus)
    },value=>{setApi(value);setGpuError('')},reason=>{setApi(null);setGpuError(`3D unavailable: ${reason instanceof Error?reason.message:'WebGL initialization failed'}. The coordinate form, polar DEM map and scientific analysis remain available.`)})
  },[compatibility])
  useEffect(()=>{
    // Mode switches retain the same native mesh; changes to physical inputs still invalidate by requestKey.
    if(!localMode){setLoading(false);setError('');setInspection(null);inspectionJob.current?.abort();meshRef.current=mesh;return}
    const refresh=retry!==consumedRefresh.current;consumedRefresh.current=retry
    if(!refresh&&options.providerMode==='scientific'&&options.frameConfirmed&&meshState?.key===requestKey){meshRef.current=meshState.value;return}
    setMeshState(null);meshRef.current=null;setError('');setInspection(null);inspectionJob.current?.abort()
    if(options.providerMode!=='scientific'||!options.frameConfirmed){setLoading(false);setError('Confirm Scientific SPICE and the DE440/ME421 coordinate reference before loading NASA terrain. Mock data never supplies georeferenced terrain.');return}
    const controller=new AbortController();setLoading(true)
    void requestMesh(request,controller.signal,refresh).then(value=>{
      if(!controller.signal.aborted){meshRef.current=value;setMeshState({key:requestKey,value});setLoading(false)}
    },reason=>{if(!controller.signal.aborted){setError(reason instanceof Error?reason.message:'NASA terrain unavailable.');setLoading(false)}})
    return ()=>controller.abort()
    // Sample index/time cursor is deliberately absent: cached static terrain is independent of ephemeris selection.
  },[requestKey,localMode,options.providerMode,options.frameConfirmed,retry])
  useEffect(()=>()=>inspectionJob.current?.abort(),[])
  useEffect(()=>{api?.setMode(!localMode?'globe':mode==='surface'?'surface':'terrain')},[api,mode])
  useEffect(()=>{api?.setMesh(mesh)},[api,mesh])
  const renderFactor=mode==='surface'?1:factor
  useEffect(()=>{api?.setExaggeration(renderFactor)},[api,renderFactor])
  useEffect(()=>{api?.setColorMode(colors)},[api,colors])
  useEffect(()=>{api?.setSurfaceBearing(bearing)},[api,bearing])
  useEffect(()=>{api?.setIndicators(indicators)},[api,indicators])
  const observation=result?.provider_mode==='scientific'?result.observations?.[sampleIndex]:null
  const matched=matchingTerrain(result,mesh)
  const native=(mode==='globe'&&result?.provider_mode==='scientific'||matched)?result?.terrain_visibility?.observations[sampleIndex]:null
  const horizonSettings=useMemo(()=>({max_search_radius_m:Number(options.terrainRadiusM||2500),radial_step_m:Number(options.terrainRadialStepM||5),azimuth_samples:Number(options.terrainAzimuthSamples||360)}),[options.terrainRadiusM,options.terrainRadialStepM,options.terrainAzimuthSamples])
  const horizonKey=mesh?JSON.stringify([mesh.request.dataset_id,mesh.source_sha256,mesh.native_latitude_deg,mesh.native_longitude_deg,mesh.request.observer_height_m,horizonSettings]):''
  const savedHorizon=matched&&result?.horizon?.reference_frame==='MOON_ME_DE421'?result.horizon:null
  const horizon=savedHorizon||(horizonState?.key===horizonKey?horizonState.profile:null)
  useEffect(()=>{
    setHorizonError('')
    if(!mesh||!localMode||!showHorizon||horizon)return
    const controller=new AbortController()
    void requestLocalHorizon(mesh,horizonSettings,controller.signal).then(profile=>{
      if(!controller.signal.aborted)setHorizonState({key:horizonKey,profile})
    },reason=>{if(!controller.signal.aborted)setHorizonError(reason instanceof Error?reason.message:'Horizon unavailable.')})
    return ()=>controller.abort()
  },[mesh,localMode,showHorizon,horizon,horizonKey,horizonSettings])
  const reconciled=result?.terrain_visibility?.observer_geometry?.[sampleIndex]
  const latitude=typeof reconciled?.latitude_deg_de440==='number'?reconciled.latitude_deg_de440:site.latitude
  const longitude=typeof reconciled?.longitude_deg_de440==='number'?reconciled.longitude_deg_de440:site.longitude
  useEffect(()=>{api?.setMarker(latitude,longitude)},[api,latitude,longitude])
  const overlays=useMemo<DirectionOverlay>(()=>{
    if(mode==='globe')return {origin:geographicToScene(latitude,longitude,1.014),sun:observation&&(!result?.terrain_visibility||reconciled)?globalDirection(latitude,longitude,observation.sun_azimuth_deg.value,observation.sun_elevation_deg.value):null,earth:observation&&(!result?.terrain_visibility||reconciled)?globalDirection(latitude,longitude,observation.earth_azimuth_deg.value,observation.earth_elevation_deg.value):null}
    return {origin:mesh?.observer_scene_m||[0,0,0],sun:mesh&&native?localDirection(native.sun.azimuth_deg,native.sun.elevation_deg):null,earth:mesh&&native?localDirection(native.earth.azimuth_deg,native.earth.elevation_deg):null,surfaceSun:native?.sun.classification==='conditional_clearance',surfaceEarth:native?.earth.classification==='conditional_clearance'}
  },[mode,latitude,longitude,observation,native,mesh,reconciled,result])
  useEffect(()=>{api?.setDirections(overlays)},[api,overlays])
  const loadExample=()=>{
    updateMission({site:{id:'custom',name:'LOLA Site01 example',latitude:-89.46315760953222,longitude:-137.50097847854008,description:'DE440/ME421 coordinate at 2026-11-14 00:00 UTC, corresponding to the documented native DE421 Site01 pixel center; not a surveyed landing site.'},startUtc:'2026-11-14T00:00:00Z',durationHours:24})
    updateOptions({...options,providerMode:'scientific',terrainEnabled:true,observerHeightM:'2',sampleStepS:'3600',frameConfirmed:false})
    setMode('terrain')
  }
  const currentTime=observation?.time_utc||mission.startUtc
  const anchorKey=JSON.stringify([site.latitude,site.longitude,mission.startUtc,options.frameConfirmed,options.providerMode])
  useEffect(()=>{
    if(!options.frameConfirmed||options.providerMode!=='scientific')return
    const controller=new AbortController()
    void requestImageAnchor(site.latitude,site.longitude,mission.startUtc,controller.signal).then(value=>{
      if(!controller.signal.aborted)setAnchorState({key:anchorKey,value})
    },()=>{})
    return ()=>controller.abort()
  },[anchorKey])
  const imageAnchor:ImageAnchor=mesh?{latitude:mesh.native_latitude_deg,longitude:mesh.native_longitude_deg,qualification:'Scientific anchor from the exact DEM-native DE421 frame bridge; image registration remains unverified.'}:anchorState?.key===anchorKey?anchorState.value:{latitude:site.latitude,longitude:site.longitude,qualification:'Unreconciled input coordinate shown as context only; not a registered scientific pin.'}
  const adoptImageCoordinate=(latitude:number,longitude:number)=>{
    updateMission({...mission,site:{id:'custom',name:'Unconfirmed image coordinate',latitude,longitude,description:'Moon cartographic image coordinate; source dynamical realization is unspecified. User must establish its scientific frame before analysis.'}})
    updateOptions({...options,frameConfirmed:false});setInspectMessage('Image coordinate adopted as unconfirmed input. The source does not establish a DE421 / DE440 tie. No scientific transformation was inferred.')
  }
  return <section className={`panel lunar-explorer ${compact?'compact':''}`} aria-label="Scientific lunar explorer">
    <header className="section-introduction"><h2>Lunar exploration instrument</h2><p>{mode==='images'?'LROC photographic maps · lunar geographic / south-polar projection. Registration to the local DEM remains unverified.':mode==='globe'?'LROC photographs · no global elevation model. Image shadows are historical.':'NASA LOLA Site01 · actual elevations, finite data coverage. Rendering is independently unvalidated.'}</p></header>
    <div className="viewer-toolbar" aria-label="Lunar view"><button aria-pressed={mode==='globe'} onClick={()=>setMode('globe')}>Whole Moon</button><button aria-pressed={mode==='images'} onClick={()=>setMode('images')}>Photographic maps</button><button aria-pressed={mode==='polar'} onClick={()=>setMode('polar')}>Elevation map (2D)</button><button aria-pressed={mode==='terrain'} onClick={()=>setMode('terrain')}>Landing area (3D)</button><button aria-pressed={mode==='surface'} onClick={()=>setMode('surface')}>Surface View</button><button onClick={loadExample}>Load Site01 reference</button></div>
    <p className="viewer-location-help">{site.name} · {Math.abs(site.latitude)>80?`Near the Moon’s ${site.latitude<0?'south':'north'} pole.`:site.latitude<0?'In the Moon’s southern hemisphere.':'In the Moon’s northern hemisphere.'} {localMode?'Ridges and craters are elevation geometry from LOLA.':'Archived photographs; not terrain heights.'}</p>
    <details className="viewer-reference" open={advanced||localMode&&!options.frameConfirmed}><summary>Coordinates and scientific reference</summary><span>{site.name} · {number(site.latitude,6)}° N · {number(site.longitude,6)}° E</span><span>Input: DE440/ME421 at {mission.startUtc}</span>{<label><input type="checkbox" checked={options.frameConfirmed} onChange={e=>updateOptions({...options,frameConfirmed:e.target.checked})}/>I confirm these coordinates use DE440/ME421 at this UTC epoch.</label>}</details>
    {localMode&&<details className="viewer-display-settings" open={advanced}><summary>Terrain detail and display settings</summary><div className="viewer-settings"><label>Window half-width / m<select value={extent} onChange={e=>setExtent(Number(e.target.value))}>{[250,500,1000,2000,4000].map(v=><option key={v} value={v}>{v}</option>)}</select></label><label>Mesh detail / maximum side<select value={detail} onChange={e=>setDetail(Number(e.target.value) as 33|65|129)}><option value="33">33 · low detail</option><option value="65">65 · standard</option><option value="129">129 · high detail</option></select></label><label>Vertical exaggeration<select value={renderFactor} disabled={mode==='surface'} onChange={e=>setFactor(Number(e.target.value))}>{[1,2,5,10].map(v=><option key={v} value={v}>{v}×{v===1?' · true scale':''}</option>)}</select></label><label><input type="checkbox" checked={colors} onChange={e=>setColors(e.target.checked)}/>Elevation colors</label></div></details>}
    {localMode&&<p className="viewer-exaggeration">{renderFactor}× vertical exaggeration · {renderFactor===1?'true-scale spherical geometry':'rendering only; relative to selected-site elevation'}. {mode==='surface'?'Surface View locks true scale to preserve the DEM-derived eye height. ':''}Direction annotations retain true angles; visual intersections are not visibility classifications.</p>}
    {mode==='surface'&&<div className="surface-controls" aria-label="Surface camera orientation"><label>Camera azimuth / °<input aria-label="Surface camera azimuth" type="range" min="0" max="360" step="0.1" value={bearing.azimuth} onChange={e=>setBearing(surfaceBearing(Number(e.target.value),bearing.elevation))}/></label><label>Camera elevation / °<input aria-label="Surface camera elevation" type="range" min="-89" max="89" step="0.1" value={bearing.elevation} onChange={e=>setBearing(surfaceBearing(bearing.azimuth,Number(e.target.value)))}/></label><output className="mono">Az {number(bearing.azimuth,1)}° · El {number(bearing.elevation,1)}°</output><div className="viewer-camera">{[['N',0],['E',90],['S',180],['W',270]].map(([label,a])=><button key={label} onClick={()=>setBearing({azimuth:Number(a),elevation:0})}>{label} · {a}°</button>)}{(['sun','earth'] as const).map(body=><button key={body} disabled={native?.[body].azimuth_deg==null||native?.[body].elevation_deg==null} onClick={()=>setBearing(surfaceBearing(native![body].azimuth_deg!,native![body].elevation_deg!))}>Look toward {body==='sun'?'Sun':'Earth'}</button>)}</div></div>}
    {mode==='images'&&<LunarImageMap anchor={imageAnchor} onAdopt={adoptImageCoordinate}/>}
    <div className="viewer-stage-wrap" style={{display:mode==='images'?'none':undefined}}>
      <div className="viewer-stage" ref={host} style={{display:mode==='polar'||compatibility?'none':undefined}}/>
      {(mode==='polar'||compatibility)&&mesh&&<MemoPolarWindow mesh={mesh} onInspect={inspect}/>}
      {(mode==='polar'||compatibility)&&!mesh&&<div className="viewer-map-empty">{mode==='globe'?'3D compatibility mode. Select Local terrain or South polar map to load georeferenced data.':'No DEM window available. Check the coordinate confirmation and resource status below.'}</div>}
      <div className="viewer-epoch"><time>{currentTime}</time><span>{observation?'Returned scientific sample':'No scientific sample selected'}</span></div>
      {mode==='surface'&&!compatibility&&!gpuError&&<div className="surface-reticle" aria-hidden="true">+</div>}
      {mode==='surface'&&<p className="surface-caption">{compatibility||gpuError?'2D fallback · no ground-level perspective':mesh&&mesh.request.observer_height_m>0?`DEM observer ${number(mesh.request.observer_height_m)} m · az ${number(bearing.azimuth,1)}° · el ${number(bearing.elevation,1)}°`:'Surface observer unavailable; a supported DEM and positive observer height are required.'}</p>}
      {(loading||error||gpuError)&&<div className="viewer-data-state" role="status">{loading?'Verifying/loading bounded NASA terrain…':error||gpuError}</div>}
      {mode==='surface'&&!compatibility&&surfaceWarning&&<div className="viewer-data-state" role="alert">{surfaceWarning}</div>}
    </div>
    {mode!=='images'&&<div className="viewer-camera"><button onClick={()=>api?.camera('reset')} disabled={!api||compatibility}>Go to selected site</button>{mode!=='surface'&&<><button onClick={()=>api?.camera(mode==='globe'?'south':'top')} disabled={!api||compatibility}>{mode==='globe'?'South pole':'Top view'}</button>{mode==='globe'&&<><button onClick={()=>api?.camera('regional')}>Regional view</button><button onClick={()=>api?.camera('neighborhood')}>Landing neighborhood</button></>}<button onClick={()=>api?.camera('in')} disabled={!api||compatibility}>Zoom in</button><button onClick={()=>api?.camera('out')} disabled={!api||compatibility}>Zoom out</button></>}<label><input type="checkbox" checked={compatibility} onChange={e=>{setApi(null);setCompatibility(e.target.checked)}}/>2D compatibility mode</label><label><input type="checkbox" checked={indicators} onChange={e=>setIndicators(e.target.checked)}/>Sun / Earth indicators</label>{localMode&&<label><input type="checkbox" checked={showHorizon} onChange={e=>setShowHorizon(e.target.checked)}/>Scientific horizon profile</label>}</div>}
    {mode!=='images'&&<p>{mode==='surface'?'Drag to look around the fixed DEM observer, or use the azimuth/elevation controls. No translation or arbitrary eye altitude. Gold/cyan sky points are direction annotations, not apparent disks; obstructed or unknown centers are withheld from the sky and retain bearing cues below.':'Drag to orbit · scroll/pinch to zoom · right drag or two fingers to pan local terrain. Click a surface to select a context coordinate or inspect its nearest retained DEM vertex. Marker and arrows are annotations, not physical object sizes/distances. A globe click starts the new coordinate selection at the displayed UTC epoch.'}</p>}
    {localMode&&<p>Black sky · elevation-shaded NASA DEM. Unshadowed illustrative lighting follows the returned native SPICE Sun direction when available; ambient fill aids inspection. No atmospheric haze or validated browser shadow model is installed. Photographs are available separately in the map and context globe; no unverified texture is draped onto this DEM.</p>}
    {localMode&&showHorizon&&<ScientificDetails title="View local horizon"><p>The horizon profile describes the modeled skyline around the observer. It has its own finite range and sampling; the visible 3D window may be smaller or coarser.</p><LunarHorizon horizon={horizon} row={native} azimuth={mode==='surface'&&!compatibility&&!gpuError?bearing.azimuth:null}/>{horizonError&&<p role="alert">{horizonError}</p>}{mesh&&<p>The scientific horizon and this rendered window have independent extents and sampling. The mesh spans approximately {number(mesh.projected_x_m.at(-1)!-mesh.projected_x_m[0],0)} × {number(mesh.projected_y_m[0]-mesh.projected_y_m.at(-1)!,0)} m at retained pixel spacing; horizon rays use {horizon?.radial_step_m??'unknown'} m steps out to {horizon?.max_search_radius_m??'unknown'} m. The separate profile is authoritative for the modeled horizon; no distant terrain is fabricated to match it. Decimated triangles may differ near the DEM-derived camera.</p>}</ScientificDetails>}
    {gpuError&&<p role="alert" className="analysis-error">{gpuError} <button onClick={()=>{setCompatibility(true);setMode('polar')}}>Use polar DEM fallback</button> <Link to="/analysis">Open scientific analysis</Link></p>}
    {loading&&<p role="status">Loading and verifying a bounded NASA DEM window…</p>}{error&&<p role="alert" className="analysis-error">{error}</p>}
    {localMode&&<button className="text-link" onClick={()=>setRetry(v=>v+1)} disabled={loading}>Reload verified terrain</button>}
    {localMode&&mesh&&<p className="viewer-location-help">Surface elevation: {number(mesh.surface_elevation_m)} m above the documented lunar sphere. Observer: {number(mesh.request.observer_height_m)} m above the surface. Missing terrain is never filled with invented mountains.</p>}
    <SourceInfo kind={localMode?'terrain':'images'} result={result||undefined}/>
    <ScientificDetails title="Coordinates, source registration and direction details" reveal={!!inspection||!!inspectMessage}>
    {mesh&&localMode&&<div className="viewer-metadata"><p>Native DE421 site {number(mesh.native_latitude_deg,8)}° N / {number(mesh.native_longitude_deg,8)}° E · surface {number(mesh.surface_elevation_m)} m · observer {number(mesh.request.observer_height_m)} m above terrain.</p><p>Elevation scale: {number(mesh.original_elevation_range_m[0],1)}–{number(mesh.original_elevation_range_m[1],1)} m above the 1,737,400 m sphere · optional elevation colors: low slate → high sand. Retained {mesh.grid_shape.join(' × ')} vertices / {mesh.indices.length/3} triangles · source {mesh.source_pixel_spacing_m} m pixels, stride {mesh.source_stride_pixels}; last cell spacing may differ. Original read {mesh.source_window_shape.join(' × ')} pixels.</p><p>Gold edges bound the finite rendered surface and nodata holes. Nodata source pixels: {mesh.nodata_pixels}; omitted cells: {mesh.omitted_cells}. Retained window {number(mesh.projected_x_m.at(-1)!-mesh.projected_x_m[0],1)} × {number(mesh.projected_y_m[0]-mesh.projected_y_m.at(-1)!,1)} m. Dataset projected bounds / m: {mesh.dataset_bounds_m.join(', ')}. No terrain is supplied outside supported faces; this decimated window does not replace the native horizon DEM.</p><details><summary>Georeferencing and source provenance</summary><p>{mesh.source_url}</p><p className="mono">SHA256 {mesh.source_sha256}</p><p>{mesh.vertical_reference}</p><pre>{JSON.stringify({body_origin_m:mesh.body_origin_m,body_to_scene:mesh.body_to_scene,frame_transform:mesh.frame_transform,crs_wkt:mesh.crs_wkt},null,2)}</pre>{mesh.warnings.map(w=><p key={w}>{w}</p>)}</details></div>}
    {inspection&&<div className="viewer-inspection"><h3>Original DEM inspection</h3><p>{number(inspection.latitude_deg,8)}° N · {number(inspection.longitude_deg,8)}° E · {number(inspection.elevation_m)} m · {number(inspection.distance_from_site_m)} m from selected site on reference sphere.</p><p>MOON_ME_DE421 · {inspection.dataset_id} · {inspection.method}.</p><button className="button secondary" onClick={()=>{
      updateMission({...mission,site:{id:'custom',name:'Inspected LOLA coordinate',latitude:inspection.input_frame_latitude_deg,longitude:inspection.input_frame_longitude_deg,description:'Coordinate returned by the exact backend frame bridge at the original mission epoch. Reconfirm before analysis.'}});updateOptions({...options,frameConfirmed:false})
    }}>Use inspected coordinate</button></div>}
    {inspectMessage&&<p role="status">{inspectMessage}</p>}
    {mode==='globe'&&<><p className="mono image-map-status">{imageStatus?`${imageStatus.layer} · source level ${imageStatus.level} · ${imageStatus.resolution} · ${imageStatus.ready}/${imageStatus.total} detail tiles ready${imageStatus.failures?` · ${imageStatus.failures} requests unavailable; cached context retained`:''}`:'Loading authentic NASA / LROC photographs…'}</p><p>Photographs are a cartographic context shell, not a global DEM. Their exact DE421 / DE440 tie is unspecified; the scientific marker and directions retain their declared frame. Image acquisition shadows are historical; the optical shell is unlit to avoid confusing those shadows with a current prediction. Local terrain lighting still follows returned SPICE directions. No visual texture or shadow enters scientific calculations.</p></>}
    <details className="viewer-imagery"><summary>Optical imagery and registration</summary><p>NASA Moon Trek supplies LROC WAC global v2 and south-polar mosaics, plus the USGS / LMMP 2011 NAC south-polar mosaic. Genuine photographic tiles load progressively in the internal 2D maps and 3D context globe. Source acquisition: 2009–2011. Credit NASA / GSFC / Arizona State University; polar NAC also USGS / LMMP. No endorsement.</p><p>Local photographic draping is withheld: the source's cartographic metadata does not establish an exact realization or measured image-to-Site01 DEM tie. The local 3D terrain remains original LOLA geometry with DEM shading; inspect NAC photographs separately in the polar map. Missing source pixels stay missing; no synthetic detail is supplied. Cached images are available offline after viewing; uncached images require the official service. DEM and scientific calculations remain local.</p><a href="https://trek.nasa.gov/tiles/apidoc/trekAPI.html?body=moon" target="_blank" rel="noopener noreferrer">Official Moon Trek WMTS documentation</a></details>
    <div className="viewer-directions"><h3>Returned Sun / Earth directions</h3>{mode==='globe'&&<p>Scene marker at selected epoch: {number(latitude,8)}° N / {number(longitude,8)}° E in DE440/ME421.</p>}<p>Gold = Sun · cyan = Earth. {mode==='globe'?'Body-fixed DE440/ME421 context directions.':'Native DE421 local scene: +X east, +Y up, −Z north. Local arrows require terrain-aware per-epoch reconciliation.'}</p>{(['sun','earth'] as const).map(body=>{
      const b=native?.[body],az=mode==='globe'?observation?.[`${body}_azimuth_deg`].value:b?.azimuth_deg,el=mode==='globe'?observation?.[`${body}_elevation_deg`].value:b?.elevation_deg
      return <p key={body} className={`viewer-${body}`}>{body.toUpperCase()} · azimuth {number(az)}° · elevation {number(el)}° · terrain clearance {number(b?.clearance_deg)}° · {b?.classification.replaceAll('_',' ')||'Terrain classification unavailable'}.</p>
    })}<p>Missing directions are withheld. Center-only geometry; no independently validated browser shadowing or RF link budget. {options.providerMode==='mock'?'MOCK / NOT LUNAR PREDICTIONS: georeferenced direction arrows withheld.':''}</p></div>
    </ScientificDetails>
    {result&&<p className="viewer-location-help">At the selected time: {conditionSamples(result,'sun')[sampleIndex]?.label||'Sun not calculated'}. {conditionSamples(result,'earth')[sampleIndex]?.label||'Earth not calculated'}. Earth visibility does not establish a working radio link.</p>}
    {result?.observations&&result.observations.length>1&&<label className="viewer-timeline">Scientific UTC sample {sampleIndex+1}/{result.observations.length}<input type="range" min="0" max={result.observations.length-1} value={sampleIndex} aria-label="Explorer scientific time sample" onChange={e=>selectSample(Number(e.target.value))}/></label>}
    {advanced&&stats&&<p className="viewer-performance mono">On-demand draws {stats.draws} · mesh builds {stats.meshBuilds} · vertex updates {stats.vertexUpdates} · submitted triangles {stats.triangles} · buffers {number(stats.bufferBytes/1024,1)} KiB · last CPU render submission {number(stats.lastDrawMs,2)} ms · mesh build {number(stats.meshBuildMs,2)} ms. These are measured JS timings, not GPU frame times or guaranteed FPS.</p>}
    <Link className="text-link" to={compact?'/sites':'/analysis'}>{compact?'Open full terrain explorer':'Configure / run scientific analysis'}</Link>
  </section>
}
