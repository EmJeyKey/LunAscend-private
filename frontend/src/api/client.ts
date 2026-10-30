import type { ApplicationInfo, Health } from '../types/api'

type Fetcher = typeof fetch
const defaultBase = import.meta.env.VITE_API_BASE_URL || '/backend'

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function strings(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(item => typeof item === 'string')
}

export function parseHealth(value: unknown): Health {
  if (!record(value) || value.status !== 'ok' || typeof value.application_name !== 'string' || value.api_version !== '1.0') {
    throw new Error('Unsupported backend health response')
  }
  return value as unknown as Health
}

export function parseInfo(value: unknown): ApplicationInfo {
  if (!record(value) || typeof value.application_name !== 'string' || typeof value.application_version !== 'string'
    || value.api_version !== '1.0' || !strings(value.capabilities) || !strings(value.implemented_analysis_providers)
    || !strings(value.selectable_provider_modes) || !value.selectable_provider_modes.every(mode => mode === 'mock' || mode === 'scientific')
    || typeof value.scientific_calculations_available !== 'boolean' || typeof value.mock_analysis_available !== 'boolean') {
    throw new Error('Unsupported backend information response')
  }
  return value as unknown as ApplicationInfo
}

export async function checkBackend(signal: AbortSignal, fetcher: Fetcher = fetch, base = defaultBase) {
  const boundedSignal = AbortSignal.any([signal, AbortSignal.timeout(5000)])
  const get = async (path: string) => {
    const response = await fetcher(`${base.replace(/\/$/, '')}${path}`, { signal: boundedSignal, headers: { Accept: 'application/json' } })
    if (!response.ok) throw new Error(`Backend request returned HTTP ${response.status}`)
    return response.json() as Promise<unknown>
  }
  const [health, info] = await Promise.all([get('/health'), get('/api/v1/info')])
  return { health: parseHealth(health), info: parseInfo(info) }
}
