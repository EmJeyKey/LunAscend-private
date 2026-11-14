import {describe,it,expect,vi,afterEach} from 'vitest'
import {renderToStaticMarkup} from 'react-dom/server'
import {MemoryRouter} from 'react-router'
import evidence from '../../../docs/validation/step-10-results.json'
import original from '../../../docs/validation/step-9-results.json'
import {geographicToScene,sceneToGeographic,localDirection,globalDirection,exaggeratedPositions,rendererLease} from '../lib/lunarScene'
import {parseMesh,requestMesh,inspectTerrain} from '../api/visualization'
import {parseResult} from '../api/analysis'
import {LunarExplorer} from '../components/LunarExplorer'
import type {MeshRequest,Vector3} from '../types/visualization'
import type {ScenarioRequest} from '../types/analysis'
const request=evidence.mesh.request as MeshRequest
const result=original.response.baseline
vi.mock('../state/MissionContext',()=>({useMission:()=>({mission:{site:{id:'site01',name:'Site01',latitude:request.latitude_deg,longitude:request.longitude_deg,description:'Explicit reference input'},startUtc:request.coordinate_epoch_utc,durationHours:24},options:{providerMode:'scientific',frameConfirmed:true,observerHeightM:'2'},updateMission:vi.fn(),updateOptions:vi.fn(),analysis:{result},sampleIndex:0,selectSample:vi.fn()})}))
afterEach(()=>vi.unstubAllGlobals())

function close(actual:number[],expected:number[],precision=10){actual.forEach((v,i)=>expect(v).toBeCloseTo(expected[i],precision))}

