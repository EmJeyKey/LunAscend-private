import type {ScenarioResult,TerrainClassification} from '../types/analysis'
import type {AccessClassification,PowerAnalysis} from '../types/engineering'
import type {Opportunity} from '../types/resilience'

export type ConditionState='blocked'|'potential'|'below'|'unknown'|'not_calculated'|'mock'
export interface HumanSample {timeUtc:string;state:ConditionState;label:string;reason:string}
export function analysisProblem(message:string) {
  if(/MISSING_DATA|OUTSIDE_COVERAGE|PROVIDER_UNAVAILABLE/i.test(message)&&/terrain|LOLA|DEM/i.test(message))return 'We do not have enough terrain data to analyze this location.'
  if(/Failed to fetch|Network|ECONNREFUSED|HTTP 50[234]|backend.*unavailable/i.test(message))return 'The scientific analysis service is currently unavailable.'
  if(/MISSING_DATA|PROVIDER_UNAVAILABLE/i.test(message))return 'Required scientific data or software are unavailable.'
  return 'Check the location, date and settings, then retry. No mock values were substituted.'
}
const terrainStates:Record<TerrainClassification,ConditionState>={modeled_obstruction:'blocked',conditional_clearance:'potential',indeterminate:'unknown',unavailable:'unknown'}
const accessStates:Record<AccessClassification,ConditionState>={modeled_obstruction:'blocked',conditional_access:'potential',below_clearance_requirement:'below',indeterminate:'unknown',unavailable:'unknown'}
export function conditionLabel(state:ConditionState,target:'sun'|'earth',access=false) {
  if(state==='mock')return 'Illustrative mock sample — not a lunar prediction'
  if(state==='not_calculated')return 'Terrain visibility not calculated'
  if(state==='unknown')return 'Unknown — insufficient terrain data'
  if(state==='below')return 'Earth does not meet your clearance requirement'
  if(state==='blocked')return `${target==='sun'?'Sun':'Earth'} center blocked by modeled terrain`
  return target==='sun'?'Sun potentially available within modeled coverage':access?'Potential direct Earth access':'Earth potentially visible within modeled coverage'
}
export function conditionSamples(result:ScenarioResult,target:'sun'|'earth'):HumanSample[] {
  const terrain=new Map(result.terrain_visibility?.observations.map(row=>[Date.parse(row.time_utc),row]))
  const access=new Map(result.communication?.access_samples.map(row=>[Date.parse(row.time_utc),row]))
  return (result.observations||[]).map(observation=>{
    const time=Date.parse(observation.time_utc),body=terrain.get(time)?.[target],link=target==='earth'?access.get(time):undefined
    const state:ConditionState=result.provider_mode==='mock'?'mock':link?accessStates[link.classification]:body?terrainStates[body.classification]:result.terrain_visibility||result.request.settings.terrain_enabled?'unknown':'not_calculated'
    return {timeUtc:observation.time_utc,state,label:conditionLabel(state,target,!!link),reason:result.provider_mode==='mock'?'Deterministic demonstration curves; no NASA terrain or ephemeris prediction.':link?'Clearance is an access requirement, not radio signal strength.':body?.reason||'A terrain-aware result is required to judge local obstruction. Geometric elevation alone is insufficient.'}
  })
}
export function powerOutcome(power:PowerAnalysis) {
  return {pass_both:'Both cases meet the configured battery model',pass_optimistic_only:'Only the optimistic case meets the configured battery model',fail_both:'Neither case meets the configured battery model',indeterminate:'Not enough information for a full-mission battery outcome',unavailable:'Power and battery estimates are unavailable'}[power.outcome]
}
export const opportunityLabels={meets_tested_requirements:'Meets tested requirements',conditionally_promising:'Conditionally promising',fails_modeled_requirement:'Fails modeled requirements',insufficient_evidence:'Not enough information'}
export function comparisonExplanation(baseline:ScenarioResult|null,other:ScenarioResult|null):string[] {
  if(!baseline||!other)return ['Run both options to compare calculated results.']
  if(baseline.provider_mode!==other.provider_mode)return ['Mock and scientific results cannot be compared as lunar predictions.']
  if(other.provider_mode==='mock')return ['MOCK / NOT LUNAR PREDICTIONS: these differences are illustrative only.']
  const sameDuration=Date.parse(baseline.request.end_utc)-Date.parse(baseline.request.start_utc)===Date.parse(other.request.end_utc)-Date.parse(other.request.start_utc)
  if(!sameDuration)return ['The mission durations differ; energy totals cover different lengths of time.']
  const texts:string[]=[]
  if(baseline.power&&other.power){
    if(JSON.stringify(baseline.power.configuration)!==JSON.stringify(other.power.configuration))texts.push('Hardware assumptions differ. Review the settings before interpreting energy differences.')
    else {
      const a=baseline.power.cases.find(c=>c.assumption==='optimistic')?.totals.solar_generated_wh,b=other.power.cases.find(c=>c.assumption==='optimistic')?.totals.solar_generated_wh
      if(a!=null&&b!=null)texts.push(b===a?'The optimistic solar-energy estimates are equal.':`This option has a ${Math.abs(b-a).toFixed(2)} Wh ${b>a?'higher':'lower'} optimistic solar-energy estimate than the baseline.`)
      else texts.push('Incomplete environmental data prevent a full-period solar-energy comparison.')
    }
  }
  if(baseline.communication&&other.communication){
    if(baseline.communication.configuration.minimum_earth_clearance_deg!==other.communication.configuration.minimum_earth_clearance_deg)texts.push('Earth-clearance requirements differ between these options.')
    else {
      const a=baseline.communication.longest_interruption_s.value,b=other.communication.longest_interruption_s.value
      if(a!=null&&b!=null&&a!==b)texts.push(`This option has a ${Math.abs(b-a)/3600<.01?(Math.abs(b-a)).toFixed(0)+' s':(Math.abs(b-a)/3600).toFixed(2)+' h'} ${b>a?'longer':'shorter'} sample-supported Earth-access interruption. Unknown intervals are excluded.`)
    }
  }
  if(!other.terrain_visibility)texts.push(other.request.settings.terrain_enabled?'A terrain result is unavailable for this option.':'Terrain obstruction was not calculated for this option.')
  return texts.length?texts:['No supported numerical difference is summarized here. Inspect the available results and their assumptions.']
}
export function opportunityExplanation(row:Opportunity):string[] {
  const messages=[opportunityLabels[row.classification]+'. This describes only the requirements tested, not mission safety.']
  const solar=row.differences.optimistic_solar_generated_wh
  if(solar?.delta!=null)messages.push(`Optimistic solar-energy estimate changes by ${solar.delta.toFixed(2)} ${solar.units} compared with the original plan.`)
  const unmet=row.differences.conservative_unmet_load_wh
  if(unmet?.candidate!=null)messages.push(`The conservative case leaves ${unmet.candidate.toFixed(2)} ${unmet.units} of electrical demand unsupplied.`)
  if(row.constraints.some(c=>c.status==='indeterminate'))messages.push('At least one requirement lacks enough evidence. Unknown results cannot count as a pass.')
  return messages
}
export const glossary=[
  ['Landing site','A selected location on the Moon; an example coordinate is not a surveyed or approved landing site.'],
  ['Latitude and longitude','Angles locating a point north or south of the equator and east or west of a reference meridian; the lunar frame must also be known.'],
  ['Lunar south pole','The region around 90° south, where the Sun often stays low and nearby terrain strongly affects the horizon.'],
  ['Horizon','The modeled boundary between the local sky and surrounding terrain.'],
  ['Terrain elevation','Surface height above the documented lunar reference sphere, measured in meters.'],
  ['Sun elevation','The angle of the Sun’s center above the local level plane; it is not solar intensity or electrical power.'],
  ['Earth elevation','The angle of Earth’s center above the local level plane; it is not radio signal strength.'],
  ['Angular clearance','The angle between an object’s center and the modeled terrain horizon in that direction.'],
  ['Direct-to-Earth','Possible direct access toward Earth; seeing Earth does not establish a working radio link.'],
  ['Solar generation','Electrical power estimated from the environmental model and the chosen panel assumptions, in watts.'],
  ['Battery reserve','Stored energy the configured model keeps below its permitted discharge limit.'],
  ['Conservative assumption','This power case treats conditional sunlight as unavailable.'],
  ['Optimistic assumption','This power case allows conditional Sun-center clearance to supply the configured panels; it does not guarantee survival.'],
  ['Terrain obstruction','The model places an object’s center behind known terrain; unresolved or more distant features remain a limitation.'],
  ['Missing data','Unknown information, never automatically zero, darkness, obstruction or a successful result.'],
  ['UTC','Coordinated Universal Time, used for every mission timestamp instead of the computer’s local clock.'],
] as const
