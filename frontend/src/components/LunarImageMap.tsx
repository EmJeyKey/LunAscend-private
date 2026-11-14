import {useEffect,useRef,useState} from 'react'
import {Link} from 'react-router'
import {imageLayer,imageResolution,inImageBounds,mapLevel,mapPoint,mapProject,mapScale,mapUnproject,panMap,screenPoint,tileBounds,TilePool,visibleTiles,zoomMap,type MapView} from '../lib/imagery'
import {environmentColor,loadEnvironment,loadScreening,type ScreeningCriteria,type EnvironmentId,type EnvironmentRaster} from '../lib/environment'

export interface ImageAnchor {latitude:number;longitude:number;qualification:string}
export function LunarImageMap({anchor,onAdopt,onTerrain}:{anchor:ImageAnchor;onAdopt:(latitude:number,longitude:number)=>void;onTerrain?:()=>void}) {
  const [environment,setEnvironment]=useState<EnvironmentId|'none'>('none'),[environmentMode,setEnvironmentMode]=useState('long_term')
  const [raster,setRaster]=useState<EnvironmentRaster|null>(null),[environmentError,setEnvironmentError]=useState(''),[regions,setRegions]=useState(false)
  const [criteria,setCriteria]=useState<ScreeningCriteria>({minimum_solar_fraction:.5,minimum_earth_fraction:.5,exclude_permanent_shadow:true,require_mission_engineering:true,maximum_slope_deg:null}),[screeningRun,setScreeningRun]=useState(0)
  const activeRaster=environmentMode==='long_term'&&raster?.layer===environment&&(environment!=='screening'||JSON.stringify(raster.criteria)===JSON.stringify(criteria))?raster:null
  useEffect(()=>{
    setRaster(null);setEnvironmentError('')
    if(environment==='none'||environmentMode!=='long_term')return
    if(environment==='screening'&&screeningRun===0){setEnvironmentError('Set criteria, then apply screening.');return}
    const controller=new AbortController()
    void (environment==='screening'?loadScreening(criteria,controller.signal):loadEnvironment(environment,controller.signal)).then(value=>{if(!controller.signal.aborted)setRaster(value)},reason=>{if(!controller.signal.aborted)setEnvironmentError(reason instanceof Error?reason.message:'NASA layer unavailable.')})
    return ()=>controller.abort()
  },[environment,environmentMode,criteria,screeningRun])
  const [mode,setMode]=useState<'global'|'south'|'local'>('global')
  const [layerId,setLayerId]=useState('wac-global'),[revision,setRevision]=useState(0)
  const layer=imageLayer(layerId)
  const [view,setView]=useState<MapView>({x:0,y:0,resolution:360/800})
  const [size,setSize]=useState({width:800,height:500})
  const [picked,setPicked]=useState<{latitude:number;longitude:number}|null>(null)
  const canvas=useRef<HTMLCanvasElement>(null),container=useRef<HTMLDivElement>(null)
  const pool=useRef<TilePool|null>(null),pointers=useRef(new Map<number,[number,number]>()),moved=useRef(false),lastPinch=useRef<number|null>(null)
  const [load,setLoad]=useState({ready:0,total:0,failures:0,level:0})
  const fit=(nextMode:typeof mode,nextLayer=nextMode==='global'?'wac-global':nextMode==='local'?'nac-south':'wac-south')=>{
    const source=imageLayer(nextLayer),point=mapProject(source,anchor.latitude,anchor.longitude)
    const supported=inImageBounds(source,...point)
    setMode(nextMode);setLayerId(nextLayer);setPicked(null)
    setLoad({ready:0,total:0,failures:0,level:0})
    if(nextMode==='local'&&supported)setView({x:point[0],y:point[1],resolution:source.levels.at(-1)!.resolution*2})
    else setView({x:(source.bounds[0]+source.bounds[2])/2,y:(source.bounds[1]+source.bounds[3])/2,resolution:Math.max((source.bounds[2]-source.bounds[0])/size.width,(source.bounds[3]-source.bounds[1])/size.height)*1.06})
  }
  useEffect(()=>{
    const instance=new TilePool(()=>setRevision(v=>v+1));pool.current=instance
    const element=container.current!
    const observer=new ResizeObserver(()=>{const width=element.clientWidth,height=element.clientHeight;setSize({width:Math.max(width,1),height:Math.max(height,1)})})
    observer.observe(element)
    return ()=>{observer.disconnect();instance.dispose();pool.current=null}
  },[])
  // Follow selection in local mode; other modes keep the camera while moving the shared pin.
  useEffect(()=>{if(mode==='local'){const point=mapProject(layer,anchor.latitude,anchor.longitude);setView(v=>({...v,x:point[0],y:point[1]}))}},[anchor.latitude,anchor.longitude,mode,layer])
  useEffect(()=>{
    const element=canvas.current,tiles=pool.current
    if(!element||!tiles)return
    const dpr=Math.min(window.devicePixelRatio||1,1.5),{width,height}=size
    element.width=Math.round(width*dpr);element.height=Math.round(height*dpr)
    const context=element.getContext('2d');if(!context)return
    context.scale(dpr,dpr);context.clearRect(0,0,width,height)
    const level=mapLevel(layer,view,width,height,dpr)
    const requested=visibleTiles(layer,level,view,width,height)
    const parents=level>0?visibleTiles(layer,level-1,view,width,height):[]
    // Parents stay under finer tiles; absent and transparent pixels stay explicitly empty.
    const all=[...new Map([...visibleTiles(layer,0,view,width,height),...parents,...requested].map(tile=>[`${tile.level}/${tile.row}/${tile.column}`,tile])).values()]
    tiles.sync(all)
    context.save()
    const [left,top]=screenPoint(view,width,height,layer.bounds[0],layer.bounds[3])
    context.beginPath();context.rect(left,top,(layer.bounds[2]-layer.bounds[0])/view.resolution,(layer.bounds[3]-layer.bounds[1])/view.resolution);context.clip()
    let ready=0
    for(const tile of all){const image=tiles.get(tile);if(!image)continue
      const [x0,y0,x1,y1]=tileBounds(tile),p=screenPoint(view,width,height,x0,y1)
      context.clearRect(p[0],p[1],(x1-x0)/view.resolution+.25,(y1-y0)/view.resolution+.25)
      context.drawImage(image,p[0],p[1],(x1-x0)/view.resolution+.25,(y1-y0)/view.resolution+.25)
      if(tile.level===level)ready++
    }
    context.restore()
    if(activeRaster){
      const raster=activeRaster
      for(let row=0;row<65;row++)for(let col=0;col<65;col++){
        const color=environmentColor(raster.layer,raster.values[row*65+col]);if(!color)continue
        const ids=[row*66+col,row*66+col+1,(row+1)*66+col+1,(row+1)*66+col]
        context.beginPath()
        ids.forEach((index,i)=>{const [lat,lon]=raster.corners[index],p=screenPoint(view,width,height,...mapProject(layer,lat,lon));if(i===0)context.moveTo(...p);else context.lineTo(...p)})
        context.closePath();context.fillStyle=color;context.fill()
      }
    }
    const [x,y]=mapProject(layer,anchor.latitude,anchor.longitude),point=screenPoint(view,width,height,x,y)
    context.strokeStyle='#ffe6a5';context.lineWidth=2;context.beginPath();context.arc(...point,7,0,Math.PI*2);context.moveTo(point[0]-13,point[1]);context.lineTo(point[0]+13,point[1]);context.moveTo(point[0],point[1]-13);context.lineTo(point[0],point[1]+13);context.stroke()
    if(picked){const p=screenPoint(view,width,height,...mapProject(layer,picked.latitude,picked.longitude));context.strokeStyle='#7bbfd0';context.strokeRect(p[0]-5,p[1]-5,10,10)}
    const failures=tiles.errorsFor(layer.id)
    setLoad(old=>old.ready===ready&&old.total===requested.length&&old.failures===failures&&old.level===level?old:{ready,total:requested.length,failures,level})
  },[layer,view,size,revision,anchor,picked,activeRaster])
  useEffect(()=>{
    const element=canvas.current;if(!element)return
    const wheel=(event:WheelEvent)=>{event.preventDefault();const rect=element.getBoundingClientRect();setView(v=>zoomMap(v,rect.width,rect.height,event.clientX-rect.left,event.clientY-rect.top,Math.exp(Math.max(-200,Math.min(200,event.deltaY))*.0025),layer))}
    element.addEventListener('wheel',wheel,{passive:false});return ()=>element.removeEventListener('wheel',wheel)
  },[layer])
  const scale=mapScale(layer,view),sitePoint=mapProject(layer,anchor.latitude,anchor.longitude),supported=inImageBounds(layer,...sitePoint)
  const zoom=(factor:number)=>setView(v=>zoomMap(v,size.width,size.height,size.width/2,size.height/2,factor,layer))
  const inspectEnvironment=()=>{
    if(!activeRaster||!picked)return null
    const polar=imageLayer('wac-south'),[x,y]=mapProject(polar,picked.latitude,picked.longitude),[x0,y0]=mapProject(polar,...activeRaster.corners[0])
    const col=Math.floor((x-x0)/60),row=Math.floor((y0-y)/60)
    return row>=0&&row<65&&col>=0&&col<65?row*65+col:null
  }
  const inspectedIndex=inspectEnvironment(),inspectedValue=inspectedIndex===null?null:activeRaster?.values[inspectedIndex]??null
  const updateCriteria=(patch:Partial<ScreeningCriteria>)=>{setCriteria(old=>({...old,...patch}));setScreeningRun(0)}
  return <section className="lunar-image-map" aria-label="Photographic lunar map">
    <details className="environment-controls" open><summary>LUNAR ENVIRONMENT LAYERS</summary><div className="viewer-toolbar"><label>Environment mode<select value={environmentMode} onChange={e=>setEnvironmentMode(e.target.value)}><option value="long_term">A · Long-term environment</option><option value="mission">B · Selected mission date</option></select></label>{environmentMode==='long_term'?<label>NASA polar layer<select value={environment} onChange={e=>setEnvironment(e.target.value as EnvironmentId|'none')}><option value="none">Photographs only</option><option value="solar">Solar illumination · long-term fraction</option><option value="earth">Earth visibility · long-term fraction</option><option value="shadow">Permanent shadow · NASA model flag</option><option value="screening">Landing opportunity screening</option><option disabled>Terrain slope · no verified slope layer installed</option></select></label>:<p>Use Run Analysis for the selected UTC. Long-term colors are hidden; no date-specific raster is inferred.</p>}<button onClick={onTerrain}>Terrain elevation · existing LOLA view</button></div>{environment!=='none'&&environmentMode==='long_term'&&<><p role="status">{environmentError||(!activeRaster?'Loading verified NASA window…':`${activeRaster.product} · ${activeRaster.product_version} · 60 m pixels · native DE421`)}</p><p>Long-term NASA model, not conditions on your mission date. Only a 3.9 km window near Site01 is installed; other areas remain uncolored.</p>{activeRaster&&<><button onClick={()=>{const source=imageLayer('nac-south'),corner=activeRaster.corners[2178];setMode('local');setLayerId('nac-south');const [x,y]=mapProject(source,...corner);setView({x,y,resolution:Math.max(12,4500/Math.min(size.width,size.height))})}}>Show installed NASA window</button><p className="environment-legend">{environment==='screening'?'Green / amber / red / gray: explicit screening rules':environment==='shadow'?'Purple: modeled permanent shadow · faint neutral: not flagged':'Faint → strong color: 0 → 100% any-disk visibility'} · no color: not evaluated / missing.</p><p>Nominal placement on photographs; image-to-DE421 registration remains unverified. Earth-disk visibility does not establish DTE or radio contact.</p></>}</>}
    <label><input type="checkbox" checked={regions} onChange={e=>setRegions(e.target.checked)}/>NASA Artemis candidate regions</label>{regions&&<><p>October 2024 assessment · no priority order. Verified boundaries are not installed; no polygons inferred.</p><ul>{['Peak near Cabeus B','Haworth','Malapert Massif','Mons Mouton Plateau','Mons Mouton','Nobile Rim 1','Nobile Rim 2','de Gerlache Rim 2','Slater Plain'].map(name=><li key={name}>{name}</li>)}</ul><a href="https://www.nasa.gov/news-release/nasa-provides-update-on-artemis-iii-moon-landing-regions/" target="_blank" rel="noopener noreferrer">NASA assessment · 28 October 2024</a></>}</details>
    <div className="viewer-toolbar" aria-label="Photographic map modes"><button aria-pressed={mode==='global'} onClick={()=>fit('global')}>Global map</button><button aria-pressed={mode==='south'} onClick={()=>fit('south')}>South polar imagery</button><button aria-pressed={mode==='local'} onClick={()=>fit('local')}>Local site imagery</button></div>
    <div className="image-map-canvas" ref={container}>
      <canvas ref={canvas} tabIndex={0} role="img" aria-label="Interactive photographic lunar map. Drag to pan, wheel or pinch to zoom, click to inspect cartographic coordinates. Arrow keys pan; plus and minus zoom."
        onKeyDown={e=>{if(['+','=','-'].includes(e.key)){e.preventDefault();zoom(e.key==='-'?1.5:1/1.5)}else if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();setView(v=>panMap(v,e.key==='ArrowLeft'?80:e.key==='ArrowRight'?-80:0,e.key==='ArrowUp'?80:e.key==='ArrowDown'?-80:0))}}}
        onPointerDown={e=>{if(e.button!==0)return;e.currentTarget.setPointerCapture(e.pointerId);pointers.current.set(e.pointerId,[e.clientX,e.clientY]);moved.current=false}}
        onPointerMove={e=>{const old=pointers.current.get(e.pointerId);if(!old)return;const dx=e.clientX-old[0],dy=e.clientY-old[1];pointers.current.set(e.pointerId,[e.clientX,e.clientY]);if(Math.hypot(dx,dy)>1)moved.current=true
          if(pointers.current.size===2){const [a,b]=[...pointers.current.values()],distance=Math.hypot(a[0]-b[0],a[1]-b[1]);if(lastPinch.current){const rect=e.currentTarget.getBoundingClientRect();setView(v=>zoomMap(v,rect.width,rect.height,(a[0]+b[0])/2-rect.left,(a[1]+b[1])/2-rect.top,lastPinch.current!/distance,layer))}lastPinch.current=distance}
          else setView(v=>panMap(v,dx,dy))}}
        onPointerUp={e=>{const existed=pointers.current.delete(e.pointerId);lastPinch.current=null;if(existed&&!moved.current){const rect=e.currentTarget.getBoundingClientRect(),p=mapPoint(view,rect.width,rect.height,e.clientX-rect.left,e.clientY-rect.top);if(inImageBounds(layer,...p))setPicked(mapUnproject(layer,...p))}}}
        onPointerCancel={()=>{pointers.current.clear();lastPinch.current=null}}/>
      <div className="image-map-tools"><button aria-label="Map zoom in" onClick={()=>zoom(1/1.6)}>+</button><button aria-label="Map zoom out" onClick={()=>zoom(1.6)}>−</button></div>
      <span className="image-map-orientation">{layer.projection==='geographic'?'N ↑ · east-positive longitude →':'Projected +Y ↑ · +X → · pole at origin'}</span>
      <div className="image-map-scale"><span style={{width:Math.min(200,scale.pixels)}}/>{scale.meters>=1000?`${(scale.meters/1000).toPrecision(3)} km`:`${scale.meters.toPrecision(3)} m`} · approximate center scale</div>
      {!load.ready&&<p className="image-map-empty" role="status">{load.failures?'Imagery unavailable here. Cached tiles may remain; DEM and science are still available.':load.total?'Loading official lunar photographs…':'Outside this image product’s coverage. Pan back or reset the view.'}</p>}
    </div>
    <div className="viewer-camera"><button onClick={()=>fit('global')}>Fit Moon</button><button onClick={()=>fit('south')}>Fit south pole</button><button onClick={()=>fit('local')}>Zoom to landing site</button><button onClick={()=>fit(mode,layerId)}>Reset map</button><button onClick={()=>{pool.current?.retry();setRevision(v=>v+1)}}>Retry images</button>{mode!=='global'&&<label>Photographic layer<select value={layerId} onChange={e=>fit(mode,e.target.value)}><option value="wac-south">WAC · regional context</option><option value="nac-south">NAC · supported polar region</option></select></label>}</div>
    <p className="mono image-map-status">{layer.title} · source level {load.level}/{layer.levels.length-1} · {imageResolution(layer,load.level)} · {load.ready}/{load.total} detail tiles loaded{load.failures?` · ${load.failures} failed requests; cached parents retained`:''}.</p>
    {!supported&&<p role="status">The selected site is outside this layer’s declared coverage. Use the global WAC map; no high-resolution NAC detail is inferred.</p>}
    {environment==='screening'&&environmentMode==='long_term'&&<div className="screening-criteria"><h3>Landing opportunity screening</h3><p>Region: installed Site01 3.9 km window. Long-term criteria only; use the opportunity finder for mission dates and hardware.</p><div className="resilience-controls"><label>Minimum long-term sunlight / fraction<input type="number" min="0" max="1" step=".05" value={criteria.minimum_solar_fraction} onChange={e=>updateCriteria({minimum_solar_fraction:Number(e.target.value)})}/></label><label>Minimum long-term Earth visibility / fraction<input type="number" min="0" max="1" step=".05" value={criteria.minimum_earth_fraction} onChange={e=>updateCriteria({minimum_earth_fraction:Number(e.target.value)})}/></label><label>Mandatory maximum slope / degrees (optional)<input type="number" min="0" max="90" value={criteria.maximum_slope_deg??''} onChange={e=>updateCriteria({maximum_slope_deg:e.target.value===''?null:Number(e.target.value)})}/></label></div><label><input type="checkbox" checked={criteria.exclude_permanent_shadow} onChange={e=>updateCriteria({exclude_permanent_shadow:e.target.checked})}/>Exclude modeled permanent shadow</label><label><input type="checkbox" checked={criteria.require_mission_engineering} onChange={e=>updateCriteria({require_mission_engineering:e.target.checked})}/>Require date-specific mission engineering evidence (not available in this average raster)</label><button onClick={()=>setScreeningRun(v=>v+1)}>Apply screening criteria</button><p>Green: promising under evaluated criteria. Amber: a critical requirement is unknown. Red: fails a mandatory criterion. Gray: insufficient data. No color certifies landing safety.</p><Link to="/resilience#opportunity-finder">Find better landing opportunities for a selected mission date</Link></div>}
    {picked&&activeRaster&&<p className="mono">NASA layer at inspected pixel: {inspectedValue===null?'Outside installed coverage / unavailable':activeRaster.layer==='screening'?['Gray · insufficient data','Red · fails mandatory requirement','Amber · critical evidence unknown','Green · meets selected long-term criteria only'][inspectedValue]:activeRaster.layer==='shadow'?(inspectedValue===1?'Modeled permanent shadow':'Not flagged as permanent shadow'):`${(inspectedValue*100).toFixed(3)}% long-term any-disk visibility`}. Not a selected-date forecast.</p>}
    {picked&&activeRaster?.layer==='screening'&&inspectedIndex!==null&&<div className="screening-reasons"><h3>Why this classification?</h3><p>Solar / Earth visibility / shadow flag: {activeRaster.cell_evidence?.[inspectedIndex].map(v=>v===null?'unknown':v.toFixed(5)).join(' / ')}</p><ul>{activeRaster.reasons?.[inspectedIndex].map(reason=><li key={reason}>{reason.replaceAll('_',' ')}</li>)}</ul><p>Thresholds: solar ≥ {activeRaster.criteria?.minimum_solar_fraction}; Earth ≥ {activeRaster.criteria?.minimum_earth_fraction}. Mandatory missing evidence cannot pass.</p></div>}
    {activeRaster&&<details><summary>NASA raster source and limitations</summary><p>{activeRaster.attribution}</p><p>{activeRaster.time_basis}</p><p className="mono">Window SHA256 {activeRaster.source_sha256}</p>{activeRaster.limitations.map(line=><p key={line}>{line}</p>)}<a href={activeRaster.source_url} target="_blank" rel="noopener noreferrer">Official scientific raster</a></details>}
    <p>Gold cross: selected scientific input, placed nominally on the source cartographic grid. {anchor.qualification} No verified image-to-DEM registration; photographs are not used for elevation, visibility or power. Acquisition shadows are from {layer.acquisition}, not the selected UTC.</p>
    {picked&&<div className="viewer-inspection"><p className="mono">Cartographic image inspection · {picked.latitude.toFixed(7)}° N · {picked.longitude.toFixed(7)}° E. Exact dynamical frame unspecified by source.</p><button onClick={()=>onAdopt(picked.latitude,picked.longitude)}>Use as unconfirmed coordinate input</button><p>This action clears previous results. Declare and confirm the scientific frame separately before analysis; no image-to-DE421 conversion is implied.</p></div>}
    <details><summary>Image source, projection and attribution</summary><p>{layer.provider} · {layer.product}</p><p>Coverage: {layer.coverage}. Nominal original product {layer.nominal_source_m_per_pixel} m/px; delivered service resolution shown above. Transparent pixels and absent tiles remain missing.</p><p>{layer.projection==='geographic'?'Lunar geographic grid; planetocentric latitude / east-positive longitude on radius 1,737,400 m.': 'Lunar south-polar stereographic; radius 1,737,400 m, central meridian 0°, standard parallel −90°, false E/N 0.'} {layer.frame}</p><p>{layer.usage}</p><a href={layer.source_url+'/1.0.0/WMTSCapabilities.xml'} target="_blank" rel="noopener noreferrer">Official source capabilities</a></details>
  </section>
}
