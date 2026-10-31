import type { ScenarioResult } from '../types/analysis'
import { useMission } from '../state/MissionContext'

export function ResultProvenance({ result }: { result: ScenarioResult }) {
  return <section className="panel provenance-panel" aria-label="Scientific data provenance">
    <h2>Data source & assumptions</h2>
    <p className="section-explanation">Inspect where these observations came from, how they were produced and the limits of their validation.</p>
    <p className={result.provider_mode === 'mock' ? 'mock-warning' : 'source-indicator'}>{result.provider_mode === 'mock' ? 'MOCK DATA — NOT LUNAR PREDICTIONS' : 'SPICE EPHEMERIS · geometric Sun/Earth center directions'}</p>
    <p>Scenario {result.status} · model {result.model_version}. Source identity does not establish global accuracy. Validation labels apply only to the documented scope.</p>
    <ul>{result.warnings.map((warning, index) => <li key={index}>{warning}</li>)}</ul>
    <details><summary>Provenance records ({result.provenance.length})</summary>{result.provenance.map(source => <article key={source.id}>
      <h3>{source.provider_name} · {source.data_source}</h3><dl><div><dt>Version</dt><dd>{source.source_version || 'Unavailable'}</dd></div><div><dt>Method</dt><dd>{source.calculation_method}</dd></div><div><dt>Reference frame</dt><dd>{source.reference_frame || 'Unavailable'}</dd></div><div><dt>Validation scope</dt><dd>{source.validation_status}{source.validation_report_id ? ` · ${source.validation_report_id}` : ''}</dd></div>{source.sha256 && <div><dt>SHA-256</dt><dd>{source.sha256}</dd></div>}</dl>
      {source.source_url && /^https:\/\/naif\.jpl\.nasa\.gov\//.test(source.source_url) && <a href={source.source_url} target="_blank" rel="noreferrer">Official kernel source</a>}
      <ul>{source.assumptions.map((assumption, i) => <li key={i}>{assumption}</li>)}</ul>
    </article>)}</details>
  </section>
}
export function AnalysisProvenance() {
  const { analysis } = useMission()
  return analysis.result ? <ResultProvenance result={analysis.result}/> : null
}
