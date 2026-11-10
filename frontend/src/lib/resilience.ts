import type { AnalysisOptions, ScenarioRequest } from '../types/analysis'
import type { Opportunity, MissionConstraints } from '../types/resilience'
import type { MissionSelection } from '../types/preview'
export const defaultConstraints: MissionConstraints = { maximum_unmet_load_wh: 0, minimum_soc_pct: 10, require_conservative_pass: true, allow_optimistic_only: false, minimum_earth_clearance_deg: 1, maximum_dte_interruption_s: 3600, minimum_dte_access_s: 3600, required_duration_s: null, allowed_site_ids: [], maximum_distance_m: null }
export const classLabels = { meets_tested_requirements: 'Meets tested requirements', conditionally_promising: 'Conditionally promising · optimistic assumptions', fails_modeled_requirement: 'Fails a modeled requirement', insufficient_evidence: 'Insufficient evidence' }
export function utcInput(value: string) {
  if (!/^\d{4}-\d\d-\d\dT\d\d:\d\d(?::\d\d(?:\.\d{1,3})?)?$/.test(value) || !Number.isFinite(Date.parse(value+'Z'))) throw new Error('Enter a valid UTC date.')
  const result=new Date(value+'Z').toISOString()
  if (result.slice(0,16)!==value.slice(0,16)) throw new Error('Enter a valid UTC calendar date.')
  return result
}
export function comparisonInput(request: ScenarioRequest, originalOptions: AnalysisOptions): {selection: MissionSelection; options: AnalysisOptions} {
  return { selection: { site: {id:request.site.site_id,name:request.site.name,latitude:request.site.latitude_deg,longitude:request.site.longitude_deg,description:'Scientific opportunity; coordinates declared at its landing epoch.'}, startUtc:new Date(request.start_utc).toISOString(),durationHours:(Date.parse(request.end_utc)-Date.parse(request.start_utc))/3600000 }, options:structuredClone(originalOptions) }
}
export function sortOpportunities(rows: Opportunity[], key: string, descending = false) {
  return [...rows].sort((a,b)=>{
    if (!!a.result!==!!b.result) return a.result?-1:1
    const value = (r: Opportunity) => key === 'date' ? Date.parse(r.start_utc) : key === 'shift' ? r.date_shift_s : r.differences[key]?.candidate ?? null
    const x=value(a),y=value(b)
    if (x===null) return y===null?0:1
    if (y===null) return -1
    return (x-y)*(descending?-1:1)
  })
}
