import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { PositionPending } from '../components/ui'
import type { AnalysisState } from '../api/analysis'

const mission = { site: { id: 'picked', name: 'Selected coordinate', latitude: -89.95, longitude: 22.2, description: '' }, startUtc: '2026-11-14T00:00:00Z', durationHours: 24 }
function render(status: AnalysisState['status'], resultsCleared = false, message = '') {
  return renderToStaticMarkup(<PositionPending kind="solar" mission={mission} resultsCleared={resultsCleared} analysis={{ status, result: null, message }}/>)
}
describe('position panel without observations', () => {
  it('explains cleared results and points to current mission controls', () => {
    const html = render('idle', true)
    expect(html).toContain('previous values were cleared')
    expect(html).toContain('Selected coordinate')
    expect(html).toContain('href="#mission-configuration"')
    expect(html).not.toContain('0.000°')
  })
  it('distinguishes an active request from a backend failure', () => {
    expect(render('loading')).toContain('Calculating the selected location and date')
    expect(render('loading')).not.toContain('href=')
    expect(render('error', false, 'Failed to fetch')).toContain('scientific analysis service is currently unavailable')
  })
})
