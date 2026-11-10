import {describe,expect,it,vi} from 'vitest'
import {renderToStaticMarkup} from 'react-dom/server'
import evidence from '../../../docs/validation/step-8-results.json'
import {parseResult} from '../api/analysis'
import {buildRequest,initialOptions} from '../lib/analysis'
import {initialEngineering} from '../lib/engineering'
import {EngineeringPanel} from '../components/EngineeringPanel'
import {EngineeringComparison} from '../components/EngineeringComparison'
import type {ScenarioRequest} from '../types/analysis'

const request=evidence.result.request as ScenarioRequest
vi.mock('../state/MissionContext',()=>({useMission:()=>({analysis:{result:evidence.result},observation:evidence.result.observations[0],comparison:{scenarios:[{id:'real',name:'Site01',selection:{startUtc:request.start_utc,durationHours:24},options:{sampleStepS:'3600'},analysis:{result:evidence.result}}]}})}))
const mission={site:{id:'site01',name:'Site01',latitude:request.site.latitude_deg,longitude:request.site.longitude_deg,description:'Input location'},startUtc:request.start_utc,durationHours:24}
const options={...initialOptions,frameConfirmed:true,terrainEnabled:true,powerEnabled:true,communicationEnabled:true,observerHeightM:'2',engineering:{...initialEngineering,orientation_mode:'ideal_sun_tracking'}}

describe('engineering request/result and scientific presentation',()=>{
  it('accepts actual SPICE/LOLA engineering outputs with separate assumption cases',()=>{
    const r=parseResult(structuredClone(evidence.result),request)
    expect(r.power?.outcome).toBe('pass_optimistic_only')
    expect(r.power?.cases[0].totals.unmet_load_wh).toBeCloseTo(772.5)
    expect(r.power?.cases[1].totals.solar_generated_wh).toBeCloseTo(14698.8)
    expect(r.communication?.longest_interruption_s.value).toBe(86400)
    expect(r.communication?.link_availability).toBe('not_modeled')
  })
  it('constructs explicit hardware and clearance configuration without changing geometric-only defaults',()=>{
    const r=buildRequest(mission,options)
    expect(r.settings.power_options?.battery_capacity_wh).toBe(500)
    expect(r.settings.power_options?.orientation_mode).toBe('ideal_sun_tracking')
    expect(r.settings.communication_options?.minimum_earth_clearance_deg).toBe(1)
    expect(r.site.surface_elevation_m).toBeNull()
    expect(buildRequest(mission,{...initialOptions,frameConfirmed:true,surfaceElevationM:'0'}).settings.power_enabled).toBe(false)
  })
  it('rejects invalid reserve, missing parameters, zero efficiency and engineering without terrain',()=>{
    expect(()=>buildRequest(mission,{...options,engineering:{...options.engineering,minimum_soc_pct:'101'}})).toThrow('engineering parameter')
    expect(()=>buildRequest(mission,{...options,engineering:{...options.engineering,initial_soc_pct:'0'}})).toThrow('minimum')
    expect(()=>buildRequest(mission,{...options,engineering:{...options.engineering,charging_efficiency:'0'}})).toThrow('engineering parameter')
    expect(()=>buildRequest(mission,{...options,engineering:{...options.engineering,panel_area_m2:''}})).toThrow('engineering parameter')
    expect(()=>buildRequest(mission,{...options,terrainEnabled:false,surfaceElevationM:'0'})).toThrow('Engineering requires')
  })
  it.each(['balance','overcharge','false_pass','hardware','scope','link_budget','false_access','timeline','negative_energy'])('rejects corrupted engineering %s',key=>{
    const r=structuredClone(evidence.result)
    if(key==='balance')r.power.cases[1].totals.final_battery_energy_wh=0
    if(key==='overcharge')r.power.cases[1].samples[1].battery_energy_wh=50000
    if(key==='false_pass')r.power.outcome='pass_both'
    if(key==='hardware')r.power.configuration.baseline_load_w=0
    if(key==='scope')r.request.settings.power_enabled=false
    if(key==='link_budget')Object.assign(r.communication.link_budget_db,{value:100})
    if(key==='false_access')r.communication.access_samples[0].classification='conditional_access'
    if(key==='timeline')r.power.cases[0].samples[1].time_utc=r.power.cases[0].samples[0].time_utc
    if(key==='negative_energy')r.power.cases[0].totals.unmet_load_wh=-10
    expect(()=>parseResult(r,request)).toThrow('incompatible')
  })
  it('does not accept unsolicited engineering products in a terrain-only request',()=>{
    const plain=structuredClone(request)
    plain.settings.power_enabled=false;plain.settings.communication_enabled=false
    expect(()=>parseResult(evidence.result,plain)).toThrow('incompatible')
  })
  it('renders totals, separate battery/SOC plots, deficit and conditional DTE limitations',()=>{
    const html=renderToStaticMarkup(<EngineeringPanel/>)
    expect(html).toContain('Passes only under the optimistic')
    expect(html).toContain('772.50')
    expect(html).toContain('Sampled battery energy / Wh')
    expect(html).toContain('Sampled battery charge / %')
    expect(html).toContain('A below-margin interval is not labeled terrain obstruction')
    expect(html).toContain('not guaranteed bounds')
    expect(html).toContain('Earth center blocked by modeled terrain')
    expect(html).toContain('link-budget analysis is deferred')
  })
  it('shows differing hardware and sampled energy outcomes without ranking scenarios',()=>{
    const html=renderToStaticMarkup(<EngineeringComparison/>)
    expect(html).toContain('Battery 500 Wh')
    expect(html).toContain('14698.80 Wh')
    expect(html).toContain('no universal ranking')
  })
})
