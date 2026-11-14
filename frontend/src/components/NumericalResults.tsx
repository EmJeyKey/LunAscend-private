import type {ReactNode} from 'react'
import type {ScenarioResult} from '../types/analysis'
import type {PowerAnalysis} from '../types/engineering'
import {conditionSamples,powerOutcome} from '../lib/humanize'

export function productReason(result:ScenarioResult,product:'terrain'|'power'|'communication') {
  if(result.provider_mode==='mock')return 'Mock demonstration does not calculate scientific terrain, power or DTE. Select Scientific SPICE explicitly.'
  const requested=product==='terrain'?result.request.settings.terrain_enabled:product==='power'?result.request.settings.power_enabled:result.request.settings.communication_enabled
  if(!requested)return product==='power'?'Power analysis was not requested. Enable solar-panel and battery settings or use Run Full Analysis.':product==='communication'?'DTE analysis was not requested. Enable conditional Earth-access settings or use Run Full Analysis.':'Terrain analysis was not requested. Run with supported LOLA terrain to calculate horizon and clearance.'
  return `${product==='terrain'?'Terrain':product==='power'?'Power/battery':'DTE'} was requested, but no result is available. ${result.errors.map(e=>e.message).join(' ')||'Required environmental support is unavailable; no zero is assumed.'}`
}

export function NumericValue({value,unit,field,reason='Unavailable — insufficient data',digits=3}:{value:number|null|undefined;unit:string;field:string;reason?:string;digits?:number}) {
  return <span className="mono" data-result-field={field} data-raw-value={value??''}>{value==null?reason:`${value.toFixed(digits)}${unit==='°'?'':' '}${unit}`}</span>
}
function Row({label,children}:{label:string;children:ReactNode}){return <tr><th scope="row">{label}</th><td>{children}</td></tr>}

export function EngineeringNumbers({power,time}:{power:PowerAnalysis;time?:string}) {
  const instant=[['Solar generation','solar_generation_w','W'],['Electrical load','load_w','W'],['Stored battery energy','battery_energy_wh','Wh'],['Battery state of charge','soc_pct','%']] as const
  const totals=[['Solar energy generated','solar_generated_wh','Wh'],['Electrical energy needed','electrical_demand_wh','Wh'],['Lowest battery energy','minimum_battery_energy_wh','Wh'],['Minimum state of charge','minimum_soc_pct','%'],['Battery energy at the end','final_battery_energy_wh','Wh'],['Electrical demand not supplied','unmet_load_wh','Wh']] as const
  return <div className="friendly-table-scroll"><table className="friendly-table"><caption>Backend electrical results · instantaneous values at {time||'no selected sample'}; totals cover the returned mission interval</caption><thead><tr><th>Quantity</th>{power.cases.map(c=><th key={c.assumption}>{c.assumption==='conservative'?'Conservative':'Optimistic'}</th>)}</tr></thead><tbody>
    {instant.map(([label,key,unit])=><tr key={key}><th scope="row">{label}</th>{power.cases.map(c=>{const sample=c.samples.find(s=>Date.parse(s.time_utc)===Date.parse(time||''));return <td key={c.assumption}><NumericValue value={sample?.[key]} unit={unit} digits={2} field={`power.cases.${c.assumption}.samples.${time}.${key}`} reason={sample?'Unknown — environmental data incomplete':'No matching UTC sample returned'}/></td>})}</tr>)}
    {totals.map(([label,key,unit])=><tr key={key}><th scope="row">{label}</th>{power.cases.map(c=><td key={c.assumption}><NumericValue value={c.totals[key]} unit={unit} digits={2} field={`power.cases.${c.assumption}.totals.${key}`}/></td>)}</tr>)}
    <tr><th scope="row">Configured model requirements</th>{power.cases.map(c=><td key={c.assumption}>{c.passes_configured_model===null?'Not enough information':c.passes_configured_model?'Met under this assumption':'Not met under this assumption'}</td>)}</tr>
  </tbody></table></div>
}

