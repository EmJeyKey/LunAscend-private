import {describe,expect,it,vi} from 'vitest'
import {renderToStaticMarkup} from 'react-dom/server'
import {MemoryRouter} from 'react-router'
import report from '../../../docs/validation/step-9-results.json'
import {parseOpportunities,requestOpportunities} from '../api/resilience'
import {comparisonInput,sortOpportunities,utcInput,classLabels} from '../lib/resilience'
import {initialOptions,buildRequest} from '../lib/analysis'
import {initialEngineering} from '../lib/engineering'
import {ComparisonStore} from '../state/ComparisonStore'
import {Resilience} from '../pages/Resilience'
import type {OpportunityRequest} from '../types/resilience'

const request=report.request as OpportunityRequest
const options={...initialOptions,frameConfirmed:true,terrainEnabled:true,powerEnabled:true,communicationEnabled:true,observerHeightM:'2',terrainRadiusM:'2500',terrainAzimuthSamples:'360',terrainRadialStepM:'5',engineering:{...initialEngineering,orientation_mode:'ideal_sun_tracking'}}
const input=comparisonInput(request.baseline,options)
vi.mock('../state/MissionContext',()=>({useMission:()=>({mission:input.selection,options,comparison:{scenarios:[]},comparisonStore:{}})}))
vi.mock('../components/MissionControls',()=>({MissionControls:()=> <p>Existing shared scientific mission controls</p>}))

describe('bounded resilience boundary and workflow',()=>{
  it('accepts the executed NASA-derived multi-site/date search with partial failure',()=>{
    const response=parseOpportunities(structuredClone(report.response),request)
    expect(response.completed).toBe(4);expect(response.failed).toBe(2)
    expect(response.opportunities[1].date_shift_s).toBe(86400)
    expect(response.opportunities[1].differences.sun_initial_elevation.delta).toBeCloseTo(-0.1117311731)
    expect(response.opportunities[4].classification).toBe('insufficient_evidence')
    expect(response.opportunities[4].differences.optimistic_unmet_load_wh.candidate).toBeNull()
  })
  it('preserves hardware, UTC, observer and terrain on transfer and reuses the calculated result',async()=>{
    const row=parseOpportunities(report.response,request).opportunities[1]
    const transferred=comparisonInput(row.request!,options)
    const built=buildRequest(transferred.selection,transferred.options)
    expect(Date.parse(built.start_utc)).toBe(Date.parse(row.start_utc))
    expect(built.site.latitude_deg).toBe(row.request!.site.latitude_deg)
    expect(built.settings.power_options).toEqual(row.request!.settings.power_options)
    expect(built.settings.terrain_options?.coordinate_epoch_utc).toBe(built.start_utc)
    const transport=vi.fn(async()=>row.result!)
    const store=new ComparisonStore([],transport)
    const id=store.addResult(transferred.selection,transferred.options,row.result!)
    expect(id).toBeTruthy()
    await store.run(id!)
    expect(transport).not.toHaveBeenCalled()
    expect(store.getSnapshot().scenarios[0].analysis.result?.scenario_id).toBe(row.result!.scenario_id)
    store.add(transferred.selection,transferred.options);store.add(transferred.selection,transferred.options)
    expect(store.addResult(transferred.selection,transferred.options,row.result!)).toBeNull()
    expect(store.getSnapshot().scenarios).toHaveLength(3)
  })
  it('uses UTC wall time and refuses timezone-free invalid dates',()=>{
    expect(utcInput('2026-11-15T00:00')).toBe('2026-11-15T00:00:00.000Z')
    expect(()=>utcInput('bad')).toThrow()
    expect(()=>utcInput('2026-11-15T00:00Z')).toThrow()
    expect(()=>utcInput('2026-02-30T00:00')).toThrow('calendar date')
  })
  it('places unavailable metrics last in both ascending and descending sorts',()=>{
    const rows=parseOpportunities(report.response,request).opportunities
    for(const descending of [false,true]) {
      const sorted=sortOpportunities(rows,'optimistic_unmet_load_wh',descending)
      expect(sorted.at(-1)?.result).toBeNull()
      expect(sorted[0].result).not.toBeNull()
    }
    expect(sortOpportunities(rows,'date')[0].start_utc).toContain('2026-11-14')
    expect(sortOpportunities(rows,'date',true).at(-1)?.result).toBeNull()
  })
  it.each(['mock','wrong_power','delta','false_pass','unknown_pass','duplicate','date'])('rejects incompatible response %s',kind=>{
    const value=structuredClone(report.response)
    if(kind==='mock') value.baseline.provider_mode='mock'
    if(kind==='wrong_power') value.opportunities[1].request!.settings.power_options!.battery_capacity_wh=100
    if(kind==='delta') value.opportunities[1].differences.sun_initial_elevation.delta=100
    if(kind==='false_pass') value.opportunities[0].classification='meets_tested_requirements'
    if(kind==='unknown_pass') value.opportunities[4].constraints[0].status='pass'
    if(kind==='duplicate') value.opportunities[1].request_id=value.opportunities[0].request_id
    if(kind==='date') value.opportunities[0].start_utc='2025-01-01T00:00:00Z'
    expect(()=>parseOpportunities(value,request)).toThrow(/incompatible/i)
  })
  it('submits scientific requests without a mock fallback and preserves cancellation',async()=>{
    const controller=new AbortController()
    const fetcher=vi.fn(async()=>({ok:true,json:async()=>report.response}) as Response)
    await requestOpportunities(request,controller.signal,fetcher)
    expect(fetcher.mock.calls).toHaveLength(1)
    const failure=vi.fn(async()=>({ok:false,status:503,json:async()=>({errors:[{message:'Missing terrain'}]})}) as Response)
    await expect(requestOpportunities(request,controller.signal,failure)).rejects.toThrow('Missing terrain')
    expect(failure).toHaveBeenCalledTimes(1)
  })
  it('renders compact real controls, explicit requirements, delay choices and unknown warnings',()=>{
    const html=renderToStaticMarkup(<MemoryRouter><Resilience/></MemoryRouter>)
    for(const phrase of ['Original Mission','Existing shared scientific mission controls','Delay by 1 day','Delay by 3 days','Delay by 5 days','Delay by 7 days','Restore original date','Alternative landing UTC','Find another opportunity','Maximum unmet electrical demand','Require conservative','optimistic-only','never guarantee']) expect(html).toContain(phrase)
    expect(html).not.toContain('timestamps only')
    expect(Object.keys(classLabels)).toHaveLength(4)
  })
})
