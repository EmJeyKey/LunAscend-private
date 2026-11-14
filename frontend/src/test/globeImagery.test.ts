import {afterEach,describe,expect,it,vi} from 'vitest'
import * as THREE from 'three'
const fixtures=vi.hoisted(()=>({images:new Map<string,unknown>(),wanted:[] as Array<{layer:string;level:number;row:number;column:number}>,dispose:vi.fn()}))
vi.mock('../lib/imagery',async()=>{
  const actual=await vi.importActual<typeof import('../lib/imagery')>('../lib/imagery')
  return {...actual,TilePool:class {failures=0;get(tile:import('../lib/imagery').ImageTile){return fixtures.images.get(actual.tileKey(tile))}sync(tiles:import('../lib/imagery').ImageTile[]){fixtures.wanted=tiles}dispose(){fixtures.dispose()}}}
})
import {GlobeImagery} from '../visualization/GlobeImagery'
import {geographicToScene} from '../lib/lunarScene'
afterEach(()=>{vi.unstubAllGlobals();fixtures.images.clear();vi.clearAllMocks()})

describe('actual globe tile placement, LOD and texture lifecycle (no GPU)',()=>{
  const setup=()=>{
    vi.stubGlobal('document',{createElement:()=>({width:0,height:0,getContext:()=>({drawImage:vi.fn(),fillRect:vi.fn()})})})
    const status=vi.fn(),redraw=vi.fn(),globe=new GlobeImagery(redraw,status)
    return {globe,status,redraw}
  }
  it('places the real global western tile correctly and owns/disposes GPU resources',()=>{
    const {globe}=setup();fixtures.images.set('wac-global/0/0/0',{})
    globe.update(new THREE.Vector3(3.4,0,0),560)
    const mesh=globe.group.children[0] as THREE.Mesh<THREE.BufferGeometry,THREE.MeshBasicMaterial>
    expect(mesh).toBeDefined();const uv=mesh.geometry.getAttribute('uv'),position=mesh.geometry.getAttribute('position')
    expect(uv.getX(0)).toBe(0);expect(uv.getY(0)).toBe(1);expect(position.getY(0)).toBeCloseTo(1.0005)
    // Western tile's southeast equatorial endpoint is longitude 0, not east 180.
    const endpoint=8*17+16;expect(position.getX(endpoint)).toBeCloseTo(1.0005);expect(position.getZ(endpoint)).toBeCloseTo(0)
    const dispose=vi.spyOn(mesh.material.map!,'dispose'),geometry=vi.spyOn(mesh.geometry,'dispose')
    globe.dispose();globe.dispose();expect(dispose).toHaveBeenCalledTimes(1);expect(geometry).toHaveBeenCalledTimes(1);expect(fixtures.dispose).toHaveBeenCalledTimes(1)
  })
  it('changes genuine source levels, selects the polar products and stops transports outside globe mode',()=>{
    const {globe,status}=setup(),site=new THREE.Vector3(...geographicToScene(-89.463158,-137.501985,3.4))
    globe.update(site,560);expect(status.mock.calls.at(-1)![0].layer).toContain('WAC global')
    globe.update(site.clone().normalize().multiplyScalar(1.4),560);expect(status.mock.calls.at(-1)![0].layer).toContain('WAC south')
    globe.update(site.clone().normalize().multiplyScalar(1.03),560);expect(status.mock.calls.at(-1)![0].layer).toContain('NAC south')
    expect(fixtures.wanted.some(t=>t.layer==='nac-south'&&t.level>0)).toBe(true)
    expect(fixtures.wanted.length).toBeLessThanOrEqual(48)
    globe.update(site,560,false);expect(fixtures.wanted).toEqual([]);globe.dispose()
  })
  it('retains loaded context while replacement tiles are missing and never invents a texture',()=>{
    const {globe,status}=setup();fixtures.images.set('wac-global/0/0/0',{})
    globe.update(new THREE.Vector3(3.4,0,0),560);expect(globe.group.children).toHaveLength(1)
    globe.update(new THREE.Vector3(1.01,0,0),560)
    expect(globe.group.children).toHaveLength(1);expect(status.mock.calls.at(-1)![0].ready).toBe(0)
    globe.dispose()
  })
})
