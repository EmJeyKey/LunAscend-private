import {describe,expect,it} from 'vitest'
import {renderToStaticMarkup} from 'react-dom/server'
import evidence from '../../../docs/validation/step-8-results.json'
import geometry from '../../../docs/validation/step-3-example-result.json'
import {AnalysisFailure,AnalysisRunner,parseResult,type AnalysisState} from '../api/analysis'
import {buildRequest,initialOptions} from '../lib/analysis'
import {fullAnalysisOptions,initialEngineering} from '../lib/engineering'
import {analysisProblem} from '../lib/humanize'
import {EngineeringNumbers,NumericValue,NumericalResults,productReason} from '../components/NumericalResults'
import {ScenarioCard} from '../components/ui'
import {ComparisonStore} from '../state/ComparisonStore'
import type {AnalysisError,ScenarioRequest} from '../types/analysis'

const request=evidence.result.request as ScenarioRequest
const actual=()=>parseResult(structuredClone(evidence.result),request)
const mission={site:{id:request.site.site_id,name:request.site.name,latitude:request.site.latitude_deg,longitude:request.site.longitude_deg,description:''},startUtc:request.start_utc,durationHours:24}
const options={...initialOptions,frameConfirmed:true,observerHeightM:'2',terrainEnabled:true,powerEnabled:true,communicationEnabled:true,engineering:{...initialEngineering,orientation_mode:'ideal_sun_tracking'}}

describe('returned numerical data remain visible and traceable',()=>{
  it('shows the exact selected UTC geometry, native terrain, DEM, height and DTE fields without changing the result',()=>{
    const result=actual(),before=JSON.stringify(result),index=4,time=result.observations![index].time_utc
    const html=renderToStaticMarkup(<NumericalResults result={result} index={index}/>)
    const observation=result.observations![index],terrain=result.terrain_visibility!.observations[index]
    for(const body of ['sun','earth'] as const){
      for(const angle of ['azimuth','elevation'] as const)expect(html).toContain(`data-result-field="observations.${time}.${body}_${angle}_deg.value" data-raw-value="${observation[`${body}_${angle}_deg`].value}"`)
      for(const key of ['horizon_elevation_deg','clearance_deg'] as const)expect(html).toContain(`data-result-field="terrain_visibility.observations.${time}.${body}.${key}" data-raw-value="${terrain[body][key]}"`)
    }
    expect(html).toContain('data-raw-value="1944.7670898436575"');expect(html).toContain('data-result-field="terrain_visibility.observer_height_m" data-raw-value="2"')
    expect(html).toContain('25 observations');expect(html).toContain('MOON_ME_DE440_ME421');expect(html).toContain('DE421')
    expect(html).toContain('86400.000 s');expect(html).toContain('0.000 s');expect(html).toContain('Radio signal strength is not calculated')
    expect(JSON.stringify(result)).toBe(before)
  })
  it('maps selected W, Wh, load and state of charge, and full-period totals for both returned cases',()=>{
    const result=actual(),time=result.observations![4].time_utc,html=renderToStaticMarkup(<EngineeringNumbers power={result.power!} time={time}/>)
    for(const c of result.power!.cases){
      const s=c.samples[4]
      for(const key of ['solar_generation_w','load_w','battery_energy_wh','soc_pct'] as const)expect(html).toContain(`data-result-field="power.cases.${c.assumption}.samples.${time}.${key}" data-raw-value="${s[key]}"`)
      for(const key of ['solar_generated_wh','electrical_demand_wh','minimum_battery_energy_wh','minimum_soc_pct','final_battery_energy_wh','unmet_load_wh'] as const)expect(html).toContain(`data-result-field="power.cases.${c.assumption}.totals.${key}" data-raw-value="${c.totals[key]}"`)
    }
    for(const text of ['14698.80 Wh','1200.00 Wh','772.50 Wh','50.00 W','10.00 %'])expect(html).toContain(text)
  })
  it('uses timestamp matching rather than array position for terrain and power; no neighboring sample substitutes for a missing UTC',()=>{
    const result=actual(),time=result.observations![4].time_utc,clearance=result.terrain_visibility!.observations[4].sun.clearance_deg
    result.terrain_visibility!.observations.reverse()
    expect(renderToStaticMarkup(<NumericalResults result={result} index={4}/>)).toContain(`data-raw-value="${clearance}"`)
    result.terrain_visibility!.observations=result.terrain_visibility!.observations.filter(r=>r.time_utc!==time)
    expect(renderToStaticMarkup(<NumericalResults result={result} index={4}/>)).toContain('No matching UTC terrain sample')
    const html=renderToStaticMarkup(<EngineeringNumbers power={result.power!} time="2026-11-14T04:30:00Z"/>)
    expect(html).toContain('No matching UTC sample returned');expect(html).not.toContain('612.45 W')
  })
  it('keeps a genuine zero distinct from missing and explicitly explains products that were not requested',()=>{
    expect(renderToStaticMarkup(<NumericValue value={0} field="test" unit="W"/>)).toContain('0.000 W')
    const missing=renderToStaticMarkup(<NumericValue value={null} field="test" unit="W"/>)
    expect(missing).toContain('Unavailable — insufficient data');expect(missing).not.toContain('0.000 W')
    const result=parseResult(structuredClone(geometry),geometry.request as ScenarioRequest)
    const html=renderToStaticMarkup(<NumericalResults result={result}/>)
    for(const p of ['terrain','power','communication'] as const)expect(productReason(result,p)).toContain('was not requested')
    expect(html).toContain('not a DEM measurement');expect(html).toContain('solar-panel and battery settings')
    result.request.settings.power_enabled=true
    expect(productReason(result,'power')).toContain('was requested, but no result is available')
  })
  it('replaces unconditional dashboard placeholders with actual scenario results, retaining honest unrun states',()=>{
    const result=actual(),html=renderToStaticMarkup(<ScenarioCard selection={mission} label="Site01" analysis={{status:'success',result,message:''}}/>)
    expect(html).toContain(result.observations![0].sun_elevation_deg.value!.toFixed(3)+'°')
    expect(html).toContain('25 samples');expect(html).not.toContain('— h');expect(html).not.toContain('results unavailable')
    expect(renderToStaticMarkup(<ScenarioCard selection={mission} label="Site01"/>)).toContain('Run this scenario in Comparison')
  })
})

