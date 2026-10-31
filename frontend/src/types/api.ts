// Mirrors the existing backend Health/ApplicationInfo contracts in api/routes.py.
// Consumed analysis request/result fields are mirrored and checked in types/analysis.ts and api/analysis.ts.
export interface Health {
  status: 'ok'
  application_name: string
  api_version: string
}

export interface ApplicationInfo {
  application_name: string
  application_version: string
  api_version: string
  capabilities: string[]
  implemented_analysis_providers: string[]
  selectable_provider_modes: ('mock' | 'scientific')[]
  scientific_calculations_available: boolean
  mock_analysis_available: boolean
}

export type BackendConnection =
  | { status: 'checking' }
  | { status: 'disconnected'; message: string }
  | { status: 'connected'; health: Health; info: ApplicationInfo }
