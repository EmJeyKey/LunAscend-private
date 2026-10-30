// UI-only selections. These are NOT backend LunarSite scientific contracts.
export interface PreviewSite {
  id: string
  name: string
  latitude: number
  longitude: number
  description: string
}

export interface MissionSelection {
  site: PreviewSite
  startUtc: string
  durationHours: number
}

export interface PreviewScenario extends MissionSelection {
  id: string
}
