import type { AnalysisOptions } from '../types/analysis'

export function TerrainOptions({ options, onChange }: { options: AnalysisOptions; onChange: (options: AnalysisOptions) => void }) {
  const enabled = !!options.terrainEnabled
  return <fieldset className="terrain-options"><legend>Terrain-aware center visibility</legend>
    <label className="terrain-toggle"><input type="checkbox" checked={enabled} disabled={options.providerMode !== 'scientific'} onChange={event => onChange({ ...options, terrainEnabled: event.target.checked, powerEnabled: event.target.checked && options.powerEnabled, communicationEnabled: event.target.checked && options.communicationEnabled })}/>{options.terrainDatasetId?'Use selected NASA LOLA terrain':'Use NASA LOLA Site01 terrain'}</label>
    {enabled && <><p>DE440 coordinates are anchored at the analysis start, then held fixed in DEM-native DE421. Surface height comes from the DEM; observer height is added once. Selected dataset: {options.terrainDatasetId||'lola-site01-5m-v2020'}. Coverage is finite.</p>
      <div className="analysis-input-grid">
        <label>Search radius / m<input type="number" aria-label="Terrain search radius in meters" min="1" max="50000" step="any" required value={options.terrainRadiusM ?? '2500'} onChange={event => onChange({ ...options, terrainRadiusM: event.target.value })}/></label>
        <label>Azimuth rays<input type="number" aria-label="Terrain azimuth rays" min="4" max="720" step="1" required value={options.terrainAzimuthSamples ?? '360'} onChange={event => onChange({ ...options, terrainAzimuthSamples: event.target.value })}/></label>
        <label>Radial step / m<input type="number" aria-label="Terrain radial step in meters" min="1" max="5" step="any" required value={options.terrainRadialStepM ?? '5'} onChange={event => onChange({ ...options, terrainRadialStepM: event.target.value })}/></label>
      </div><p>Center targets only. Finite terrain coverage, unresolved features and approximate time sampling prevent globally confirmed visibility. Maximum 1001 time samples. Missing terrain produces an explicit error.</p></>}
  </fieldset>
}
