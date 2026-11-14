import { ArrowUpRight } from 'lucide-react'
import { challengeResources, localSources, sourceCatalog, sourceRoles } from '../lib/resources'

type Source = typeof sourceCatalog.sources[number]
function SourceEntry({ source }: { source: Source }) {
  return <article className="resource-entry" id={`source-${source.id}`}>
    <div className="resource-heading"><h3>{source.name}</h3><div className="resource-roles">{source.roles.map(role => <span key={role}>{sourceRoles[role]}</span>)}</div></div>
    <p className="resource-provider">{source.organization}</p><p>{source.purpose}</p><p><strong>LunAscend use:</strong> {source.use_in_lunascend}</p>
    <a className="resource-external" href={source.official_url} target="_blank" rel="noopener noreferrer">{source.official_url}<ArrowUpRight size={13}/><span className="sr-only"> (external website)</span></a>
    <details><summary>Attribution, data identity & access</summary><dl className="resource-facts">
      <div><dt>Product / release</dt><dd>{source.product_id || 'No product imported'} · {source.version || 'External website; no pinned release'}</dd></div>
      <div><dt>Coordinates</dt><dd>{source.coordinate_system}</dd></div><div><dt>Original resolution</dt><dd>{source.original_resolution || 'Not applicable to the linked resource; no imagery installed'}</dd></div>
      <div><dt>Quantities</dt><dd>{source.quantities.join('; ') || 'Educational background only'}</dd></div>
      <div><dt>Credit</dt><dd>{source.attribution}</dd></div><div><dt>Usage</dt><dd>{source.usage_conditions} <a href={source.terms_url} target="_blank" rel="noopener noreferrer">Provider documentation / terms ↗</a></dd></div>
      <div><dt>Offline access</dt><dd>{source.offline}</dd></div><div><dt>Limits</dt><dd>{source.limitations}</dd></div>
    </dl></details>
  </article>
}

export function OfficialResources() {
  return <section className="panel official-resources" aria-labelledby="official-resources-title" id="official-resources">
    <header className="section-introduction"><h2 id="official-resources-title">Official challenge resources</h2><p>Four resources identified in the challenge brief, with their actual role in LunAscend. Source links open external websites. The Moon explorer uses the verified Moon Trek photographic products; astronomical calculations use local SPICE, not a live Horizons service.</p></header>
    <a className="text-link" href={sourceCatalog.challenge_url} target="_blank" rel="noopener noreferrer">Challenge resource listing ↗</a>
    <div className="resource-grid">{challengeResources.map(source => <SourceEntry key={source.id} source={source}/>)}</div>
    <p className="resource-offline">If an external website is unavailable, continue with the local globe, restored LOLA terrain and saved validation evidence. Site/time selection and numerical analysis do not depend on these links.</p>
  </section>
}

export function LocalScientificSources() {
  const terrain = sourceCatalog.sources.find(source => source.id === 'lola')!
  const spice = sourceCatalog.sources.find(source => source.id === 'spice')!
  return <section className="panel" aria-label="Local scientific source registry"><header className="section-introduction"><h2>Local computation & terrain provenance</h2><p>SPICE computes geometry. The original LOLA DEM supplies terrain heights and the local viewer. Optical imagery is a separate resource.</p></header>
    <div className="resource-grid">{localSources.map(source => <SourceEntry key={source.id} source={source}/>)}</div>
    <details><summary>Pinned products, coordinate registration & checksums</summary>
      {terrain.product && <dl className="resource-facts"><div><dt>LOLA product</dt><dd>{terrain.product.name}</dd></div><div><dt>Source</dt><dd><a href={terrain.product.source_url} target="_blank" rel="noopener noreferrer">Original DEM source ↗</a></dd></div><div><dt>SHA-256</dt><dd>{terrain.product.sha256}</dd></div><div><dt>Native projection</dt><dd>{terrain.product.projection}</dd></div><div><dt>Projected bounds / m</dt><dd>{terrain.product.projected_bounds_m.join(', ')}</dd></div><div><dt>Registration</dt><dd>{terrain.product.pixel_registration}</dd></div><div><dt>Citation</dt><dd>{terrain.product.citation}</dd></div><div><dt>Uncertainty</dt><dd>{terrain.product.uncertainty}</dd></div></dl>}
      <h3>SPICE geometry kernels</h3>{spice.products?.map(product => <p className="resource-product" key={product.filename}><a href={product.url} target="_blank" rel="noopener noreferrer">{product.filename} ↗</a><span>{product.sha256}</span></p>)}
      <h3>Isolated terrain bridge kernels</h3>{spice.bridge_products?.map(product => <p className="resource-product" key={product.filename}><a href={product.url} target="_blank" rel="noopener noreferrer">{product.filename} ↗</a><span>{product.sha256}</span></p>)}
      <p>These metadata come from the existing pinned manifests. A catalog entry does not indicate that a dataset is currently installed or that a selected site is covered.</p>
    </details>
  </section>
}

