import type { ScenarioResult } from '../types/analysis'
export type Body = 'sun' | 'earth'
export interface GeometrySummary { start: number | null; min: number | null; max: number | null; aboveFraction: number | null; coverage: number; samples: number }

// Display statistics over provider observations, not new ephemeris/visibility calculations.
// Integrate a linear elevation segment only when BOTH adjacent samples are known.
// The fraction denominator is covered time, not unknown portions of the interval.
export function summarize(result: ScenarioResult, body: Body): GeometrySummary {
  const rows = result.observations || []
  const key = `${body}_elevation_deg` as const
  const values = rows.flatMap(row => row[key].value === null ? [] : [row[key].value!])
  let covered = 0, above = 0
  for (let i = 1; i < rows.length; i++) {
    const a = rows[i - 1][key].value, b = rows[i][key].value
    const dt = Date.parse(rows[i].time_utc) - Date.parse(rows[i - 1].time_utc)
    if (a === null || b === null || dt <= 0) continue
    covered += dt
    const fraction = a > 0 && b > 0 ? 1 : a <= 0 && b <= 0 ? 0 : a > 0 ? a / (a - b) : b / (b - a)
    above += dt * fraction
  }
  const span = Date.parse(result.request.end_utc) - Date.parse(result.request.start_utc)
  return { start: rows.length && Date.parse(rows[0].time_utc) === Date.parse(result.request.start_utc) ? rows[0][key].value : null,
    min: values.length ? Math.min(...values) : null, max: values.length ? Math.max(...values) : null,
    aboveFraction: covered > 0 ? above / covered : null, coverage: span > 0 ? covered / span : 0, samples: values.length }
}
export const difference = (value: number | null, baseline: number | null) => value === null || baseline === null ? null : value - baseline
export const degrees = (value: number | null, signed = false) => value === null ? 'Unavailable' : `${signed && value >= 0 ? '+' : ''}${value.toFixed(2)}°`
export const percent = (value: number | null) => value === null ? 'Unavailable' : `${Math.round(value * 100)}%`
export function differencesAllowed(a: ScenarioResult, b: ScenarioResult) {
  return a.provider_mode === b.provider_mode && a.model_version === b.model_version
    && a.observations?.[0]?.reference_frame === b.observations?.[0]?.reference_frame
    && JSON.stringify(a.request.site.coordinate_reference) === JSON.stringify(b.request.site.coordinate_reference)
}
export function timeAtElapsed(result: ScenarioResult, hours: number) { return Date.parse(result.request.start_utc) + hours * 3600000 }
export function nearestSample(result: ScenarioResult, hours: number) {
  const target = timeAtElapsed(result, hours), rows = result.observations || []
  if (target < Date.parse(result.request.start_utc) || target > Date.parse(result.request.end_utc) || !rows.length) return null
  return rows.reduce((best, row, i) => Math.abs(Date.parse(row.time_utc) - target) < Math.abs(Date.parse(rows[best].time_utc) - target) ? i : best, 0)
}
