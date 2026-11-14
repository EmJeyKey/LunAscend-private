import {afterEach,describe,expect,it,vi} from 'vitest'
import {renderToStaticMarkup} from 'react-dom/server'
import {LunarImageMap} from '../components/LunarImageMap'
import {globeLevel,imageLayer,imageResolution,inImageBounds,mapLevel,mapPoint,mapProject,mapScale,mapUnproject,panMap,screenPoint,tileBounds,tileKey,TilePool,visibleTiles,zoomMap,type ImageTile} from '../lib/imagery'
import {geographicToScene} from '../lib/lunarScene'
import {requestImageAnchor} from '../api/imagery'
import projectionChecks from '../../../data/fixtures/imagery/projection-checks.json'

afterEach(()=>vi.unstubAllGlobals())
const global=imageLayer('wac-global'),south=imageLayer('nac-south')
const tile:ImageTile={layer:'wac-global',level:1,row:0,column:0}
const bitmap=()=>({width:256,height:256,close:vi.fn()}) as unknown as ImageBitmap
const response=(type='image/jpeg',ok=true)=>({ok,blob:async()=>new Blob(['actual pixels supplied by decoder fixture'],{type})}) as Response
const settle=()=>new Promise(resolve=>setTimeout(resolve,0))

describe('real lunar tile pyramids and cartographic rendering',()=>{
  it('uses actual published service limits instead of original archive pixel claims',()=>{
    expect(global.levels).toHaveLength(9);expect(south.levels).toHaveLength(12)
    expect(south.levels.at(-1)?.resolution).toBeCloseTo(4.1806411743164,10)
    expect(imageResolution(imageLayer('wac-south'),5)).toContain('267.56')
    expect(imageResolution(global,8)).toContain('83.3 m/px')
    expect(imageResolution(imageLayer('wac-south'),11)).toBe('Source resolution pending')
  })
  it('preserves correct projection, east longitude, pole and known Site01 projected pixel center',()=>{
    expect(mapProject(south,-90,42)).toEqual([0,0])
    const p=mapProject(south,-89.46315760953222,-137.501985) // Source-grid math only, not a frame conversion.
    expect(p[0]).toBeCloseTo(-10997.5,0);expect(p[1]).toBeCloseTo(-12002.5,0)
    for(const [lat,lon] of [[-89.463158,-137.501985],[-70,90],[-85,-179.9],[-60,0]]){
      const xy=mapProject(south,lat,lon),back=mapUnproject(south,...xy)
      expect(back.latitude).toBeCloseTo(lat,10);expect(back.longitude).toBeCloseTo(lon,10)
    }
    expect(mapProject(global,0,270)).toEqual([-90,0])
    expect(mapProject(south,-80,90)[0]).toBeGreaterThan(0)
  })
  it('matches executed PyProj source-projection vectors without claiming a frame registration',()=>{
    for(const row of projectionChecks.rows){
      const point=mapProject(south,row.latitude_deg,row.longitude_deg)
      expect(point[0]).toBeCloseTo(row.x_m,7);expect(point[1]).toBeCloseTo(row.y_m,7)
    }
  })
  it('anchors smooth zoom under the pointer and pans in source units',()=>{
    const view={x:-10,y:-70,resolution:1},point=mapPoint(view,800,500,213,145)
    const zoom=zoomMap(view,800,500,213,145,.7,global)
    expect(mapPoint(zoom,800,500,213,145)).toEqual(point)
    expect(screenPoint(view,800,500,...point)).toEqual([213,145])
    expect(panMap(view,20,-30)).toEqual({x:-30,y:-100,resolution:1})
    expect(zoomMap(view,800,500,0,0,1e-12,global).resolution).toBe(global.levels.at(-1)!.resolution/2)
  })
  it('selects progressive bounded tile levels, identifies Site01 and leaves unsupported NAC coverage empty',()=>{
    const [x,y]=mapProject(south,-89.463158,-137.501985)
    const view={x,y,resolution:4.1806411743164}
    expect(mapLevel(south,view,700,500)).toBe(11)
    expect(visibleTiles(south,11,view,700,500).map(tileKey)).toContain('nac-south/11/1035/1013')
    expect(visibleTiles(south,11,{x:500000,y:500000,resolution:5},700,500)).toEqual([])
    expect(inImageBounds(south,500000,500000)).toBe(false)
    expect(tileBounds({layer:'wac-global',level:0,row:0,column:1})).toEqual([0,-90,180,90])
    expect(globeLevel(1.03,560)).toBeGreaterThan(globeLevel(3.4,560))
    expect(mapScale(south,view).meters).toBeGreaterThan(0)
  })
  it('aligns global image longitudes and poles with existing scene orientation',()=>{
    const point=mapUnproject(global,0,0)
    expect(geographicToScene(point.latitude,point.longitude)).toEqual([1,0,-0])
    const east=geographicToScene(0,90);expect(east[2]).toBeCloseTo(-1)
    expect(geographicToScene(90,0)[1]).toBeCloseTo(1)
  })
  it('provides projection modes, picking qualifications, internal canvas, scale and source attribution',()=>{
    const html=renderToStaticMarkup(<LunarImageMap anchor={{latitude:-89.463158,longitude:-137.501985,qualification:'Explicit test anchor'}} onAdopt={vi.fn()}/>)
    for(const text of ['Global map','South polar imagery','Local site imagery','Fit Moon','Zoom to landing site','<canvas','approximate center scale','NASA','No verified image-to-DEM registration','Acquisition shadows'])expect(html).toContain(text)
  })
})

