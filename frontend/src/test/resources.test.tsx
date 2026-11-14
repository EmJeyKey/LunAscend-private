import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { Methodology } from '../pages/Methodology'
import { ExternalSiteResources } from '../components/ExternalSiteResources'
import { HorizonsEvidence, OfficialResources } from '../components/OfficialResources'
import { challengeResources, sourceCatalog, sourceRoles } from '../lib/resources'
import original from '../../../docs/validation/step-3-results.json'

afterEach(() => vi.unstubAllGlobals())
describe('honest offline scientific source disclosures', () => {
  it('renders all four exact official URLs with explicit roles and attribution', () => {
    const html = renderToStaticMarkup(<OfficialResources/>)
    expect(challengeResources).toHaveLength(4)
    for (const source of challengeResources) {
      expect(html).toContain(`href="${source.official_url}"`)
      expect(html).toContain(source.attribution)
      const entry = html.split(`id="source-${source.id}"`)[1].split('</article>')[0]
      for (const role of source.roles) expect(entry).toContain(sourceRoles[role])
      if (source.id !== 'horizons') expect(entry).not.toContain('Used in calculations')
    }
    expect(html).toContain('noopener noreferrer')
    expect(html).toContain('No QuickMap imagery')
    expect(html).toContain('internal 2D map and context globe')
    expect(challengeResources.find(s=>s.id==='moon-trek')!.roles).toEqual(['visualization','reference'])
  })
  it('displays saved counts, residuals, sites and epochs without inventing validation', () => {
    const html = renderToStaticMarkup(<HorizonsEvidence/>)
    expect(sourceCatalog.validation.evaluations).toEqual(original.evaluations)
    expect(sourceCatalog.validation.summary).toEqual(original.summary)
    expect(html).toContain('36 passing'); expect(html).toContain('9 synthetic')
    for (const summary of Object.values(original.summary)) {
      expect(html).toContain(summary.max_absolute_azimuth_difference_deg.toExponential(6))
      expect(html).toContain(summary.max_absolute_elevation_difference_deg.toExponential(6))
    }
    for (const epoch of sourceCatalog.validation.epochs_utc) expect(html).toContain(epoch)
    expect(html).toContain('shared JPL ephemeris heritage')
    expect(html).toContain('not a fresh comparison')
    expect(html).toContain('LOLA terrain obstruction is calculated separately')
  })
  it('keeps the methodology and source metadata readable when all online access fails', () => {
    const fetcher = vi.fn(() => Promise.reject(new Error('Offline')))
    vi.stubGlobal('fetch', fetcher)
    const html = renderToStaticMarkup(<MemoryRouter><Methodology/></MemoryRouter>)
    for (const title of ['Scientific Methodology', 'Official challenge resources', 'Saved Horizons comparison evidence', 'Local computation &amp; terrain provenance']) expect(html).toContain(title)
    const terrain = sourceCatalog.sources.find(source => source.id === 'lola')!
    expect(html).toContain(terrain.product!.sha256)
    expect(html).toContain('5 m source pixel spacing; not effective resolution or accuracy')
    expect(html).toContain('No NASA, JPL, CSA or resource-provider endorsement')
    expect(fetcher).not.toHaveBeenCalled()
    expect(html).not.toMatch(/<iframe|<img|<script/)
  })
  it('shows the current site reference without a guessed coordinate URL or state mutation', () => {
    const html = renderToStaticMarkup(<MemoryRouter><ExternalSiteResources latitude={-89.46315760953222} longitude={-137.50097847854008} epoch="2026-11-14T00:00:00Z"/></MemoryRouter>)
    expect(html).toContain('-89.46315761'); expect(html).toContain('-137.50097848')
    expect(html).toContain('DE440/ME421 at 2026-11-14T00:00:00Z')
    expect(html).toContain('do not transfer coordinates or establish frame alignment')
    expect(html).toContain('Site/time selection stays here')
    expect(html).toContain('href="/methodology#official-resources"')
    expect(html).not.toMatch(/href="https:[^"]*(?:lat=|lon=|SITE_COORD)/)
  })
})
