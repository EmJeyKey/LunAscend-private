import {useMission} from '../state/MissionContext'
import {analysisProblem,conditionSamples,powerOutcome,type HumanSample} from '../lib/humanize'
import type {PowerAnalysis} from '../types/engineering'
import {SourceInfo} from './SourceInfo'
import {Glossary} from './PresentationControls'
import {EngineeringNumbers,NumericalResults} from './NumericalResults'

const value=(v:number|null|undefined,unit:string)=>v==null?'Unavailable':`${v.toFixed(2)} ${unit}`
const utcLabel=(time:string)=>time.replace('T',' ').replace(/(?:\.000)?Z$/,' UTC')

export function SampleTimeline({title,rows,index,onSelect,earth=false}:{title:string;rows:HumanSample[];index:number;onSelect:(index:number)=>void;earth?:boolean}) {
  if(!rows.length)return <section className="sample-timeline"><h3>{title}</h3><p>No returned time samples are available.</p></section>
  const first=Date.parse(rows[0].timeUtc),last=Date.parse(rows.at(-1)!.timeUtc),active=Math.max(0,Math.min(index,rows.length-1))
  const x=(time:string)=>45+(last===first?.5:(Date.parse(time)-first)/(last-first))*810
  const choose=(event:React.MouseEvent<SVGSVGElement>)=>{
    const box=event.currentTarget.getBoundingClientRect(),pixel=(event.clientX-box.left)/box.width*900
    onSelect(rows.reduce((best,row,i)=>Math.abs(x(row.timeUtc)-pixel)<Math.abs(x(rows[best].timeUtc)-pixel)?i:best,0))
  }
  return <section className={`sample-timeline ${earth?'earth-timeline':''}`}><h3>{title}</h3>
    <p className="current-condition"><strong>{rows[active].label}</strong> · {utcLabel(rows[active].timeUtc)}</p>
    <div className="sample-timeline-scroll"><svg viewBox="0 0 900 100" role="img" aria-label={`${title}: discrete returned UTC samples. Select a marker with a pointer or use the shared time slider. Blank spaces are not evaluated intervals.`} onClick={choose}>
      <defs><pattern id={earth?'earth-unknown-hatch':'sun-unknown-hatch'} width="5" height="5" patternUnits="userSpaceOnUse"><path d="M0 5L5 0" stroke="#95a3b2" strokeWidth="1"/></pattern></defs>
      <line x1="45" x2="855" y1="36" y2="36" className="timeline-baseline"/>
      {rows.map((row,i)=><g key={row.timeUtc}><rect x={x(row.timeUtc)-4} y="23" width="8" height="27" className={`sample-mark condition-${row.state}`} fill={row.state==='unknown'?`url(#${earth?'earth-unknown-hatch':'sun-unknown-hatch'})`:undefined}/><title>{utcLabel(row.timeUtc)} — {row.label}</title>{i===active&&<path d={`M${x(row.timeUtc)-6} 12L${x(row.timeUtc)+6} 12L${x(row.timeUtc)} 19Z`} className="timeline-selected"/>}</g>)}
      {[0,Math.floor((rows.length-1)/2),rows.length-1].filter((v,i,a)=>a.indexOf(v)===i).map((i,j,a)=><text key={i} x={x(rows[i].timeUtc)} y="73" textAnchor={j===0?'start':j===a.length-1?'end':'middle'}>{utcLabel(rows[i].timeUtc)}</text>)}
      <text x="450" y="96" textAnchor="middle">Returned mission samples · UTC</text>
    </svg></div>
    <ul className="condition-legend"><li><i className="condition-potential"/>{earth?'Potential access / visibility':'Conditional Sun clearance'}</li><li><i className="condition-blocked"/>Modeled obstruction</li>{earth&&<li><i className="condition-below"/>Below required clearance</li>}<li><i className="condition-unknown"/>Unknown</li><li><i className="condition-not_calculated"/>Not calculated</li></ul>
    <p className="sampling-note">Each mark is one calculated time, not a continuous visibility window. Gaps and transitions between samples are not inferred. Center-only geometry and finite terrain coverage do not establish complete visibility.</p>
  </section>
}

