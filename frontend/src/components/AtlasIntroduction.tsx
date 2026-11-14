import { ArrowRight, Compass } from 'lucide-react'
import { Link } from 'react-router'
import { useMission } from '../state/MissionContext'
import { formatCoordinate, formatUtc } from '../lib/time'

export function AtlasIntroduction() {
  const { mission, analysis } = useMission()
  return <section className="atlas-introduction" aria-label="LunAscend lunar mission atlas">
    <div className="atlas-introduction-copy"><p className="eyebrow">LUNASCEND / MISSION OVERVIEW</p><h1>Lunar Mission Atlas</h1><p className="atlas-deck">Explore lunar landing locations and discover how sunlight, terrain, power and Earth visibility change with time.</p>
      <ol className="mission-guide"><li>Choose a landing site.</li><li>Select a landing date.</li><li>Check sunlight and Earth visibility.</li><li>Explore power and battery conditions.</li><li>Compare alternative missions.</li></ol>
      <dl className="atlas-mission-facts"><div><dt>SELECTED LOCATION</dt><dd>{mission.site.name}</dd><small>{formatCoordinate(mission.site.latitude, true)} · {formatCoordinate(mission.site.longitude, false)}</small></div><div><dt>MISSION EPOCH / UTC</dt><dd>{formatUtc(mission.startUtc)}</dd><small>{analysis.result ? analysis.result.provider_mode === 'mock' ? 'MOCK DATA — NOT LUNAR PREDICTIONS' : 'SPICE EPHEMERIS · geometric directions' : 'Awaiting analysis · no results loaded'}</small></div></dl>
      <div className="atlas-actions"><Link className="button primary" to="/sites">Explore the Moon<ArrowRight size={14}/></Link><a className="text-link" href="#mission-configuration">Analyze this location</a><Link className="text-link" to="/compare">Compare landing dates</Link><Link className="text-link" to="/resilience">Find alternatives</Link><Link className="text-link" to="/methodology"><Compass size={14}/>How it works</Link></div>
    </div>
  </section>
}
