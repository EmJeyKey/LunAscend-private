import { createContext, useContext, useState, type PropsWithChildren } from 'react'
import { initialStartUtc, previewSites } from '../data/preview'
import type { MissionSelection, PreviewScenario } from '../types/preview'

interface MissionContextValue {
  mission: MissionSelection
  updateMission: (value: MissionSelection) => void
  alternatives: PreviewScenario[]
  saveAlternative: () => void
  removeAlternative: (id: string) => void
}

const MissionContext = createContext<MissionContextValue | null>(null)

export function MissionProvider({ children }: PropsWithChildren) {
  const [mission, updateMission] = useState<MissionSelection>({ site: previewSites[0], startUtc: initialStartUtc, durationHours: 48 })
  const [alternatives, setAlternatives] = useState<PreviewScenario[]>([
    { id: 'initial-alternative', site: previewSites[1], startUtc: initialStartUtc, durationHours: 48 },
  ])
  const saveAlternative = () => setAlternatives(previous => previous.length >= 2 ? previous : [...previous, { ...mission, id: crypto.randomUUID() }])
  const removeAlternative = (id: string) => setAlternatives(previous => previous.filter(item => item.id !== id))
  return <MissionContext.Provider value={{ mission, updateMission, alternatives, saveAlternative, removeAlternative }}>{children}</MissionContext.Provider>
}

export function useMission() {
  const value = useContext(MissionContext)
  if (!value) throw new Error('MissionProvider is required')
  return value
}
