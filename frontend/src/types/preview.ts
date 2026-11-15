// UI-only selections. These are NOT backend LunarSite scientific contracts.
export interface PreviewSite {
  id: string
  name: string
  latitude: number
  longitude: number
  category?: string
  native?: {latitude:number;longitude:number;frame:"MOON_ME_DE421";source:string;datasetId?:string|null;quality?:Record<string,{value:number|null;source_url:string;missing_reason?:string}>}
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
