import catalog from '../data/sourceCatalog.json'

// Generated from the central registry and pinned evidence. No online source is
// fetched on render, and these descriptions never replace result provenance.
export const sourceCatalog = catalog
export const sourceRoles: Record<string, string> = {
  calculation: 'Used in calculations', validation: 'Used for validation',
  visualization: 'Used for visualization', reference: 'Reference only',
}
export const challengeResources = catalog.sources.filter(source => source.challenge_resource)
export const localSources = catalog.sources.filter(source => !source.challenge_resource)
export const externalMapResources = catalog.sources.filter(source => ['quickmap', 'moon-trek'].includes(source.id))
