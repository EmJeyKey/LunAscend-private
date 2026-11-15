import {describe,it,expect} from 'vitest'
import evidence from '../../../docs/validation/step-13-results.json'
import {parseAssessment} from '../api/assessment'
const row=evidence.examples[0]
const sources=row.first_geometry.provenance_ids.map(id=>({id})) as Parameters<typeof parseAssessment>[1]
// Interpretation includes terrain/engineering provenance as well as geometric sources.
const allSources=[...new Set(row.assessment.interpretations.flatMap(i=>i.provenance_ids))].map(id=>({id})) as typeof sources

describe('scientific assessment presentation boundary',()=>{
 it('accepts real executed failure and geometry-only missing evidence',()=>{
  expect(parseAssessment(row.assessment,allSources).classification).toBe('does_not_meet_requirements')
  const apollo=evidence.examples[2];expect(parseAssessment(apollo.assessment,apollo.first_geometry.provenance_ids.map(id=>({id})) as typeof sources).classification).toBe('insufficient_data')
 })
 it.each(['false_pass','unknown_zero','source','nonfinite','missing'])('rejects incompatible %s',kind=>{
  const value=structuredClone(row.assessment)
  if(kind==='false_pass')value.classification='meets_all_evaluated_mandatory_requirements'
  if(kind==='unknown_zero'){value.constraints[0].actual=null;value.constraints[0].status='pass'}
  if(kind==='source')value.interpretations[0].provenance_ids=['invented-source']
  if(kind==='nonfinite')value.constraints[0].actual=Infinity
  if(kind==='missing')value.model_version='unknown' as typeof value.model_version
  expect(()=>parseAssessment(value,allSources)).toThrow('Incompatible')
 })
})
