import { degrees, difference, differencesAllowed, percent, summarize, type GeometrySummary } from '../lib/comparison'
import type { ComparisonScenario } from '../state/ComparisonStore'

const metrics: { key: keyof Pick<GeometrySummary, 'start' | 'min' | 'max' | 'aboveFraction'>; label: string }[] = [
  { key: 'start', label: 'Starting elevation / deg' }, { key: 'min', label: 'Minimum sampled elevation / deg' },
  { key: 'max', label: 'Maximum sampled elevation / deg' }, { key: 'aboveFraction', label: 'Estimated time above 0° / covered intervals' },
]
export function ComparisonMetrics({ scenarios, baselineId }: { scenarios: ComparisonScenario[]; baselineId: string }) {
  const baseline = scenarios.find(s => s.id === baselineId)?.analysis.result
  const summaries = new Map(scenarios.map(s => [s.id, s.analysis.result ? { sun: summarize(s.analysis.result, 'sun'), earth: summarize(s.analysis.result, 'earth') } : null]))
  return <section className="panel comparison-metrics"><header className="section-introduction"><h2>Geometric conditions & baseline differences</h2><p>Differences are alternative minus baseline; a positive change is not a feasibility recommendation. Minima and maxima are sampled, not continuous extrema.</p></header>
    <div className="comparison-table-scroll" tabIndex={0} role="region" aria-label="Scrollable scenario metrics"><table><thead><tr><th scope="col">Geometric metric</th>{scenarios.map((s, i) => <th scope="col" key={s.id}>{i + 1} / {s.name || 'Unnamed'}{s.id === baselineId ? ' · Baseline' : ''}<small>{s.options.providerMode === 'mock' ? 'MOCK / NOT LUNAR PREDICTIONS' : 'SPICE'}</small></th>)}</tr></thead><tbody>{(['sun', 'earth'] as const).flatMap(body => [...metrics.map(({ key, label }) => <tr key={`${body}-${key}`}><th scope="row" className={`${body}-text`}>{body === 'sun' ? 'Sun' : 'Earth'} · {label}</th>{scenarios.map(s => {
      const result = s.analysis.result, summary = summaries.get(s.id)?.[body]
      const value = summary?.[key] ?? null
      const reference = summaries.get(baselineId)?.[body]
      const comparable = result && baseline && differencesAllowed(result, baseline)
      const fractionComparable = comparable && summary?.coverage === 1 && reference?.coverage === 1 && s.selection.durationHours === (Date.parse(baseline.request.end_utc) - Date.parse(baseline.request.start_utc)) / 3600000 && result.request.sample_step_s === baseline.request.sample_step_s
      const delta = comparable && (key !== 'aboveFraction' || fractionComparable) ? difference(value, reference?.[key] ?? null) : null
      return <td key={s.id}><span>{key === 'aboveFraction' ? percent(value) : degrees(value)}</span>{s.id !== baselineId && <small>{delta === null ? 'Δ unavailable' : key === 'aboveFraction' ? `Δ ${delta >= 0 ? '+' : ''}${Math.round(delta * 100)} percentage points` : `Δ ${degrees(delta, true)}`}</small>}</td>
    })}</tr>), <tr key={`${body}-coverage`}><th scope="row">{body === 'sun' ? 'Sun' : 'Earth'} · known interval coverage</th>{scenarios.map(s => <td key={s.id}>{s.analysis.result ? percent(summarize(s.analysis.result, body).coverage) : 'Unavailable'}</td>)}</tr>])}</tbody></table></div>
    <details className="comparison-method"><summary>Estimation method and comparison limits</summary><p>Above-horizon fractions integrate piecewise-linear elevation between adjacent known samples, splitting a segment at its estimated 0° crossing. The denominator is covered interval time only. Missing pairs and unsampled start/end portions are excluded and shown in coverage; 0° itself is not above the horizon. Fractions are rounded to whole percentages and are not exact durations. UTC civil timestamp differences are used; the scientific provider rejects leap-second crossings.</p><p>Differences are withheld across providers, model versions or coordinate references. Fraction differences also require complete coverage and equal duration and sample step. Different sampling intervals can hide extrema or crossings. All derived summaries inherit the source limitations; finite reference comparisons do not validate these interpolated estimates.</p></details>
  </section>
}
