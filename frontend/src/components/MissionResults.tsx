import {Link} from 'react-router'
import {useMission} from '../state/MissionContext'
import type {Assessment} from '../api/assessment'
import {conditionSamples} from '../lib/humanize'

const verdicts:Record<string,string>={does_not_meet_requirements:'DOES NOT MEET REQUIREMENTS',insufficient_data:'NOT ENOUGH INFORMATION',conditional:'CONDITIONAL',meets_all_evaluated_mandatory_requirements:'MEETS EVALUATED REQUIREMENTS',analysis_not_run:'NOT ANALYZED'}
export function MissionResults({report,error}:{report:Assessment|null;error:string}){
 const {mission,analysis,sampleIndex,selectSample,options,resultsCleared,requirePower,requireCommunication}=useMission()
 const result=analysis.result, observation=result?.observations?.[sampleIndex]
 const body=(target:'sun'|'earth')=>{
  if(!result||!observation)return {title:'Not calculated',detail:'Run Complete Mission Analysis to calculate this result.'}
  const sample=conditionSamples(result,target)[sampleIndex],name=target==='sun'?'Sun':'Earth'
  if(sample?.state==='blocked')return {title:`${name} blocked`,detail:`Modeled terrain blocks the ${name}’s center at this time.`}
  if(sample?.state==='potential')return {title:target==='sun'?'Sun potentially available':'Earth potentially visible',detail:'Nearby terrain permits center clearance; distant terrain remains uncertain.'}
  if(sample?.state==='below')return {title:'Below required clearance',detail:'Earth does not meet the selected equipment margin.'}
  const elevation=observation[`${target}_elevation_deg`].value
  return {title:elevation===null?'Not enough information':`${name} geometrically ${elevation<0?'below':elevation===0?'on':'above'} the horizon`,detail:'Local terrain visibility is unknown.'}
 }
 const sun=body('sun'),earth=body('earth'),power=result?.power
 const electricity=power?{pass_both:'Enough under the evaluated model',fail_both:'Not enough electricity',pass_optimistic_only:'Depends on sunlight assumptions',indeterminate:'More information needed',unavailable:'Not calculated'}[power.outcome]:'Not calculated'
 const failed=report?.constraints.filter(c=>c.status==='fail')||[],unknown=report?.constraints.filter(c=>c.status==='indeterminate')||[]
 const missing=[
  ...(result&&!power&&requirePower?['Electrical results are missing. Check panel and battery settings and supported terrain coverage.']:[]),
  ...(result&&!result.communication&&requireCommunication?['Earth-access evidence is missing. Configure the required clearance and supported terrain.']:[]),
  ...unknown.filter(c=>!/power|soc|unmet/.test(c.constraint_id)&&!(!result?.communication&&/dte|earth/.test(c.constraint_id))).map(c=>/slope/.test(c.constraint_id)?'A terrain-slope requirement lacks verified evidence; this mission model cannot assess landing hazards.':`Evidence for ${c.constraint_id.replaceAll('_',' ')} is incomplete. Review this requirement in Professional Analysis.`),
  ...(options.productNotes||[]),
  ...(result&&!result.terrain_visibility?['Local terrain coverage is unavailable. Provide supported terrain to assess obstruction.']:[])]

 return <section className="panel mission-results" id="mission-results" aria-label="Your lunar mission results">
  <span className="eyebrow">YOUR LUNAR MISSION RESULTS</span><h2>{mission.site.name}</h2>
  <p role="status">{resultsCleared?'Inputs changed - run a new analysis.':result?.status==='partial'?'Partial scientific result - coverage limits remain.':''}</p><p className="mono">{mission.startUtc.replace('T',' ').replace('Z',' UTC')} · {mission.durationHours} hours</p>
  <div className="mission-verdict" role="status"><h3>Does this mission meet its requirements?</h3><strong>{error||(!result?analysis.status==='loading'?'CALCULATING':analysis.status==='error'?'ANALYSIS FAILED':'NOT ANALYZED':report?verdicts[report.classification]:'Assessing returned results…')}</strong>
  <ul>{failed.length>0?<li>The selected {failed.some(c=>/unmet|soc|power|battery/.test(c.constraint_id))?'electrical system':'mission configuration'} fails at least one mandatory requirement.</li>:report?.classification==='conditional'?<li>The outcome depends on the selected model assumptions.</li>:report?.classification==='insufficient_data'?<li>A mandatory requirement lacks evidence.</li>:null}<li>Decision support only; this does not certify landing safety.</li></ul></div>
  <div className="mission-result-grid">
   <article><span className="eyebrow">01 · SUNLIGHT</span><h3>Will there be sunlight?</h3><strong>{sun.title}</strong><p>{sun.detail}</p></article>
   <article><span className="eyebrow">02 · EARTH VISIBILITY</span><h3>Can we see Earth?</h3><strong>{earth.title}</strong><p>{earth.detail}</p><small>Visibility does not guarantee radio communication.</small></article>
   <article><span className="eyebrow">03 · ELECTRICITY</span><h3>Do we have enough electricity?</h3><strong>{electricity}</strong><p>{power?.outcome==='fail_both'?'The panels and usable battery cannot supply all demand in either modeled case.':power?'Panel generation, battery reserve and equipment demand are evaluated together.':'Panel and battery settings plus supported terrain are required.'}</p></article>
   <article><span className="eyebrow">04 · LANDING TERRAIN</span><h3>Does the terrain meet our requirements?</h3><strong>{!result?'Not analyzed':result.terrain_visibility?'Terrain suitability not evaluated':'Terrain data incomplete'}</strong><ul><li>{result?.terrain_visibility?'Local elevation and terrain horizons are available.':'No local terrain result is available.'}</li><li>Slope limits, roughness and landing hazards are not evaluated by this mission model.</li></ul></article>
  </div>
  {observation&&<label className="friendly-time-control">Selected environment sample · <output>{observation.time_utc}</output><input aria-label="Select calculated mission time" type="range" min="0" max={(result?.observations?.length||1)-1} value={sampleIndex} onChange={e=>selectSample(Number(e.target.value))}/><small>Sun and Earth cards describe this sample; electricity covers the mission interval.</small></label>}
  {(failed.length>0||report?.classification==='conditional')&&<div><h3>How can we improve this mission?</h3><ul>{failed.some(c=>/unmet|soc|power|battery/.test(c.constraint_id))&&<li>Try larger panels, lower demand or more usable battery capacity; recalculate to test the change.</li>}<li>Compare another site or landing date before choosing an alternative.</li></ul></div>}
  {missing.length>0&&<details open><summary>What do we still need?</summary><ul>{[...new Set(missing)].map(text=><li key={text}>{text}</li>)}</ul></details>}
  {options.coverageNote&&<p>{options.coverageNote.reason}</p>}
  <div className="atlas-actions"><Link className="button secondary" to="/compare">Compare Alternatives</Link><Link className="button secondary" to="/resilience">Test Another Date</Link></div>
 </section>
}
