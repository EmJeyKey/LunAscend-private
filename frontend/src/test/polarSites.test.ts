import {afterEach,describe,expect,it,vi} from 'vitest'
import {loadPolarSites,resolveCatalogEpoch} from '../lib/apollo'
import {buildRequest,initialOptions} from '../lib/analysis'
import registry from '../../../data/manifests/polar-sites/registry.json'

afterEach(()=>vi.unstubAllGlobals())
describe('Polar catalog and terrain selection',()=>{
  const epoch='2026-11-15T00:00:00Z'
  const mission={site:{id:'pgda-site04',name:'Shackleton Rim',latitude:-89.7,longitude:-171.8,description:'Registry test selection'},startUtc:epoch,durationHours:24}
  it('preserves thirteen source-derived representative points',()=>{
    expect(registry.sites).toHaveLength(13)
    expect(new Set(registry.sites.map(s=>s.id)).size).toBe(13)
    expect(registry.sites.every(s=>s.reference_frame==='MOON_ME_DE421'&&s.point_kind.includes('not a landing-site'))).toBe(true)
  })
  it('uses the selected terrain identity and refuses stale-epoch coordinates',()=>{
    const options={...initialOptions,frameConfirmed:true,terrainEnabled:true,terrainDatasetId:'pgda-site04-5m-window-v1',coordinateEpochUtc:epoch,terrainRadiusM:'100'}
    expect(buildRequest(mission,options).settings.terrain_options?.dataset_id).toBe('pgda-site04-5m-window-v1')
    expect(()=>buildRequest({...mission,startUtc:'2026-11-16T00:00:00Z'},options)).toThrow('mission date changed')
  })
  it('validates transformed coordinates and retains genuine zero quality values',async()=>{
    const sites=registry.sites.map(s=>({...s,context_latitude:s.latitude,context_longitude:s.longitude,quality:{return_count:{value:0,source_url:s.source_url}}}))
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:true,json:async()=>({context_frame:'MOON_ME_DE440_ME421',coordinate_epoch_utc:epoch,sites})}))
    const result=await loadPolarSites(epoch,new AbortController().signal)
    expect(result[0].quality?.return_count.value).toBe(0)
    sites[0].context_latitude=NaN
    await expect(loadPolarSites(epoch,new AbortController().signal)).rejects.toThrow('Invalid polar')
  })
  it('reconciles the same native site when its epoch changes',async()=>{
    const sites=registry.sites.map(s=>({...s,context_latitude:s.latitude!+.00001,context_longitude:s.longitude!+.00002}))
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:true,json:async()=>({context_frame:'MOON_ME_DE440_ME421',coordinate_epoch_utc:epoch,sites})}))
    const resolved=await resolveCatalogEpoch(mission,{...initialOptions,coordinateEpochUtc:'2026-11-14T00:00:00Z'},new AbortController().signal)
    expect(resolved.selection.site.id).toBe('pgda-site04')
    expect(resolved.selection.site.latitude).toBe(sites[1].context_latitude)
    expect(resolved.options.coordinateEpochUtc).toBe(epoch)
  })
})
