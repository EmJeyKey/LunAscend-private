import {describe,it,expect} from 'vitest'
import evidence from '../../../docs/validation/sun-earth-audit.json'
import {parseResult} from '../api/analysis'
import {conditionSamples} from '../lib/humanize'
import type {ScenarioRequest} from '../types/analysis'

describe('fresh five-location API results reach frontend scientific states',()=>{
  it.each(evidence.locations)('$location',({response,request})=>{
    const result=parseResult(response,request as ScenarioRequest)
    expect(result.observations).toHaveLength(25)
    for(const target of ['sun','earth'] as const){
      expect(result.availability?.[`${target}_geometry`].code).toBe('geometric_only')
      const displayed=conditionSamples(result,target)
      expect(displayed).toHaveLength(25)
      expect(displayed[0].timeUtc).toBe(result.observations![0].time_utc)
      if(result.terrain_visibility){
        const classification=result.terrain_visibility.observations[0][target].classification
        expect(displayed[0].state).toBe(classification==='modeled_obstruction'?'blocked':classification==='conditional_clearance'?'potential':'unknown')
        expect(result.availability?.[`${target}_terrain_visibility`].code).toBe('terrain_qualified')
      }else{
        expect(displayed[0].state).toBe('not_calculated')
        expect(displayed[0].label).toContain('geometric horizon')
        expect(displayed[0].label).toContain('terrain visibility not requested')
      }
    }
  })
})
