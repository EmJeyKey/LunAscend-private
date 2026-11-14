import type {ComparisonScenario} from '../state/ComparisonStore'
import {comparisonExplanation,conditionSamples,powerOutcome} from '../lib/humanize'
import {SourceInfo} from './SourceInfo'

const metric=(v:number|null|undefined,unit:string)=>v==null?'Unavailable':`${v.toFixed(2)} ${unit}`
export function FriendlyComparison({scenarios,baselineId}:{scenarios:ComparisonScenario[];baselineId:string|null}) {
  const baseline=scenarios.find(s=>s.id===baselineId)?.analysis.result||null
  return <section className="panel friendly-comparison"><h2>What changes between these options?</h2><p>Compare the same questions for each location and date. A larger energy estimate does not identify a universally better or safer landing site.</p>
    <div className="friendly-comparison-grid">{scenarios.map(scenario=>{
      const result=scenario.analysis.result,power=result?.power,access=result?.communication
      return <article key={scenario.id}><h3>{scenario.name}{scenario.id===baselineId?' · baseline':''}</h3><p>{scenario.selection.site.name}<br/><time>{scenario.selection.startUtc}</time> · {scenario.selection.durationHours} h</p>
        {!result?<p role="status">{scenario.analysis.status==='loading'?'Calculating this option…':scenario.analysis.status==='error'?'This option could not be calculated. Check its settings and data.':'Not calculated yet. Configure and run this option.'}</p>:<>
          {result.provider_mode==='mock'&&<p className="mock-warning">MOCK / NOT LUNAR PREDICTIONS</p>}
          <p>At arrival: {conditionSamples(result,'sun')[0]?.label||'Sunlight not calculated'}. {conditionSamples(result,'earth')[0]?.label||'Earth visibility not calculated'}.</p>
          <dl><div><dt>Terrain information</dt><dd>{result.terrain_visibility?'Limited local coverage; clearance remains conditional':result.request.settings.terrain_enabled?'Terrain result unavailable':'Terrain was not calculated'}</dd></div>
            <div><dt>Battery outcome</dt><dd>{power?powerOutcome(power):'Not calculated'}</dd></div>
            {power?.cases.map(c=><div key={c.assumption}><dt>{c.assumption==='conservative'?'Conservative':'Optimistic'} case</dt><dd>Solar energy: {metric(c.totals.solar_generated_wh,'Wh')}<br/>Lowest battery energy: {metric(c.totals.minimum_battery_energy_wh,'Wh')}<br/>Unmet electrical demand: {metric(c.totals.unmet_load_wh,'Wh')}</dd></div>)}
            <div><dt>Conditional direct Earth access</dt><dd>{access?metric(access.earth_visibility_duration_s.value===null?null:access.earth_visibility_duration_s.value/3600,'h'):'Not calculated'}</dd></div>
            {access&&<div><dt>Unknown Earth-access time</dt><dd>{metric(access.unknown_duration_s/3600,'h')}</dd></div>}
          </dl>
          {power&&<p>Assumptions: {power.configuration.panel_area_m2} m² panels, {power.configuration.panel_efficiency*100}% efficiency, {power.configuration.orientation_mode.replaceAll('_',' ')}, {power.configuration.battery_capacity_wh} Wh battery, {power.configuration.baseline_load_w} W demand + {power.configuration.heater_load_w} W heater.</p>}
          {scenario.id!==baselineId&&comparisonExplanation(baseline,result).map(text=><p key={text}>{text}</p>)}
          <p>Optimistic results do not guarantee survival. Earth access does not establish radio-link performance. Unknown values are not zero.</p>
        </>}
        <SourceInfo kind="comparison" result={result}/>
      </article>
    })}</div>
  </section>
}