describe('bounded image ownership, loading and fallbacks',()=>{
  it('loads a tile once, reuses it and closes bitmaps exactly once on disposal',async()=>{
    const image=bitmap(),fetcher=vi.fn(async()=>response()),decode=vi.fn(async()=>image)
    const pool=new TilePool(vi.fn(),fetcher,decode)
    pool.sync([tile]);await settle();pool.sync([tile]);await settle()
    expect(pool.get(tile)).toBe(image);expect(fetcher).toHaveBeenCalledTimes(1)
    pool.dispose();pool.dispose();expect(image.close).toHaveBeenCalledTimes(1)
  })
  it('keeps valid parent images on failure; rejects unsupported formats without decoding',async()=>{
    const image=bitmap(),fetcher=vi.fn(async()=>response()),decode=vi.fn(async()=>image),pool=new TilePool(vi.fn(),fetcher,decode)
    pool.sync([tile]);await settle();fetcher.mockImplementation(async()=>response('text/html'))
    const child={...tile,level:2};pool.sync([tile,child]);await settle()
    expect(pool.get(tile)).toBe(image);expect(pool.get(child)).toBeUndefined();expect(pool.failures).toBe(1);expect(decode).toHaveBeenCalledTimes(1)
    pool.dispose()
  })
  it('bounds decoded LRU memory and disposes evicted textures',async()=>{
    const images:ImageBitmap[]=[],pool=new TilePool(vi.fn(),async()=>response(),async()=>{const image=bitmap();images.push(image);return image},2)
    const keys=[0,1,2].map(column=>({...tile,column}))
    for(const key of keys){pool.sync([key]);await settle()}
    expect(images).toHaveLength(3);expect(images[0].close).toHaveBeenCalledTimes(1);expect(pool.get(keys[0])).toBeUndefined()
    pool.dispose();expect(images.every(i=>vi.mocked(i.close).mock.calls.length===1)).toBe(true)
  })
  it('cancels obsolete transports and closes late decoded images after disposal',async()=>{
    let resolve!:(image:ImageBitmap)=>void
    const signals:AbortSignal[]=[],image=bitmap(),pool=new TilePool(vi.fn(),async(_url,init)=>{signals.push(init!.signal as AbortSignal);return response()},()=>new Promise(r=>{resolve=r}))
    pool.sync([tile]);await settle();pool.sync([]);expect(signals[0].aborted).toBe(true)
    pool.dispose();resolve(image);await settle();expect(image.close).toHaveBeenCalledTimes(1)
  })
  it('limits active requests to four and refuses silent substitution on network failure',async()=>{
    let active=0,max=0;const resolvers:Array<()=>void>=[]
    const pool=new TilePool(vi.fn(),()=>new Promise((_resolve,reject)=>{active++;max=Math.max(max,active);resolvers.push(()=>{active--;reject(new Error('offline'))})}))
    pool.sync(Array.from({length:8},(_,column)=>({...tile,level:3,column})))
    expect(max).toBe(4);resolvers.splice(0).forEach(r=>r());await settle();expect(max).toBe(4)
    pool.dispose();resolvers.splice(0).forEach(r=>r());await settle();expect(pool.get(tile)).toBeUndefined()
  })
  it('validates exact native anchors and refuses a falsely registered response',async()=>{
    vi.stubGlobal('fetch',vi.fn(async()=>({ok:true,json:async()=>({latitude_deg:-89.463158,longitude_deg:-137.501985,reference_frame:'MOON_ME_DE421',registration_verified:false,request:{latitude_deg:-89,longitude_deg:-137,coordinate_epoch_utc:'2026-11-14T00:00:00Z'},frame_transform:{source_frame:'MOON_ME_DE440_ME421',destination_frame:'MOON_ME_DE421',epoch_utc:'2026-11-14T00:00:00Z'}})})))
    const anchor=await requestImageAnchor(-89,-137,'2026-11-14T00:00:00Z',new AbortController().signal)
    expect(anchor.qualification).toContain('unverified')
    vi.stubGlobal('fetch',vi.fn(async()=>({ok:true,json:async()=>({latitude_deg:-89,longitude_deg:-137,reference_frame:'MOON_ME_DE421',registration_verified:true})})))
    await expect(requestImageAnchor(-89,-137,'2026-11-14T00:00:00Z',new AbortController().signal)).rejects.toThrow('Incompatible')
  })
})
