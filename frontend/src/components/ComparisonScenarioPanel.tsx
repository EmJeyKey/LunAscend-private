import { EngineeringOptions } from './EngineeringOptions'
import type { FormEvent } from 'react'
import { Link } from 'react-router'
import { useMission } from '../state/MissionContext'
import type { ComparisonScenario } from '../state/ComparisonStore'
import type { AnalysisOptions, ProviderMode } from '../types/analysis'
import { TerrainOptions } from './TerrainOptions'
import { previewSites } from '../data/preview'
import { toUtc, formatCoordinate } from '../lib/time'
import { ResultProvenance } from './AnalysisProvenance'
import { StatusBadge } from './ui'

export function ComparisonScenarioPanel({ scenario }: { scenario: ComparisonScenario }) {
  const { comparison, comparisonStore: store, inspectScenario } = useMission()
  const { id, selection, options, analysis } = scenario
  const editSelection = (patch: Partial<typeof selection>) => store.edit(id, { selection: { ...selection, ...patch } })
  const editOptions = (patch: Partial<AnalysisOptions>) => store.edit(id, { options: { ...options, ...patch } })
  const editSite = (patch: Partial<typeof selection.site>) => editSelection({ site: { ...selection.site, ...patch } })
  const setUtc = (value: string) => editSelection({ startUtc: toUtc(value) || '' })
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const utc = toUtc(String(new FormData(event.currentTarget).get('comparison_utc') || ''))
    store.edit(id, { selection: { ...store.getSnapshot().scenarios.find(s => s.id === id)!.selection, startUtc: utc || '' } })
    void store.run(id)
  }
  const numberValue = (value: number) => Number.isNaN(value) ? '' : value
  return <article className="comparison-scenario" aria-label={`Scenario ${scenario.name || id}`}>
    <div className="comparison-scenario-heading"><label className="baseline-choice"><input type="radio" name="baseline-scenario" aria-label={`Use ${scenario.name || id} as baseline`} checked={comparison.baselineId === id} onChange={() => store.setBaseline(id)}/>Baseline</label><StatusBadge tone={options.providerMode === 'mock' ? 'gold' : 'cyan'}>{options.providerMode === 'mock' ? 'MOCK' : 'SPICE'} · {analysis.status}</StatusBadge></div>
    <form onSubmit={submit} onInvalid={event => { const details = (event.target as HTMLElement).closest('details'); if (details) details.open = true }}>
      <label>Scenario name<input aria-label={`Scenario name ${id}`} value={scenario.name} maxLength={100} required onChange={event => store.edit(id, { name: event.target.value })}/></label>
      <label>Landing site<select aria-label={`Landing site ${id}`} value={selection.site.id} onChange={event => { const site = previewSites.find(s => s.id === event.target.value); editSelection({ site: site || { ...selection.site, id: 'custom' } }) }}>{previewSites.map(site => <option key={site.id} value={site.id}>{site.name}</option>)}<option value="custom">Custom coordinates</option></select></label>
      <p className="comparison-coordinate">{Number.isFinite(selection.site.latitude) ? formatCoordinate(selection.site.latitude, true) : 'Latitude required'} / {Number.isFinite(selection.site.longitude) ? formatCoordinate(selection.site.longitude, false) : 'Longitude required'}</p>
      <label>Landing time / UTC<input name="comparison_utc" aria-label={`Landing UTC ${id}`} type="datetime-local" step="0.001" required defaultValue={selection.startUtc.replace(/Z$/, '')} onInput={event => setUtc(event.currentTarget.value)} onBlur={event => setUtc(event.currentTarget.value)}/></label>
      <div className="comparison-fields"><label>Duration / hours<input aria-label={`Duration hours ${id}`} type="number" min="0.000001" max="8784" step="any" required value={numberValue(selection.durationHours)} onChange={event => editSelection({ durationHours: event.target.value === '' ? NaN : Number(event.target.value) })}/></label><label>Sample step / s<input aria-label={`Sample step seconds ${id}`} type="number" min="0.001" step="any" required value={options.sampleStepS} onChange={event => editOptions({ sampleStepS: event.target.value })}/></label></div>
      <label>Data provider<select aria-label={`Data provider ${id}`} value={options.providerMode} onChange={event => editOptions({ providerMode: event.target.value as ProviderMode, terrainEnabled: event.target.value === 'scientific' && options.terrainEnabled, powerEnabled: event.target.value === 'scientific' && options.powerEnabled, communicationEnabled: event.target.value === 'scientific' && options.communicationEnabled })}><option value="scientific">Scientific SPICE</option><option value="mock">Mock Demonstration</option></select></label>
      {options.providerMode === 'mock' && <p className="mock-warning">MOCK DATA — NOT LUNAR PREDICTIONS</p>}
      <details className="comparison-settings"><summary>Location, terrain & power settings</summary>
        <label>Site name<input aria-label={`Site name ${id}`} required maxLength={500} value={selection.site.name} onChange={event => editSite({ name: event.target.value })}/></label>
        <div className="comparison-fields"><label>Latitude / ° N<input aria-label={`Latitude ${id}`} type="number" min="-90" max="90" step="any" required value={numberValue(selection.site.latitude)} onChange={event => editSite({ id: 'custom', latitude: event.target.value === '' ? NaN : Number(event.target.value) })}/></label><label>Longitude / ° E<input aria-label={`Longitude ${id}`} type="number" min="-180" max="179.999999999" step="any" required value={numberValue(selection.site.longitude)} onChange={event => editSite({ id: 'custom', longitude: event.target.value === '' ? NaN : Number(event.target.value) })}/></label></div>
        <label>Surface elevation / m above sphere<input aria-label={`Surface elevation meters ${id}`} type="number" step="any" value={options.surfaceElevationM} disabled={options.terrainEnabled} required={options.providerMode === 'scientific' && !options.terrainEnabled} placeholder="Explicit elevation required for SPICE" onChange={event => editOptions({ surfaceElevationM: event.target.value })}/></label>
        <TerrainOptions options={options} onChange={value => store.edit(id, { options: value })}/><EngineeringOptions options={options} onChange={value => store.edit(id, { options: value })}/><label>Observer height / m<input aria-label={`Observer height meters ${id}`} type="number" min="0" step="any" required value={options.observerHeightM} onChange={event => editOptions({ observerHeightM: event.target.value })}/></label>
        <p>Planetocentric latitude · east-positive longitude. Preview sites are synthetic, not surveyed.</p>
        {options.providerMode === 'scientific' ? <><p className="frame-note">MOON_ME_DE440_ME421 · DE440/ME421 · sphere radius 1,737,400 m. {options.terrainEnabled ? 'Per-epoch DE421 conversion; height from DEM plus observer.' : 'No coordinate conversion.'}</p><label className="frame-confirm"><input aria-label={`Confirm coordinate reference ${id}`} type="checkbox" checked={options.frameConfirmed} required onChange={event => editOptions({ frameConfirmed: event.target.checked })}/>I confirm the frame and height convention (DEM-derived when terrain is enabled).</label></> : <p>Mock coordinates use synthetic conventions. Heights are not modeled.</p>}
      </details>
      <div className="comparison-actions"><button className="button primary" type="submit" disabled={analysis.status === 'loading'}>{analysis.status === 'loading' ? 'Calculating…' : analysis.status === 'error' ? 'Retry analysis' : analysis.status === 'success' ? 'Reuse result' : 'Run scenario'}</button><button className="button secondary" type="button" disabled={comparison.scenarios.length >= 3} onClick={() => store.duplicate(id)}>Duplicate</button><button className="button secondary" type="button" onClick={() => store.remove(id)}>Remove</button></div>
    </form>
    <p className={analysis.status === 'error' ? 'analysis-error' : 'form-feedback'} role={analysis.status === 'error' ? 'alert' : 'status'}>{analysis.message || (analysis.result ? `${analysis.result.observations?.length || 0} returned samples · ${analysis.result.status}` : analysis.status === 'loading' ? 'Requesting selected provider…' : 'Configure inputs and run this scenario.')}</p>
    {analysis.result && <><Link className="text-link" to="/analysis" onClick={() => inspectScenario(id)}>Open detailed analysis →</Link><Link className="text-link" to="/sites" onClick={() => inspectScenario(id)}>Open 3D terrain explorer →</Link><details className="comparison-provenance"><summary>Scenario provenance & assumptions</summary><ResultProvenance result={analysis.result}/></details></>}
  </article>
}