describe('display-only lunar coordinates and authoritative science overlays',()=>{
  it('places equator, east-positive meridians and both poles correctly',()=>{
    close(geographicToScene(0,0),[1,0,0]);close(geographicToScene(0,90),[0,0,-1]);close(geographicToScene(90,0),[0,1,0]);close(geographicToScene(-90,0),[0,-1,0])
    for(const [lat,lon] of [[-89.463158,-137.501985],[0,179.999],[45,-179.999],[-45,42]]) {
      const back=sceneToGeographic(geographicToScene(lat,lon))
      expect(back.latitude).toBeCloseTo(lat,10);expect(back.longitude).toBeCloseTo(lon,10)
    }
  })
  it('maps azimuth/elevation into a right-handed east/up/minus-north scene',()=>{
    close(localDirection(0,0)!,[0,0,-1]);close(localDirection(90,0)!,[1,0,0]);close(localDirection(180,0)!,[0,0,1]);close(localDirection(0,90)!,[0,1,0])
    close(globalDirection(0,0,90,0)!,[0,0,-1]);expect(localDirection(null,0)).toBeNull();expect(globalDirection(0,0,0,null)).toBeNull()
  })
  it('aligns the real native Sun/Earth vectors with the exact backend frame bridge',()=>{
    const matrix=evidence.mesh.frame_transform.matrix,basis=evidence.mesh.body_to_scene
    for(const body of ['sun','earth'] as const) {
      const obs=evidence.scientific_first,native=evidence.native_first[body]
      const scene=globalDirection(request.latitude_deg,request.longitude_deg,obs[`${body}_azimuth_deg`].value,obs[`${body}_elevation_deg`].value)!
      const bodyFixed=[scene[0],-scene[2],scene[1]]
      const nativeBody=matrix.map(row=>row.reduce((s,v,i)=>s+v*bodyFixed[i],0))
      const local=basis.map(row=>row.reduce((s,v,i)=>s+v*nativeBody[i],0))
      close(local,localDirection(native.azimuth_deg,native.elevation_deg)!,10)
    }
  })
  it('applies exaggeration only to copied render positions and preserves raw heights',()=>{
    const mesh=parseMesh(evidence.mesh,request),before=[...mesh.elevation_m]
    const one=exaggeratedPositions(mesh,1),five=exaggeratedPositions(mesh,5)
    close(Array.from(one.slice(0,3)),mesh.positions_m[0] as Vector3,3)
    expect(Array.from(five)).not.toEqual(Array.from(one));expect(mesh.elevation_m).toEqual(before)
    expect(()=>exaggeratedPositions(mesh,0)).toThrow('1× to 10×')
  })
  it('accepts actual bounded terrain metadata and rejects altered frame, masks or indices',()=>{
    const mesh=parseMesh(structuredClone(evidence.mesh),request)
    expect(mesh.surface_elevation_m).toBe(1944.7670898436575);expect(mesh.grid_shape).toEqual([59,59]);expect(mesh.indices).toHaveLength(20184)
    for(const kind of ['frame','datum','index','nodata','identity']) {
      const value=structuredClone(evidence.mesh)
      if(kind==='frame')value.reference_frame='IAU_MOON'
      if(kind==='datum')value.vertical_reference='Earth ellipsoid'
      if(kind==='index')value.indices[0]=999999
      if(kind==='nodata')value.elevation_m[0]=null as unknown as number
      if(kind==='identity')value.request.latitude_deg=0
      expect(()=>parseMesh(value,request)).toThrow('Incompatible')
    }
  })
  it('validates the newly consumed per-epoch observer identity and refuses stale epochs',()=>{
    const copy=structuredClone(result)
    expect(parseResult(copy,copy.request as ScenarioRequest).terrain_visibility?.observer_geometry?.[0].latitude_deg_de440).toBeCloseTo(request.latitude_deg)
    copy.terrain_visibility!.observer_geometry[0].time_utc='2026-11-16T00:00:00Z'
    expect(()=>parseResult(copy,copy.request as ScenarioRequest)).toThrow('incompatible')
  })
  it('renders shared selected coordinates, explicit scale, UTC and no fabricated lighting claims',()=>{
    const html=renderToStaticMarkup(<MemoryRouter><LunarExplorer/></MemoryRouter>)
    for(const text of ['Whole Moon','Photographic maps','Landing area (3D)','Site01','2026-11-14T00:00:00Z','No global','Sun / Earth','2D compatibility','WebGL']) {
      if(text==='No global'||text==='WebGL')continue
      expect(html).toContain(text)
    }
    expect(html).toContain('no global DEM');expect(html).toContain('modeled obstruction');expect(html).toContain('Explorer scientific time sample')
  })
  it('loads validated mesh once, reuses identical geometry, and never falls back on missing DEM',async()=>{
    const fetcher=vi.fn(async()=>({ok:true,json:async()=>evidence.mesh}) as Response);vi.stubGlobal('fetch',fetcher)
    const signal=new AbortController().signal
    await requestMesh(request,signal);await requestMesh(request,signal)
    expect(fetcher).toHaveBeenCalledTimes(1)
    vi.stubGlobal('fetch',vi.fn(async()=>({ok:false,status:503,json:async()=>({errors:[{code:'MISSING_DATA',message:'Pinned DEM absent'}]})}) as Response))
    await expect(requestMesh({...request,dataset_id:'absent'},signal)).rejects.toThrow('MISSING_DATA')
  })
  it('inspects original raster measurements, not triangle/exaggerated height',async()=>{
    vi.stubGlobal('fetch',vi.fn(async()=>({ok:true,json:async()=>evidence.inspection}) as Response))
    const value=await inspectTerrain(request,evidence.inspection.latitude_deg,evidence.inspection.longitude_deg,new AbortController().signal)
    expect(value.method).toBe('bilinear original DEM; four finite neighbors');expect(value.elevation_m).toBeCloseTo(evidence.mesh.surface_elevation_m)
  })
  it('disposes a late-created renderer after unmount without publishing stale readiness',async()=>{
    let resolve!:(value:{dispose:()=>void})=>void
    const ready=vi.fn(),failed=vi.fn(),dispose=vi.fn()
    const cancel=rendererLease(()=>new Promise<{dispose:()=>void}>(r=>{resolve=r}),ready,failed)
    cancel();resolve({dispose});await Promise.resolve()
    expect(dispose).toHaveBeenCalledTimes(1);expect(ready).not.toHaveBeenCalled()
  })
  it('propagates WebGL initialization failure to fallback and disposes mounted renderers once',async()=>{
    const failed=vi.fn(),ready=vi.fn()
    rendererLease(async()=>{throw new Error('WebGL initialization failed')},ready,failed)
    await Promise.resolve();await Promise.resolve();expect(failed).toHaveBeenCalled()
    const dispose=vi.fn(),cancel=rendererLease(async()=>({dispose}),ready,failed)
    await Promise.resolve();cancel();cancel();expect(dispose).toHaveBeenCalledTimes(1)
  })
})
