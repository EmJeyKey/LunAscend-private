import { ArrowRight, Compass } from 'lucide-react'
import { Link } from 'react-router'
import { useMission } from '../state/MissionContext'
import { formatCoordinate, formatUtc } from '../lib/time'

export function AtlasIntroduction() {
  const { mission, analysis } = useMission()
  return <section className="atlas-introduction" aria-label="LunAscend lunar mission atlas">
    <div className="atlas-introduction-copy"><p className="eyebrow">LUNASCEND / MISSION DASHBOARD</p><h1>Lunar Mission Atlas</h1><p className="atlas-deck">Explore a location, choose a moment, and inspect the Sun and Earth geometry behind the mission.</p>
      <dl className="atlas-mission-facts"><div><dt>SELECTED LOCATION</dt><dd>{mission.site.name}</dd><small>{formatCoordinate(mission.site.latitude, true)} · {formatCoordinate(mission.site.longitude, false)}</small></div><div><dt>MISSION EPOCH / UTC</dt><dd>{formatUtc(mission.startUtc)}</dd><small>{analysis.result ? analysis.result.provider_mode === 'mock' ? 'MOCK DATA — NOT LUNAR PREDICTIONS' : 'SPICE EPHEMERIS · geometric directions' : 'Awaiting analysis · no results loaded'}</small></div></dl>
      <div className="atlas-actions"><a className="button primary" href="#mission-configuration">Analyze landing conditions<ArrowRight size={14}/></a><Link className="text-link" to="/methodology"><Compass size={14}/>Methods & scope</Link></div>
    </div>
    <figure className="atlas-brand-art"><img src="/brand/lunascend-original.png" width="1448" height="1086" alt="Original LunAscend team logo: golden wordmark and orbital arcs over a dark lunar globe" fetchPriority="high"/><figcaption>TEAM IDENTITY / ARTWORK · NOT A TERRAIN DATASET</figcaption></figure>
  </section>
}