describe('explicit full analysis and failure distinctions',()=>{
  it('enables all existing products without changing the user hardware, site, time or confirmation',()=>{
    const input={...initialOptions,observerHeightM:'2',engineering:{...initialEngineering,baseline_load_w:'75'}},before=JSON.stringify(input),full=fullAnalysisOptions(input)
    expect(full).toMatchObject({terrainEnabled:true,powerEnabled:true,communicationEnabled:true,frameConfirmed:false,providerMode:'scientific'})
    expect(JSON.stringify(input)).toBe(before)
    expect(()=>buildRequest(mission,full)).toThrow(/confirmation/)
    const r=buildRequest(mission,{...full,frameConfirmed:true})
    expect(r.settings.power_options?.baseline_load_w).toBe(75);expect(r.settings.communication_options?.minimum_earth_clearance_deg).toBe(1)
    expect(r.start_utc).toBe(new Date(mission.startUtc).toISOString());expect(r.site.latitude_deg).toBe(mission.site.latitude)
    expect(()=>fullAnalysisOptions({...input,providerMode:'mock'})).toThrow(/Scientific SPICE/)
  })
  it('separates backend offline, missing data, outside coverage, incompatible response and invalid input',()=>{
    expect(analysisProblem('Cannot reach the backend, the connection was interrupted')).toContain('service is currently unavailable')
    expect(analysisProblem('MISSING_DATA: Pinned terrain data is missing')).toContain('required local dataset is missing')
    expect(analysisProblem('OUTSIDE_COVERAGE: Observer has no valid four-pixel DEM interpolation support.')).toContain('outside the supported DEM coverage')
    expect(analysisProblem('The backend returned an incompatible analysis response.')).toContain('frontend could not accept')
    expect(analysisProblem('Invalid duration')).toContain('Check the location, date and settings')
  })
  it('retains structured API failure codes through frontend state',async()=>{
    const errors:AnalysisError[]=[{code:'OUTSIDE_COVERAGE',message:'No DEM support.',module:'terrain',field:null,recoverable:true,details:{}}],states:AnalysisState[]=[]
    const runner=new AnalysisRunner(s=>states.push(s),async()=>{throw new AnalysisFailure('No DEM support.',errors)})
    await runner.run(request)
    expect(states.at(-1)?.errors).toEqual(errors);expect(analysisProblem(states.at(-1)!.message,states.at(-1)!.errors)).toContain('outside the supported DEM coverage')
  })
  it('transfers a validated current result to comparison with its exact request and no transport or empty copy',()=>{
    const result=actual(),store=new ComparisonStore([]),id=store.addResult(mission,options,result,'Current Site01 result')
    const saved=store.getSnapshot().scenarios.find(s=>s.id===id)!
    expect(saved.analysis.status).toBe('success');expect(saved.analysis.result?.power).toEqual(result.power)
    expect(saved.name).toBe('Current Site01 result');expect(saved.selection.startUtc).toBe(mission.startUtc)
    const incompatible=actual();incompatible.request.site.latitude_deg=0
    expect(()=>new ComparisonStore([]).addResult(mission,options,incompatible)).toThrow(/incompatible/)
  })
})
