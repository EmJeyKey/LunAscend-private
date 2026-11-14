import {describe,expect,it} from 'vitest'
import {apolloCatalog,surfaceFacing} from '../lib/apollo'
import {geographicToScene,sceneToGeographic} from '../lib/lunarScene'
import {Matrix4,Vector3} from 'three'
describe('Apollo context coordinates and spherical picking',()=>{
  it('preserves all six NASA LM coordinates and excludes Apollo 13',()=>{
    expect(apolloCatalog.sites.map(s=>[s.latitude,s.longitude])).toEqual([[.67416,23.47314],[-3.0128,-23.4219],[-3.64589,-17.47194],[26.13239,3.6333],[-8.9734,15.5011],[20.1911,30.7723]])
    expect(apolloCatalog.sites.some(s=>s.id==='apollo-13')).toBe(false)
  })
  it('recovers local lunar coordinates after world rotation',()=>{
    const rotation=new Matrix4().makeRotationY(.7)
    for(const site of apolloCatalog.sites){
      const local=new Vector3(...geographicToScene(site.latitude,site.longitude))
      const world=local.clone().applyMatrix4(rotation)
      const point=sceneToGeographic(world.applyMatrix4(rotation.clone().invert()).toArray())
      expect(point.latitude).toBeCloseTo(site.latitude,10);expect(point.longitude).toBeCloseTo(site.longitude,10)
    }
  })
  it('handles poles, dateline and far-side occlusion',()=>{
    for(const lat of [-90,0,90])for(const lon of [-180,-179.9,0,179.9]){
      const point=sceneToGeographic(geographicToScene(lat,lon));expect(point.latitude).toBeCloseTo(lat,10)
      expect(point.longitude).toBeGreaterThanOrEqual(-180);expect(point.longitude).toBeLessThan(180)
    }
    expect(surfaceFacing([1,0,0],[3,0,0])).toBe(true)
    expect(surfaceFacing([-1,0,0],[3,0,0])).toBe(false)
    expect(surfaceFacing([0,1,0],[3,0,0])).toBe(false)
  })
})