export function HorizonsEvidence() {
  const evidence = sourceCatalog.validation
  const angle = (value: number) => value.toExponential(6)
  return <section className="panel horizons-evidence" id="horizons-validation" aria-labelledby="horizons-evidence-title">
    <header className="section-introduction"><h2 id="horizons-evidence-title">Saved Horizons comparison evidence</h2><p>{evidence.total_comparisons} passing Sun/Earth angle comparisons · {evidence.case_count} synthetic site/epoch cases · {evidence.reference_response_count} saved reference responses. Report {evidence.report_id}, executed <time>{evidence.executed_at_utc}</time>.</p></header>
    <p>Local SPICE performs the application calculations. Horizons supplies a separate reference service and implementation with shared JPL ephemeris heritage. This is a finite cross-implementation check, not independent observational evidence or a global accuracy claim. LOLA terrain obstruction is calculated separately and is not validated by these angle comparisons.</p>
    <div className="resource-table" tabIndex={0} role="region" aria-label="Horizons residual summary"><table><caption>Saved maximum absolute differences in degrees</caption><thead><tr><th scope="col">Comparison</th><th scope="col">Rows</th><th scope="col">Azimuth / °</th><th scope="col">Elevation / °</th><th scope="col">Predeclared criteria</th></tr></thead><tbody>{Object.entries(evidence.summary).map(([kind, summary]) => <tr key={kind}><th scope="row">{kind === 'geometric' ? 'Public geometric NONE' : 'Diagnostic apparent CN+S'}</th><td>{summary.comparisons}/ {summary.comparisons} pass</td><td>{angle(summary.max_absolute_azimuth_difference_deg)}</td><td>{angle(summary.max_absolute_elevation_difference_deg)}</td><td>{kind === 'geometric' ? '0.0001° per angle' : 'Elevation 0.002°; azimuth 0.002° / max(|cos el|, 0.1)'}</td></tr>)}</tbody></table></div>
    <details><summary>Compared sites, epochs, conventions & assumptions</summary>
      <p>{evidence.frame} · planetocentric latitude · east-positive longitude · {evidence.reference_radius_m.toLocaleString('en-US')} m sphere. Azimuth clockwise from north, elevation above the radial tangent. Sites are synthetic reference observers, not surveyed landing sites.</p>
      <div className="resource-table"><table><caption>Compared observers (degrees and meters)</caption><thead><tr><th>Latitude / ° N</th><th>Longitude / ° E</th><th>Surface height / m</th><th>Observer height / m</th></tr></thead><tbody>{evidence.sites.map(site => <tr key={site.latitude_deg}><td>{site.latitude_deg}</td><td>{site.longitude_deg}</td><td>{site.surface_elevation_m}</td><td>{site.observer_height_m}</td></tr>)}</tbody></table></div>
      <p>Each observer and both bodies were compared at:</p><ul className="mono">{evidence.epochs_utc.map(epoch => <li key={epoch}>{epoch}</li>)}</ul>
      <p>Primary check: Horizons geometric ICRF topocentric vectors (NONE), projected with separate ENU dot products but sharing the NAIF frame rotation. Complementary orientation check: direct Horizons AIRLESS apparent AZ/EL against internal SPICE CN+S. Horizons includes gravitational deflection; the SPICE diagnostic does not. Public app results use NONE. No atmosphere, terrain, disk visibility or RF link is tested here.</p>
      <pre>{evidence.model_headers.join('\n')}</pre><p>Horizons uses DE441 translations in these responses; the local kernels use DE440 and its matched ME421-aligned frame. Agreement does not make the models identical.</p>
      <p>{evidence.identity_checks} Software: {Object.values(evidence.software).join(' · ')}.</p><p className="mono">Kernel fingerprint: {evidence.kernel_fingerprint}</p>
      <p>Exact saved cases with matching engine/software/kernel identity can receive reference_compared metric labels. A different site, epoch or nonzero height remains unvalidated; no selected-site certification follows from this report.</p>
    </details>
    <details><summary>All {evidence.total_comparisons} saved residual rows</summary><div className="resource-table" tabIndex={0} role="region" aria-label="Individual Horizons comparison rows"><table><caption>Original executed residuals; no new calculations</caption><thead><tr><th>Site</th><th>UTC</th><th>Body / method</th><th>SPICE az / el °</th><th>Reference az / el °</th><th>|Δ az| / |Δ el| °</th><th>Allowed az / el °</th><th>Outcome</th></tr></thead><tbody>{evidence.evaluations.map((row, index) => <tr key={index}><td>{row.site_id}</td><td>{row.utc}</td><td>{row.target} / {row.comparison}</td><td>{row.computed_azimuth_deg.toFixed(9)} / {row.computed_elevation_deg.toFixed(9)}</td><td>{row.reference_azimuth_deg.toFixed(9)} / {row.reference_elevation_deg.toFixed(9)}</td><td>{angle(row.azimuth_difference_deg)} / {angle(row.elevation_difference_deg)}</td><td>{angle(row.azimuth_tolerance_deg)} / {angle(row.elevation_tolerance_deg)}</td><td>{row.passed ? 'Pass' : 'Fail'}</td></tr>)}</tbody></table></div></details>
    <p className="resource-reproduction">Offline reproduction: from the restored backend science environment run <code>python -m lunascend.ephemeris.validation compare</code>. Raw references, the predeclared plan and full numerical report are retained in the repository. Displayed values are historical saved results, not a fresh comparison or live network status.</p>
  </section>
}
