import { Link } from 'react-router'
import { externalMapResources } from '../lib/resources'

export function ExternalSiteResources({ latitude, longitude, epoch }: { latitude: number; longitude: number; epoch: string }) {
  return <details className="external-site-resources"><summary>Compare this location in external lunar maps</summary>
    <p className="mono">Input: {latitude.toFixed(8)}° N / {longitude.toFixed(8)}° E · DE440/ME421 at {epoch}</p>
    <p>Open a map, then locate the site using its documented coordinates and layer metadata. These links open the portal home pages; they do not transfer coordinates or establish frame alignment. Optical imagery is separate from the local LOLA elevation mesh.</p>
    <div className="resource-link-row">{externalMapResources.map(source => <a key={source.id} href={source.official_url} target="_blank" rel="noopener noreferrer">{source.name} ↗ <span>External portal · online</span></a>)}</div>
    <p>If a portal is unavailable, continue in this local viewer. Site/time selection stays here.</p><Link className="text-link" to="/methodology#official-resources">Source roles, attribution & validation →</Link>
  </details>
}
