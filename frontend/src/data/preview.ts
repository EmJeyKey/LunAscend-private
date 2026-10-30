import type { PreviewSite } from '../types/preview'

// Synthetic input locations for interface development, not surveyed lunar sites.
export const previewSites: PreviewSite[] = [
  { id: 'ridge-a', name: 'Polar ridge A', latitude: -89.25, longitude: 42.5,
    description: 'Synthetic ridge location for exploring the interface.' },
  { id: 'ridge-b', name: 'Polar ridge B', latitude: -88.75, longitude: -24.2,
    description: 'Synthetic alternative location. No terrain dataset is attached.' },
  { id: 'basin-c', name: 'Polar basin C', latitude: -89.6, longitude: 15.8,
    description: 'Synthetic basin location. Not a landing-site recommendation.' },
]

export const initialStartUtc = '2026-11-14T06:00:00Z'
export const durationOptions = [24, 48, 72, 168]
