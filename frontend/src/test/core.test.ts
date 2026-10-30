import { describe, expect, it, vi } from 'vitest'
import { checkBackend, parseHealth, parseInfo } from '../api/client'
import { formatCoordinate, shiftHours, toUtc } from '../lib/time'

const health = { status: 'ok', application_name: 'LunAscend', api_version: '1.0' }
const info = {
  application_name: 'LunAscend', application_version: '0.2.0', api_version: '1.0',
  capabilities: ['contract_validation', 'provider_dispatch'], implemented_analysis_providers: [],
  selectable_provider_modes: ['mock', 'scientific'], scientific_calculations_available: false, mock_analysis_available: false,
}

describe('UTC input handling', () => {
  it('treats the datetime control as UTC, without a local timezone conversion', () => {
    expect(toUtc('2026-11-14T06:00')).toBe('2026-11-14T06:00:00Z')
  })
  it.each(['', '2026-02-30T12:00', '2026-11-14T25:00', '2026-11-14', 'not-a-date'])('rejects invalid date %s', value => {
    expect(toUtc(value)).toBeNull()
  })
  it('shifts the preview date through a day boundary', () => {
    expect(shiftHours('2026-11-14T06:00:00Z', -12)).toBe('2026-11-13T18:00:00Z')
  })
  it('formats signed coordinate inputs with explicit hemispheres', () => {
    expect(formatCoordinate(-89.25, true)).toBe('89.2500° S')
    expect(formatCoordinate(-24.2, false)).toBe('24.2000° W')
  })
})

describe('backend status boundary', () => {
  it('preserves unavailable capabilities from the actual information contract', () => {
    expect(parseHealth(health).status).toBe('ok')
    expect(parseInfo(info).scientific_calculations_available).toBe(false)
    expect(parseInfo(info).implemented_analysis_providers).toEqual([])
  })
  it.each([null, '<html>Vite fallback</html>', {}, { ...health, api_version: '2.0' }])('rejects incompatible health payloads', value => {
    expect(() => parseHealth(value)).toThrow()
  })
  it('rejects truthy strings instead of treating them as scientific capability', () => {
    expect(() => parseInfo({ ...info, scientific_calculations_available: 'false' })).toThrow()
  })
  it('checks both endpoints without submitting any scenario analysis', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(Response.json(health)).mockResolvedValueOnce(Response.json(info))
    const result = await checkBackend(new AbortController().signal, fetcher, '/backend/')
    expect(result.info.mock_analysis_available).toBe(false)
    expect(fetcher.mock.calls.map(call => call[0])).toEqual(['/backend/health', '/backend/api/v1/info'])
  })
  it('reports an offline backend through a rejected status check, without fabricated fallback', async () => {
    const fetcher = vi.fn<typeof fetch>().mockRejectedValue(new TypeError('Failed to fetch'))
    await expect(checkBackend(new AbortController().signal, fetcher)).rejects.toThrow()
  })
  it('rejects HTTP errors before parsing a response', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response('Unavailable', { status: 503 }))
    await expect(checkBackend(new AbortController().signal, fetcher)).rejects.toThrow('503')
  })
})