export function NumericalResults({result,index=0,includePower=true}:{result:ScenarioResult;index?:number;includePower?:boolean}) {
  const observations=result.observations||[],sample=observations[Math.max(0,Math.min(index,observations.length-1))],time=sample?.time_utc
  const terrain=result.terrain_visibility,row=terrain?.observations.find(r=>Date.parse(r.time_utc)===Date.parse(time||'')),dte=result.communication,access=dte?.access_samples.find(r=>Date.parse(r.time_utc)===Date.parse(time||''))
  const sun=conditionSamples(result,'sun').find(s=>s.timeUtc===time),earth=conditionSamples(result,'earth').find(s=>s.timeUtc===time)
  return <section className="numerical-results" aria-label="Calculated numerical results"><h3>Calculated numerical results</h3>
    <p className="mono">{result.request.site.name} · {time||'No returned UTC sample'} · {observations.length} observations · {result.status}</p>
    {result.provider_mode==='mock'&&<p className="mock-warning">MOCK / NOT LUNAR PREDICTIONS. Values below are illustrative only.</p>}
    <div className="friendly-table-scroll"><table className="friendly-table"><caption>Sun and Earth center directions · {sample?.reference_frame||'No observation frame'}; terrain rows explicitly use native DE421</caption><thead><tr><th>Quantity</th><th>Sun</th><th>Earth</th></tr></thead><tbody>
      {(['azimuth','elevation'] as const).map(angle=><tr key={angle}><th scope="row">Geometric {angle}</th>{(['sun','earth'] as const).map(body=>{const metric=sample?.[`${body}_${angle}_deg`];return <td key={body}><NumericValue value={metric?.value} unit="°" field={`observations.${time}.${body}_${angle}_deg.value`} reason={metric?.reason||'No observation returned'}/></td>})}</tr>)}
      {(['horizon_elevation_deg','clearance_deg'] as const).map(key=><tr key={key}><th scope="row">{key==='clearance_deg'?'Center clearance':'Terrain horizon'} · DE421</th>{(['sun','earth'] as const).map(body=><td key={body}><NumericValue value={row?.[body][key]} unit="°" field={`terrain_visibility.observations.${time}.${body}.${key}`} reason={terrain?row?.[body].reason||'No matching UTC terrain sample':productReason(result,'terrain')}/></td>)}</tr>)}
      <tr><th scope="row">Visibility classification</th><td>{sun?.label||'No observation returned'}</td><td>{earth?.label||'No observation returned'}</td></tr>
      <tr><th scope="row">Ray coverage</th><td>{row?.sun.coverage||productReason(result,'terrain')}</td><td>{row?.earth.coverage||productReason(result,'terrain')}</td></tr>
    </tbody></table></div>
    <div className="friendly-table-scroll"><table className="friendly-table"><caption>Returned site and terrain values · input reference {result.request.site.coordinate_reference.frame_id}</caption><tbody>
      <Row label="Request latitude / longitude"><NumericValue value={result.request.site.latitude_deg} unit="° N" digits={7} field="request.site.latitude_deg"/> / <NumericValue value={result.request.site.longitude_deg} unit="° E" digits={7} field="request.site.longitude_deg"/></Row>
      {terrain&&<Row label="Native DEM latitude / longitude · DE421"><NumericValue value={terrain.native_latitude_deg} unit="° N" digits={7} field="terrain_visibility.native_latitude_deg"/> / <NumericValue value={terrain.native_longitude_deg} unit="° E" digits={7} field="terrain_visibility.native_longitude_deg"/></Row>}
      <Row label="Source DEM surface elevation"><NumericValue value={terrain?.surface_elevation_m} unit="m" field="terrain_visibility.surface_elevation_m" reason={productReason(result,'terrain')}/></Row>
      {!terrain&&result.request.site.surface_elevation_m!==null&&<Row label="Input surface elevation · user assumption, not a DEM measurement"><NumericValue value={result.request.site.surface_elevation_m} unit="m" field="request.site.surface_elevation_m"/></Row>}
      <Row label="Observer height above surface"><NumericValue value={terrain?.observer_height_m??result.request.site.observer_height_m} unit="m" field={terrain?'terrain_visibility.observer_height_m':'request.site.observer_height_m'}/></Row>
      <Row label="Terrain coverage / dataset">{terrain?`${terrain.max_search_radius_m} m evaluated radius; globally partial · ${terrain.dataset_id}`:productReason(result,'terrain')}</Row>
    </tbody></table></div>
    {includePower&&(result.power?<><p>{powerOutcome(result.power)}. These assumptions do not guarantee survival.</p><EngineeringNumbers power={result.power} time={time}/></>:<p>{productReason(result,'power')}</p>)}
    {dte?<div className="friendly-table-scroll"><table className="friendly-table"><caption>Conditional direct-to-Earth access</caption><tbody>
      <Row label="Selected-sample Earth clearance"><NumericValue value={access?.earth_clearance_deg} unit="°" field={`communication.access_samples.${time}.earth_clearance_deg`}/></Row>
      <Row label="Required Earth-center clearance"><NumericValue value={dte.configuration.minimum_earth_clearance_deg} unit="°" field="communication.configuration.minimum_earth_clearance_deg"/></Row>
      <Row label="Selected-sample access">{access?.classification.replaceAll('_',' ')||'No matching UTC access sample'}</Row>
      <Row label="Total conditional Earth access"><NumericValue value={dte.earth_visibility_duration_s.value} unit="s" field="communication.earth_visibility_duration_s.value"/></Row>
      <Row label="Longest sample-supported interruption"><NumericValue value={dte.longest_interruption_s.value} unit="s" field="communication.longest_interruption_s.value"/></Row>
      <Row label="Unknown Earth-access time"><NumericValue value={dte.unknown_duration_s} unit="s" field="communication.unknown_duration_s"/></Row>
    </tbody></table></div>:<p>{productReason(result,'communication')}</p>}
    <p>Radio signal strength is not calculated by the current communications model. Finite terrain, center-only geometry and time sampling do not establish complete visibility or reliable communications. Photographs do not supply these numerical values.</p>
  </section>
}
