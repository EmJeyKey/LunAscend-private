import {describe,expect,it,vi,afterEach} from 'vitest'
import {renderToStaticMarkup} from 'react-dom/server'
import evidence from '../../../docs/validation/step-10-results.json'
import original from '../../../docs/validation/step-9-results.json'
import {matchingTerrain,surfaceBearing,surfacePose,localDirection} from '../lib/lunarScene'
import {parseMesh,parseLocalHorizon,requestLocalHorizon} from '../api/visualization'
import {LunarHorizon,horizonSegments} from '../components/LunarHorizon'
import type {MeshRequest} from '../types/visualization'
import type {ScenarioResult,TerrainHorizon} from '../types/analysis'
const mesh=parseMesh(evidence.mesh,evidence.mesh.request as MeshRequest)
const saved=original.response.baseline as unknown as ScenarioResult
const horizon=saved.horizon!
const settings={max_search_radius_m:2500,radial_step_m:5,azimuth_samples:360}
const response=()=>({request:{dataset_id:mesh.request.dataset_id,reference_frame:'MOON_ME_DE421',latitude_deg:mesh.native_latitude_deg,longitude_deg:mesh.native_longitude_deg,observer_height_m:2,...settings},horizon,provenance:saved.provenance})
afterEach(()=>vi.unstubAllGlobals())
describe('DEM observer, native horizon and scientific direction integrity',()=>{
  it('uses original DEM plus observer height once, including after all cardinal camera rotations',()=>{
    for(const azimuth of [0,90,180,270,360,720,-90]) {
      const bearing=surfaceBearing(azimuth,0),pose=surfacePose(mesh,bearing)
      expect(pose.eye).toEqual([0,2,0])
      expect(pose.target.map((v,i)=>v-pose.eye[i])).toEqual(localDirection(bearing.azimuth,0))
      // Recover body radius through the exact returned proper rotation.
      const body=mesh.body_origin_m.map((v,i)=>v+mesh.body_to_scene.reduce((s,row,j)=>s+row[i]*pose.eye[j],0))
      expect(Math.hypot(...body)-1737400-mesh.surface_elevation_m).toBeCloseTo(2,8)
    }
    expect(surfaceBearing(360,95)).toEqual({azimuth:0,elevation:89})
    expect(surfaceBearing(-90,-95)).toEqual({azimuth:270,elevation:-89})
    expect(()=>surfacePose({...mesh,request:{...mesh.request,observer_height_m:0}},{azimuth:0,elevation:0})).toThrow('positive observer height')
  })
  it('requires matching native site, actual observer height, dataset and source hash before local sky overlays',()=>{
    expect(matchingTerrain(saved,mesh)).toBe(true)
    for(const changed of [{...mesh,native_longitude_deg:0},{...mesh,source_sha256:'0'.repeat(64)},{...mesh,request:{...mesh.request,observer_height_m:0}}])expect(matchingTerrain(saved,changed)).toBe(false)
    expect(matchingTerrain({...saved,provider_mode:'mock'},mesh)).toBe(false)
  })
  it('preserves the saved Site01 Sun-above / Earth-below modeled horizon at the reference UTC',()=>{
    const row=saved.terrain_visibility!.observations[0]
    expect(row.time_utc).toBe('2026-11-14T00:00:00Z')
    expect(row.sun.classification).toBe('conditional_clearance');expect(row.earth.classification).toBe('modeled_obstruction')
    expect(row.sun.horizon_elevation_deg).toBeCloseTo(-4.612548,5);expect(row.sun.clearance_deg).toBeCloseTo(6.114151,5)
    expect(row.earth.horizon_elevation_deg).toBeCloseTo(.980374,5);expect(row.earth.clearance_deg).toBeCloseTo(-6.016613,5)
  })
  it('does not bridge nodata; partial lower bounds remain dashed, including the circular seam',()=>{
    const h={...horizon,azimuth_deg:[0,90,180,270],elevation_deg:[1,null,3,4],ray_coverage:['sampled_radius','nodata','boundary','sampled_radius'],azimuth_step_deg:90} as TerrainHorizon
    const segments=horizonSegments(h)
    expect(segments).toEqual([{a:180,b:3,next:270,c:4,partial:true},{a:270,b:4,next:360,c:1,partial:false}])
    const html=renderToStaticMarkup(<LunarHorizon horizon={h} row={null} azimuth={90}/>)
    expect(html).toContain('hatching: incomplete sectors');expect(html).toContain('horizon Unknown')
    expect(renderToStaticMarkup(<LunarHorizon horizon={null} row={null} azimuth={0}/>)).toContain('no flat horizon is substituted')
  })
  it('accepts only the requested native frame, finite workload and original DEM provenance',()=>{
    expect(parseLocalHorizon(response(),mesh,settings)).toBe(horizon)
    const badFrame={...response(),horizon:{...horizon,reference_frame:'MOON_ME_DE440_ME421'}}
    expect(()=>parseLocalHorizon(badFrame,mesh,settings)).toThrow('Incompatible')
    expect(()=>parseLocalHorizon({...response(),provenance:[]},mesh,settings)).toThrow('Incompatible')
    expect(()=>parseLocalHorizon({...response(),horizon:{...horizon,elevation_deg:[NaN]}},mesh,settings)).toThrow('Incompatible')
  })
  it('requests the existing native horizon engine and leaves missing-data failures explicit',async()=>{
    const fetcher=vi.fn(async(_url:string,_init?:RequestInit)=>({ok:true,json:async()=>response()}) as Response);vi.stubGlobal('fetch',fetcher)
    await requestLocalHorizon(mesh,settings,new AbortController().signal)
    const request=JSON.parse(String(fetcher.mock.calls[0][1]?.body))
    expect(request.reference_frame).toBe('MOON_ME_DE421');expect(request.latitude_deg).toBe(mesh.native_latitude_deg);expect(request.observer_height_m).toBe(2)
    vi.stubGlobal('fetch',vi.fn(async()=>({ok:false,status:503,json:async()=>({errors:[{code:'MISSING_DATA',message:'DEM absent'}]})}) as Response))
    await expect(requestLocalHorizon(mesh,settings,new AbortController().signal)).rejects.toThrow('MISSING_DATA')
  })
})
