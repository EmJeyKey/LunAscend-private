import { useMission } from '../state/MissionContext'
import { PanelHeader } from './ui'
import type { TerrainClassification } from '../types/analysis'

export const terrainLabels: Record<TerrainClassification, string> = {
  modeled_obstruction: 'Modeled obstruction', conditional_clearance: 'Clear within modeled terrain',
  indeterminate: 'Indeterminate', unavailable: 'Unavailable',
}
export const terrainAngle = (value: number | null) => value === null ? 'Unavailable' : `${value >= 0 ? '+' : ''}${value.toFixed(3)}°`
const utc = (value: string) => value.replace('T', ' ').replace(/\.\d+(?=Z)/, '').replace('Z', ' UTC')

export function TerrainVisibilityPanel() {
  const { analysis, sampleIndex, selectSample } = useMission()
  const result = analysis.result, terrain = result?.terrain_visibility
  if (!terrain) return <section className="panel terrain-visibility"><PanelHeader title="Terrain-aware visibility"/><p>Enable NASA LOLA terrain in the scientific analysis settings. Results require a supported Site01 location and the local DEM/frame kernels. Geometric-only and mock analyses remain available.</p><p>No terrain visibility or operational windows are inferred from the geometric elevation curves.</p></section>
  const row = terrain.observations[Math.min(sampleIndex, terrain.observations.length - 1)]
  return <section className="panel terrain-visibility" aria-label="Terrain-aware center visibility"><PanelHeader title="Terrain-aware visibility" detail="CENTER MODEL · UNVALIDATED"/>
    <p>{terrain.dataset_id} · radius <span className="font-mono">{terrain.max_search_radius_m} m</span> · azimuth step <span className="font-mono">{terrain.azimuth_step_deg}°</span> · radial step <span className="font-mono">{terrain.radial_step_m} m</span></p>
    <p>DEM height <span className="font-mono">{terrain.surface_elevation_m.toFixed(3)} m</span> + observer <span className="font-mono">{terrain.observer_height_m} m</span> above terrain. Horizon and body directions below use MOON_ME_DE421. The original elevation curves remain above.</p>
    <p className="terrain-limitation">Conditional clearance applies only to the evaluated finite terrain. Farther terrain, narrow features, DEM uncertainty and the body’s disk remain unresolved. No globally confirmed visibility, power or radio-link claim.</p>
    {row && <><time className="terrain-utc">{utc(row.time_utc)}</time><div className="terrain-readouts">{(['sun', 'earth'] as const).map(body => {
      const value = row[body]
      return <article key={body} className={`terrain-body ${body}`}><h3>{body === 'sun' ? 'Sun center' : 'Earth center'}</h3><p className={`terrain-status ${value.classification}`}>{terrainLabels[value.classification]}</p><dl><div><dt>Azimuth</dt><dd>{terrainAngle(value.azimuth_deg)}</dd></div><div><dt>Elevation</dt><dd>{terrainAngle(value.elevation_deg)}</dd></div><div><dt>Terrain horizon</dt><dd>{terrainAngle(value.horizon_elevation_deg)}</dd></div><div><dt>Angular clearance</dt><dd>{terrainAngle(value.clearance_deg)}</dd></div><div><dt>Ray coverage</dt><dd>{value.coverage.replaceAll('_', ' ')}</dd></div></dl><p>{value.reason}</p></article>
    })}</div></>}
    <h3>Sampled UTC visibility timeline</h3><p>Each row is a returned sample. Selecting a time synchronizes the existing chart cursor; classifications do not certify conditions between samples.</p>
    <div className="terrain-table-scroll"><table className="terrain-table"><thead><tr><th>UTC sample</th><th>Sun center</th><th>Earth center</th></tr></thead><tbody>{terrain.observations.map((item, index) => <tr key={item.time_utc} aria-current={index === sampleIndex ? 'time' : undefined}><th scope="row"><button type="button" onClick={() => selectSample(index)} aria-label={`Inspect terrain sample ${item.time_utc}`}>{utc(item.time_utc)}</button></th><td className={`terrain-status ${item.sun.classification}`}>{terrainLabels[item.sun.classification]}</td><td className={`terrain-status ${item.earth.classification}`}>{terrainLabels[item.earth.classification]}</td></tr>)}</tbody></table></div>
    <h3>Approximate operational intervals</h3><p>Sample-supported intervals and piecewise-linear transitions carry the input time-grid resolution. Unknown intervals are never counted as clear. Period-edge censoring does not establish an actual rise or set.</p>
    <div className="terrain-table-scroll"><table className="terrain-table"><thead><tr><th>Target / modeled state</th><th>Start / UTC</th><th>End / UTC</th><th>Resolution / s</th></tr></thead><tbody>{result.visibility_windows?.map((w, index) => <tr key={index}><th scope="row">{w.target} · {terrainLabels[w.classification]}</th><td>{utc(w.start_utc)}{w.start_censored ? ' · period edge' : ''}</td><td>{utc(w.end_utc)}{w.end_censored ? ' · period edge' : ''}</td><td>{w.resolution_s} · {w.method.replaceAll('_', ' ')}</td></tr>)}</tbody></table></div>
    <details><summary>Transition estimates ({terrain.transitions.length})</summary>{terrain.transitions.length ? terrain.transitions.map((t, i) => <p key={i}>{t.target}: approximately {utc(t.estimate_utc)} · bracket {utc(t.bracket_start_utc)} – {utc(t.bracket_end_utc)} · {t.resolution_s} s sampling. Linear clearance estimate, not second-level accuracy.</p>) : <p>No supported transition detected on the sampled grid. This does not rule out crossings between samples.</p>}</details>
  </section>
}