export function ModelPowerPlot({power,quantity,index=0}:{power:PowerAnalysis;quantity:'solar_generation_w'|'battery_energy_wh';index?:number}) {
  const samples=power.cases[0]?.samples||[],solar=quantity==='solar_generation_w',unit=solar?'W':'Wh'
  const numeric=power.cases.flatMap(c=>c.samples.map(s=>s[quantity]).filter((v):v is number=>v!==null))
  if(!samples.length||!numeric.length)return <div className="model-power-plot"><h3>{solar?'Estimated solar power':'Modeled battery energy'}</h3><p>Insufficient environmental data for this graph. Missing values are not zero.</p></div>
  const first=Date.parse(samples[0].time_utc),last=Date.parse(samples.at(-1)!.time_utc),maximum=Math.max(1,...numeric)
  const x=(time:string)=>55+(last===first?.5:(Date.parse(time)-first)/(last-first))*800,y=(v:number)=>160-v/maximum*130
  const selected=samples[Math.max(0,Math.min(index,samples.length-1))]
  return <figure className={`model-power-plot ${solar?'solar-power-plot':'battery-model-plot'}`}><figcaption><strong>{solar?'Estimated solar power (W)':'Modeled stored battery energy (Wh)'}</strong><span>Dashed = conservative · solid = optimistic</span></figcaption>
    <div className="sample-timeline-scroll"><svg viewBox="0 0 900 220" role="img" aria-label={`${solar?'Estimated solar power in watts':'Stored battery energy in watt hours'} at returned UTC samples for both modeled cases. Missing values break the graph.`}>
      {[0,.5,1].map(f=><g key={f}><line x1="55" x2="855" y1={y(maximum*f)} y2={y(maximum*f)} className="model-plot-grid"/><text x="47" y={y(maximum*f)+4} textAnchor="end">{(maximum*f).toFixed(0)} {unit}</text></g>)}
      {power.cases.map(c=>{
        let drawing=false
        const path=c.samples.map(s=>{const v=s[quantity];if(v===null){drawing=false;return ''}const point=`${drawing?'L':'M'}${x(s.time_utc)},${y(v)}`;drawing=true;return point}).join(' ')
        return <g key={c.assumption}><path d={path} className={`model-power-path ${c.assumption}`}/>{c.samples.map(s=>s[quantity]===null?null:<circle key={s.time_utc} cx={x(s.time_utc)} cy={y(s[quantity]!)} r="2.5" className={`model-power-point ${c.assumption}`}><title>{`${c.assumption} · ${utcLabel(s.time_utc)} · ${s[quantity]} ${unit}`}</title></circle>)}</g>
      })}
      <line x1={x(selected.time_utc)} x2={x(selected.time_utc)} y1="22" y2="165" className="model-time-cursor"/>
      <text x="55" y="188">{utcLabel(samples[0].time_utc)}</text><text x="855" y="207" textAnchor="end">{utcLabel(samples.at(-1)!.time_utc)}</text>
    </svg></div>
    <p>Dots are actual returned model samples. Connecting lines only guide the eye; values between dots and exact depletion times are not established by this display. Unknown samples break the line.</p>
  </figure>
}

export function SimpleEngineering({power,index=0}:{power:PowerAnalysis;index?:number}) {
  return <section className="simple-engineering"><h3>Power and battery</h3><p><strong>{powerOutcome(power)}</strong></p><p>Conservative: conditional sunlight is treated as unavailable. Optimistic: conditional Sun-center clearance can power the configured panels. Neither case guarantees spacecraft survival.</p>
    <p>These are LunAscend calculations under user-defined assumptions: {power.configuration.panel_area_m2} m² panels, {power.configuration.panel_efficiency*100}% panel efficiency, {power.configuration.orientation_mode.replaceAll('_',' ')}, {power.configuration.baseline_load_w} W demand + {power.configuration.heater_load_w} W heater, {power.configuration.battery_capacity_wh} Wh battery, {power.configuration.minimum_soc_pct}% reserve.</p>
    <EngineeringNumbers power={power} time={power.cases[0]?.samples[index]?.time_utc}/>
    <ModelPowerPlot power={power} quantity="solar_generation_w" index={index}/><p>Estimated solar power depends on the Sun’s position, modeled terrain obstruction and the selected panels, orientation, efficiency, irradiance and electrical losses. Sun elevation is not power.</p>
    <ModelPowerPlot power={power} quantity="battery_energy_wh" index={index}/><p>Incomplete environmental support can leave full-mission energy totals unavailable even when a known prefix has values. Unknown time is not zero demand or guaranteed survival.</p>
  </section>
}

