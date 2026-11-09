import { useMission } from '../state/MissionContext'
import { terrainLabels, terrainAngle } from './TerrainVisibilityPanel'

export function TerrainComparison() {
  const { comparison } = useMission()
  if (!comparison.scenarios.some(s => s.analysis.result?.terrain_visibility)) return null
  return <section className="panel terrain-visibility"><h2>Terrain model comparison</h2><p>Independent sampled estimates at each scenario’s own UTC epoch. Dataset, coverage, height, radius and sampling may differ; no terrain duration or clearance deltas are asserted across these configurations.</p>
    <div className="terrain-table-scroll"><table className="terrain-table"><thead><tr><th>Scenario / terrain configuration</th><th>Target / first UTC sample</th><th>Starting center clearance</th><th>Approximate interval totals / hours</th></tr></thead><tbody>{comparison.scenarios.flatMap(s => {
      const r = s.analysis.result, t = r?.terrain_visibility
      if (!t) return [<tr key={s.id}><th>{s.name}</th><td colSpan={3}>Terrain results unavailable or not requested.</td></tr>]
      return (['sun', 'earth'] as const).map(body => {
        const initial = t.observations[0]
        const totals = (label: string) => (r?.visibility_windows || []).filter(w => w.target === body && w.classification === label).reduce((sum, w) => sum + w.duration_s, 0) / 3600
        return <tr key={`${s.id}-${body}`}><th>{s.name}<p>{t.dataset_id} · radius {t.max_search_radius_m} m · observer {t.observer_height_m} m · Δaz {t.azimuth_step_deg}° · Δr {t.radial_step_m} m</p><p>Partial rays: {r?.horizon?.ray_coverage.filter(c => c !== 'sampled_radius').length} / {r?.horizon?.azimuth_deg.length}. All horizons globally partial.</p></th><td>{body} · {initial?.time_utc}</td><td>{initial ? terrainAngle(initial[body].clearance_deg) : 'Unavailable'}<p>{initial ? terrainLabels[initial[body].classification] : 'Unavailable'}</p></td><td>Conditional clear ≈ {totals('conditional_clearance').toFixed(2)} h<br/>Modeled obstruction ≈ {totals('modeled_obstruction').toFixed(2)} h<br/>Indeterminate / unavailable ≈ {(totals('indeterminate') + totals('unavailable')).toFixed(2)} h</td></tr>
      })
    })}</tbody></table></div>
  </section>
}
