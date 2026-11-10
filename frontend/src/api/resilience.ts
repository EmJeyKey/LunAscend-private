import { parseResult } from './analysis'
import type { OpportunityRequest, OpportunityResponse } from '../types/resilience'
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v==='object' && !Array.isArray(v)
const number = (v: unknown) => typeof v==='number' && Number.isFinite(v)
const nullable = (v: unknown) => v===null || number(v)
const strings = (v: unknown) => Array.isArray(v) && v.every(x=>typeof x==='string')
export function parseOpportunities(value: unknown, request: OpportunityRequest): OpportunityResponse {
  const invalid = () => new Error('Incompatible resilience response; no opportunities accepted.')
  if (!object(value) || value.model_version!=='mission-resilience-v1' || !Array.isArray(value.opportunities) || value.opportunities.length>12 || !strings(value.limitations) || typeof value.cancelled!=='boolean') throw invalid()
  parseResult(value.baseline,request.baseline)
  for (const key of ['completed','failed','indeterminate','elapsed_s','cache_hits','horizon_reuses']) if (!number(value[key]) || Number(value[key])<0) throw invalid()
  const ids = new Set<string>()
  for (const row of value.opportunities) {
    if (!object(row) || typeof row.request_id!=='string' || ids.has(row.request_id) || !object(row.site) || typeof row.start_utc!=='string' || !Number.isFinite(Date.parse(row.start_utc))
      || !number(row.date_shift_s) || Math.abs(Number(row.date_shift_s)-(Date.parse(row.start_utc)-Date.parse(request.baseline.start_utc))/1000)>.001
      || !nullable(row.distance_from_baseline_m) || !['meets_tested_requirements','conditionally_promising','fails_modeled_requirement','insufficient_evidence'].includes(String(row.classification))
      || !strings(row.errors) || !strings(row.explanations) || !object(row.differences) || !Array.isArray(row.constraints)) throw invalid()
    ids.add(row.request_id)
    const siteId=row.site.site_id
    if (Date.parse(row.start_utc)<Date.parse(request.earliest_utc) || Date.parse(row.start_utc)>Date.parse(request.latest_utc) || ![request.baseline.site,...request.sites].some(s=>s.site_id===siteId)) throw invalid()
    if (row.result!==null) {
      if (!object(row.request) || row.request.provider_mode!=='scientific' || !object(row.request.settings) || Date.parse(String(row.request.start_utc))!==Date.parse(row.start_utc)) throw invalid()
      const r = row.request as unknown as OpportunityRequest['baseline']
      if (JSON.stringify(r.settings.power_options)!==JSON.stringify(request.baseline.settings.power_options) || JSON.stringify(r.settings.communication_options)!==JSON.stringify(request.baseline.settings.communication_options)) throw invalid()
      parseResult(row.result,r)
    }
    for (const c of row.constraints) if (!object(c) || !number(c.threshold) || !nullable(c.actual) || !['pass','fail','indeterminate'].includes(String(c.status)) || c.actual===null && c.status!=='indeterminate' || typeof c.constraint_id!=='string' || typeof c.units!=='string' || typeof c.explanation!=='string' || !strings(c.provenance_ids) || !strings(c.limitations)) throw invalid()
    for (const d of Object.values(row.differences)) if (!object(d) || !nullable(d.baseline) || !nullable(d.candidate) || !nullable(d.delta) || typeof d.units!=='string' || (d.baseline===null || d.candidate===null ? d.delta!==null : d.delta===null || Math.abs(Number(d.delta)-(Number(d.candidate)-Number(d.baseline)))>1e-7)) throw invalid()
    if (row.classification==='meets_tested_requirements' && row.constraints.some(c=>c.status!=='pass')) throw invalid()
  }
  return value as unknown as OpportunityResponse
}
export async function requestOpportunities(request: OpportunityRequest, signal: AbortSignal, fetcher: typeof fetch=fetch): Promise<OpportunityResponse> {
  const base=import.meta.env.VITE_API_BASE_URL || '/backend'
  const response=await fetcher(`${base.replace(/\/$/,'')}/api/v1/resilience/search`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(request),signal:AbortSignal.any([signal,AbortSignal.timeout(600000)])})
  const value: unknown=await response.json()
  if (!response.ok) throw new Error(object(value) && Array.isArray(value.errors)?value.errors.map(e=>object(e)?String(e.message):'Request failed').join(' '):`Resilience request failed (HTTP ${response.status}).`)
  return parseOpportunities(value,request)
}