export function OperationalConditions({compact=false}:{compact?:boolean}) {
  const {analysis,sampleIndex,selectSample,resultsCleared}=useMission(),result=analysis.result
  if(!result)return <section className="panel friendly-empty" aria-live="polite"><h2>{analysis.status==='loading'?'Calculating this mission…':analysis.status==='error'?'Analysis could not be completed':resultsCleared?'Inputs changed — previous results cleared':'No analysis yet.'}</h2><p>{analysis.status==='loading'?'The selected scientific provider is working. No estimated progress percentage is shown.':analysis.status==='error'?analysisProblem(analysis.message,analysis.errors):'Choose a landing location and date, then run an analysis to see sunlight and Earth visibility.'}</p>{analysis.status!=='loading'&&<button className="button primary" type="submit" form="mission-analysis-form">Run analysis</button>}<SourceInfo kind="sunlight" result={null}/></section>
  if(!result.observations?.length)return <section className="panel friendly-empty"><h2>No scientific observations available</h2><p>This result is {result.status}. Missing values do not establish sunlight, Earth access or a successful mission.</p>{result.errors.map((error,i)=><p key={i}>{error.message}</p>)}<SourceInfo kind="sunlight" result={result}/></section>
  const sun=conditionSamples(result,'sun'),earth=conditionSamples(result,'earth'),at=Math.max(0,Math.min(sampleIndex,(result.observations?.length||1)-1)),time=result.observations?.[at]?.time_utc
  return <section className={`panel operational-conditions${compact?' compact':''}`} aria-label="Explained mission conditions"><h2>Operational conditions over time</h2>
    {result.provider_mode==='mock'&&<p className="mock-warning">MOCK / NOT LUNAR PREDICTIONS. Illustrative curves, not NASA scientific outputs.</p>}
    <p>{result.provider_mode==='mock'?'These demonstration samples do not use SPICE or NASA terrain and cannot establish sunlight or Earth access.':`${result.status==='partial'?'Partially calculated: some conditions remain unknown. ':''}Sun and Earth are tested against the modeled local terrain at the returned times. Finite terrain coverage and unresolved features limit every clearance result.`}</p>
    <section className="at-this-moment" aria-label="At this moment"><h3>At this moment</h3><time>{time?utcLabel(time):'No returned sample'}</time><dl><div><dt>Sunlight</dt><dd>{sun[at]?.label||'Not calculated'}</dd></div><div><dt>Earth</dt><dd>{earth[at]?.label||'Not calculated'}</dd></div>{result.power?.cases.map(c=>{const sample=c.samples.find(s=>Date.parse(s.time_utc)===Date.parse(time||''));return <div key={c.assumption}><dt>{c.assumption==='conservative'?'Conservative':'Optimistic'} power / battery</dt><dd>{value(sample?.solar_generation_w,'W')} · {value(sample?.battery_energy_wh,'Wh')}{sample?.soc_pct!=null?` · ${sample.soc_pct.toFixed(1)}% charge`:''}</dd></div>})}</dl><p>{sun[at]?.reason} Earth visibility indicates possible access, not guaranteed radio communication.</p></section>
    {!!result.observations?.length&&<label className="friendly-time-control">Select a calculated time <output>{time?utcLabel(time):'Unavailable'}</output><input type="range" aria-label="Select calculated mission time" min="0" max={result.observations.length-1} value={at} onChange={e=>selectSample(Number(e.target.value))}/></label>}
    <NumericalResults result={result} index={at} includePower={false}/>
    <SampleTimeline title="Sunlight availability" rows={sun} index={at} onSelect={selectSample}/><SourceInfo kind="sunlight" result={result}/>
    <SampleTimeline title={result.communication?'Earth visibility and direct access':'Earth visibility'} rows={earth} index={at} onSelect={selectSample} earth/><p>Earth behind the modeled horizon can obstruct direct communication. A clearance requirement adds an equipment margin; it is not radio signal strength. A link budget, antenna pointing and ground-station coverage are not modeled here.</p><SourceInfo kind="earth" result={result}/>
    {result.power&&<><SimpleEngineering power={result.power} index={at}/><SourceInfo kind="power" result={result}/><SourceInfo kind="battery" result={result}/></>}
    {!result.power&&<p>Power and battery were not calculated. {result.provider_mode==='mock'?'Engineering estimates require Scientific SPICE with supported terrain.':result.request.settings.power_enabled?'Power was requested, but environmental support is unavailable.':'Power analysis was not requested. Enable solar-panel and battery settings or use Run Full Analysis; no solar-power curve is invented from Sun elevation.'}</p>}
    <Glossary terms={['Horizon','Angular clearance','Direct-to-Earth','Conservative assumption','Optimistic assumption','Missing data','UTC']}/>
  </section>
}
