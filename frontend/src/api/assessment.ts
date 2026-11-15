import type {Opportunity} from '../types/resilience'
import type {ScenarioResult} from '../types/analysis'
export interface Assessment {model_version:'mission-assessment-v1';classification:string;constraints:Opportunity['constraints'];interpretations:{topic:string;meaning:string;finding:string;consequence:string;next_action:string;limitation:string;provenance_ids:string[]}[];limitations:string[]}
export const assessmentLabels:Record<string,string>={analysis_not_run:'ANALYSIS NOT RUN',does_not_meet_requirements:'DOES NOT MEET REQUIREMENTS',insufficient_data:'INSUFFICIENT DATA',conditional:'CONDITIONAL',meets_all_evaluated_mandatory_requirements:'MEETS ALL EVALUATED MANDATORY REQUIREMENTS'}
const object=(v:unknown):v is Record<string,unknown>=>typeof v==='object'&&v!==null&&!Array.isArray(v)
const strings=(v:unknown):v is string[]=>Array.isArray(v)&&v.every(x=>typeof x==='string')
export function parseAssessment(v:unknown,sources:ScenarioResult['provenance']):Assessment {
 const invalid=()=>new Error('Incompatible assessment response; no conclusion accepted.')
 const ids=new Set(sources.map(p=>p.id))
 const references=(x:unknown)=>strings(x)&&x.every(id=>ids.has(id))
 if(!object(v)||v.model_version!=='mission-assessment-v1'||typeof v.classification!=='string'||!Object.hasOwn(assessmentLabels,v.classification)||!Array.isArray(v.constraints)||!Array.isArray(v.interpretations)||!strings(v.limitations))throw invalid()
 for(const row of v.constraints){if(!object(row)||typeof row.constraint_id!=='string'||typeof row.threshold!=='number'||!Number.isFinite(row.threshold)||row.actual!==null&&(typeof row.actual!=='number'||!Number.isFinite(row.actual))||!['pass','fail','indeterminate'].includes(String(row.status))||typeof row.units!=='string'||typeof row.explanation!=='string'||!references(row.provenance_ids)||!strings(row.limitations)||row.actual===null&&row.status!=='indeterminate')throw invalid()}
 for(const item of v.interpretations){if(!object(item)||!['topic','meaning','finding','consequence','next_action','limitation'].every(key=>typeof item[key]==='string')||!references(item.provenance_ids))throw invalid()}
 const rows=v.constraints as Opportunity['constraints']
 if(rows.some(row=>row.status==='fail')&&v.classification!=='does_not_meet_requirements'||v.classification==='does_not_meet_requirements'&&!rows.some(row=>row.status==='fail')||['conditional','meets_all_evaluated_mandatory_requirements'].includes(v.classification)&&(!rows.length||rows.some(row=>row.status!=='pass')))throw invalid()
 return v as unknown as Assessment
}
