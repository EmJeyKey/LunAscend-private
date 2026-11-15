import {Link} from 'react-router'
import {useMission} from '../state/MissionContext'
import {formatCoordinate} from '../lib/time'
export function MissionSummary(){
 const {mission,analysis,resultsCleared}=useMission()
 return <section className="panel mission-summary" aria-label="Current mission"><h2>{mission.site.name}</h2><p className="mono">{formatCoordinate(mission.site.latitude,true)} · {formatCoordinate(mission.site.longitude,false)} · {mission.startUtc} · {mission.durationHours} h</p><p>{analysis.result?`${analysis.result.observations?.length||0} calculated samples · ${analysis.result.terrain_visibility?'finite local terrain':'geometry only'}`:resultsCleared?'Inputs changed — run a new analysis.':analysis.status==='loading'?'Calculating…':analysis.status==='error'?analysis.message:'Analysis not run.'}</p><div className="atlas-actions"><Link to="/analysis#mission-configuration">Edit mission / run analysis</Link><Link to="/analysis#mission-results">View Mission Results</Link></div></section>
}
