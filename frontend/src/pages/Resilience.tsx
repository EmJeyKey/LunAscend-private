import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { PageHeader } from '../components/ui'
import { MissionControls } from '../components/MissionControls'
import {SourceInfo} from '../components/SourceInfo'
import {ScientificDetails} from '../components/PresentationControls'
import {opportunityExplanation,conditionSamples} from '../lib/humanize'
import {NumericalResults} from '../components/NumericalResults'
import { BatteryPlot } from '../components/EngineeringPanel'
import { useMission } from '../state/MissionContext'
import { buildRequest } from '../lib/analysis'
import { classLabels, comparisonInput, defaultConstraints, sortOpportunities, utcInput } from '../lib/resilience'
import { engineeringNumber as number, outcomeLabels } from '../lib/engineering'
import { requestOpportunities } from '../api/resilience'
import type { Opportunity, OpportunityResponse, MissionConstraints } from '../types/resilience'
import type { AnalysisOptions } from '../types/analysis'
import type { MissionSelection } from '../types/preview'

export function Resilience() {
  const {mission,options,analysis,comparisonStore,comparison} = useMission()
  const [baselineDraft,setBaselineDraft]=useState<MissionSelection>(mission)
  const [delay,setDelay]=useState(24),[units,setUnits]=useState('hours'),[alternate,setAlternate]=useState('')
  const [first,setFirst]=useState(mission.startUtc.slice(0,16)),[last,setLast]=useState(new Date(Date.parse(mission.startUtc)+3*86400000).toISOString().slice(0,16))
  const [step,setStep]=useState(24),[sites,setSites]=useState(''),[rules,setRules]=useState(defaultConstraints)
  const [data,setData]=useState<OpportunityResponse|null>(null),[selected,setSelected]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false)
  const [filter,setFilter]=useState('all'),[sort,setSort]=useState('date'),[descending,setDescending]=useState(false)
  const run=useRef<{version:number;controller:AbortController|null}>({version:0,controller:null})
  const snapshot=useRef<AnalysisOptions>(options)
  const cancel=()=>{run.current.version++;run.current.controller?.abort();run.current.controller=null;setBusy(false)}
  useEffect(()=>{run.current.version++;run.current.controller?.abort();setBusy(false);setData(null);setMessage('')},[baselineDraft,options])
  useEffect(()=>()=>{run.current.version++;run.current.controller?.abort()},[])
  useEffect(()=>{if (Number.isFinite(Date.parse(baselineDraft.startUtc))) {setFirst(baselineDraft.startUtc.slice(0,16));setLast(new Date(Date.parse(baselineDraft.startUtc)+3*86400000).toISOString().slice(0,16))}},[baselineDraft.startUtc])
  const change=(key: keyof MissionConstraints,value: number|boolean|null)=>{cancel();setData(null);setRules(old=>({...old,[key]:value}))}
  const execute=async (delayed:boolean)=>{
    cancel();setData(null);setMessage('')
    try {
      const baseline=buildRequest(baselineDraft,options)
      const arrival=alternate?utcInput(alternate):new Date(Date.parse(baseline.start_utc)+delay*(units==='days'?86400000:3600000)).toISOString()
      const extra=delayed || !sites.trim()?[]:sites.trim().split('\n').map((line,i)=>{
        const [name,lat,lon]=line.split(',').map(s=>s.trim())
        if (!name || lat===undefined || lon===undefined || lat==='' || lon==='' || !Number.isFinite(Number(lat)) || !Number.isFinite(Number(lon))) throw new Error('Use one candidate per line: name, latitude, longitude, in the baseline DE440/ME421 frame.')
        return {...baseline.site,site_id:`resilience-site-${i+1}`,name,latitude_deg:Number(lat),longitude_deg:Number(lon)}
      })
      const request={baseline,earliest_utc:delayed?arrival:utcInput(first),latest_utc:delayed?arrival:utcInput(last),step_hours:step,sites:extra,constraints:{...rules,required_duration_s:rules.required_duration_s??baselineDraft.durationHours*3600}}
      const controller=new AbortController(),version=++run.current.version
      run.current.controller=controller;snapshot.current=structuredClone(options);setBusy(true)
      try {
        const response=await requestOpportunities(request,controller.signal)
        if (version!==run.current.version) return
        setData(response);setSelected(response.opportunities[0]?.request_id||'');setMessage('')
      } catch(error) {if (version===run.current.version) setMessage(error instanceof Error?error.message:'Search failed; no substituted results.')}
      finally {if (version===run.current.version) setBusy(false)}
    } catch(error) {setMessage(error instanceof Error?error.message:'Invalid resilience inputs.')}
  }
  const chosen=data?.opportunities.find(r=>r.request_id===selected)
  const add=(row:Opportunity)=>{
    if (!row.request || !row.result) return
    try {
      const input=comparisonInput(row.request,snapshot.current)
      const id=comparisonStore.addResult(input.selection,input.options,row.result)
      setMessage(id?'Opportunity added with its calculated result. Open Scenario Comparison.':'Comparison already contains three scenarios. Remove one there first.')
    } catch(error) {setMessage(error instanceof Error?error.message:'Could not add the opportunity.')}
  }
  const field=(key:keyof MissionConstraints,label:string,unit:string)=> <label key={key}>{label} / {unit}<input type="number" min="0" step="any" value={rules[key]===null?'':String(rules[key])} onChange={e=>change(key,e.target.value===''?null:Number(e.target.value))}/></label>
  return <><PageHeader eyebrow="RESILIENCE / SCIENTIFIC WHAT IF" title="What If the Mission Is Delayed?" description="Your landing is delayed. What changes? Recalculate the conditions, compare consequences and explore alternatives under the same hardware assumptions."/>
    <ol className="mission-guide"><li>Original landing plan</li><li>Choose a delay</li><li>Recalculate conditions</li><li>Compare consequences</li><li>Explore alternatives</li></ol>
    <section className="panel resilience-section"><h2>Original Mission</h2><p>Choose the original location, landing time and mission length. Enable terrain, power/battery and Earth-access analysis in its settings. Changing only the landing date keeps every hardware assumption.</p><MissionControls onDraftChange={setBaselineDraft}/>{analysis?.result && <p>Current baseline analysis: {analysis.result.power ? outcomeLabels[analysis.result.power.outcome] : analysis.result.status}. Conditional DTE access: {number(analysis.result.communication?.earth_visibility_duration_s.value)} s. Run the delay/search calculation to inspect original-versus-alternative evidence.</p>}<p className="mono">{baselineDraft.site.name} · {baselineDraft.startUtc} · {baselineDraft.durationHours} h · {options.providerMode==='mock'?'MOCK / NOT LUNAR PREDICTIONS · excluded from opportunity search':'Scientific SPICE / explicit LOLA coverage required'}</p></section>
    <section className="panel resilience-section"><h2>What If the Landing Is Delayed?</h2><p>Each date is recalculated for the same physical observer. The existing exact frame conversion keeps the location fixed; no old environmental result is relabeled with a new date.</p>
      <div className="atlas-actions">{[1,3,5,7].map(d=><button key={d} className="button secondary" onClick={()=>{cancel();setData(null);setDelay(d);setUnits('days');setAlternate('')}}>Delay by {d} day{d===1?'':'s'}</button>)}<button className="button secondary" onClick={()=>{cancel();setData(null);setDelay(0);setAlternate('')}}>Restore original date</button></div>
      <div className="resilience-controls"><label>Custom landing shift<input type="number" value={delay} onChange={e=>{cancel();setData(null);setDelay(Number(e.target.value));setAlternate('')}}/></label><label>Shift units<select value={units} onChange={e=>{cancel();setData(null);setUnits(e.target.value)}}><option>hours</option><option>days</option></select></label><label>Alternative landing UTC<input type="datetime-local" step="1" value={alternate} onInput={e=>{cancel();setData(null);setAlternate(e.currentTarget.value)}}/></label></div>
      <div className="atlas-actions"><button className="button primary" disabled={busy} onClick={()=>void execute(true)}>Recalculate original and delayed mission</button><button className="button secondary" disabled={!busy} onClick={()=>{cancel();setMessage('Cancelled. The current calculation finishes safely; remaining candidates stop.')}}>Cancel</button></div>
    </section>
    <SourceInfo kind="resilience" result={analysis?.result||null}/>
    <section className="panel resilience-section"><h2>Find another opportunity</h2><p>Finite date grid; at most 12 candidates across up to three sites, plus baseline. Dates within 30 days of the original; mission ≤7 days and ≤169 samples. No universal score or automatic optimizer.</p>
      <div className="resilience-controls"><label>Earliest landing UTC<input type="datetime-local" value={first} onInput={e=>{cancel();setData(null);setFirst(e.currentTarget.value)}}/></label><label>Latest landing UTC<input type="datetime-local" value={last} onInput={e=>{cancel();setData(null);setLast(e.currentTarget.value)}}/></label><label>Date step / hours<input type="number" min="1" max="720" value={step} onChange={e=>{cancel();setData(null);setStep(Number(e.target.value))}}/></label></div>
      <label>Additional allowed sites / up to two<textarea rows={2} value={sites} placeholder={'Name, latitude, longitude\nCoordinates at original landing UTC'} onChange={e=>{cancel();setData(null);setSites(e.target.value)}}/></label><p>Only these sites and the original are searched, using the original epoch’s DE440/ME421 metadata and observer height. Unsupported coverage stays unavailable.</p>
      <h3>Mission requirements</h3><div className="resilience-controls">{field('maximum_unmet_load_wh','Maximum unmet electrical demand','Wh')}{field('minimum_soc_pct','Minimum battery charge','%')}{field('minimum_earth_clearance_deg','Required Earth-center clearance','deg')}{field('maximum_dte_interruption_s','Maximum supported DTE interruption','s')}{field('minimum_dte_access_s','Minimum conditional DTE access','s')}{field('required_duration_s','Required duration (blank uses baseline)','s')}{field('maximum_distance_m','Maximum site distance (optional)','m')}</div>
      <label><input type="checkbox" checked={rules.require_conservative_pass} onChange={e=>change('require_conservative_pass',e.target.checked)}/>Require conservative power model to pass</label><label><input type="checkbox" checked={rules.allow_optimistic_only} onChange={e=>change('allow_optimistic_only',e.target.checked)}/>Allow optimistic-only conditional alternatives when conservative pass is not required</label>
      <p>Unknown required metrics cannot pass. DTE windows must have been calculated with at least the required clearance: adjust baseline settings if needed. Optimistic results never guarantee mission survival.</p><button className="button primary" disabled={busy} onClick={()=>void execute(false)}>Evaluate landing opportunities</button>
    </section>
    <p role="status" aria-live="polite">{busy?'Evaluating sequentially. Results appear after this bounded search; cancellation stops remaining candidates.':message}</p>
    {data && <><section className="panel resilience-section"><h2>Alternative Opportunities</h2><p>{data.completed} completed · {data.failed} failed · {data.indeterminate} insufficient evidence · {number(data.elapsed_s)} s · {data.cache_hits} result reuses · {data.horizon_reuses} horizon reuses{data.cancelled?' · interrupted':''}</p>
      <div className="resilience-controls"><label>Constraint status filter<select value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">All evaluations</option>{Object.entries(classLabels).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label><label>Sort by<select value={sort} onChange={e=>setSort(e.target.value)}>{[['date','Landing UTC'],['shift','Date shift'],['conservative_unmet_load_wh','Conservative unmet demand'],['optimistic_unmet_load_wh','Optimistic unmet demand'],['conservative_minimum_battery_energy_wh','Minimum battery energy'],['conservative_minimum_soc_pct','Minimum battery charge'],['optimistic_solar_generated_wh','Optimistic solar generation'],['dte_interruption_s','DTE interruption'],['dte_unknown_s','Unknown DTE coverage'],['finite_radius_complete_ray_fraction','Complete finite-radius terrain rays']].map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label><label><input type="checkbox" checked={descending} onChange={e=>setDescending(e.target.checked)}/>Descending · unknown metrics always last</label></div>
      <div className="terrain-table-scroll"><table className="terrain-table"><thead><tr><th>Site / landing UTC</th><th>Requirement classification</th><th>Engineering outcome</th><th>Actions</th></tr></thead><tbody>{sortOpportunities(data.opportunities.filter(r=>filter==='all'||r.classification===filter),sort,descending).map(row=><tr key={row.request_id}><th>{row.site.name}<p className="mono">{row.start_utc} · {number(row.date_shift_s/3600)} h shift</p><p>{row.result?'Calculated':'Unavailable'} · {row.site.latitude_deg.toFixed(6)}°, {row.site.longitude_deg.toFixed(6)}° at original epoch</p></th><td>{classLabels[row.classification]}{row.classification==='conditionally_promising'&&<p>Depends on optimistic assumptions; not a survival guarantee.</p>}{row.errors.map(e=><p key={e}>{e}</p>)}</td><td>{row.result?.power?outcomeLabels[row.result.power.outcome]:'Power unavailable'}<p>DTE access {number(row.result?.communication?.earth_visibility_duration_s.value)} s · unknown {number(row.result?.communication?.unknown_duration_s)} s</p></td><td><button className="button secondary" onClick={()=>setSelected(row.request_id)}>Inspect</button><button className="button secondary" disabled={!row.result||!row.request||!!row.errors.length||comparison.scenarios.length>=3} onClick={()=>add(row)}>Add to comparison</button></td></tr>)}</tbody></table></div><p><Link to="/compare">Scenario Comparison</Link> · {comparison.scenarios.length}/3 occupied. Existing scenarios are never overwritten.</p></section>
      {chosen && <><section className="panel resilience-section"><h2>What changed?</h2>{opportunityExplanation(chosen).map(text=><p key={text}>{text}</p>)}<SourceInfo kind="resilience" result={chosen.result}/><p>Original {data.baseline.request.start_utc} → alternative {chosen.start_utc}. Differences are alternative minus original; positive does not always mean better.</p><ScientificDetails title="Show numerical mission differences" reveal><div className="terrain-table-scroll"><table className="terrain-table"><thead><tr><th>Quantity / unit</th><th>Original</th><th>Alternative</th><th>Difference</th></tr></thead><tbody>{Object.entries(chosen.differences).map(([key,v])=><tr key={key}><th>{key.replaceAll('_',' ')} / {v.units}</th><td>{number(v.baseline)}</td><td>{number(v.candidate)}</td><td>{number(v.delta)}</td></tr>)}</tbody></table></div></ScientificDetails>
        <div className="two-columns">{[data.baseline,chosen.result].map((r,i)=><div key={i}><h3>{i===0?'Original':'Alternative'} / elapsed mission time</h3>{r&&<NumericalResults result={r}/>}{r?.power && <><BatteryPlot power={r.power} quantity="battery_energy_wh" elapsed/><SourceInfo kind="battery" result={r}/></>}<p className="mono">{r?.request.start_utc} – {r?.request.end_utc}</p><p>At arrival: {r?conditionSamples(r,'sun')[0]?.label||'Sun not calculated':'Sun unavailable'} / {r?conditionSamples(r,'earth')[0]?.label||'Earth not calculated':'Earth unavailable'}</p><details><summary>Sample-supported DTE intervals</summary>{r?.communication?.windows.map((w,j)=><p key={j}>{w.classification} · {w.start_utc} – {w.end_utc} · resolution {w.resolution_s} s</p>)}</details></div>)}</div><details><summary>Traceable metric changes</summary>{chosen.explanations.map(e=><p key={e}>{e}</p>)}</details>
      </section><section className="panel resilience-section"><h2>Constraint evidence</h2><p>{classLabels[chosen.classification]} · only the requirements tested.</p><div className="terrain-table-scroll"><table className="terrain-table"><thead><tr><th>Requirement / units</th><th>Threshold</th><th>Actual</th><th>Evidence</th></tr></thead><tbody>{chosen.constraints.map(c=><tr key={c.constraint_id}><th>{c.constraint_id.replaceAll('_',' ')} / {c.units}</th><td>{number(c.threshold)}</td><td>{number(c.actual)}</td><td>{c.status}<details><summary>Explanation and sources</summary><p>{c.explanation}</p><p>{c.provenance_ids.join(', ')||'No scientific product available'}</p>{c.limitations.map(l=><p key={l}>{l}</p>)}</details></td></tr>)}</tbody></table></div></section>
      <ScientificDetails title="Search provenance and scientific limitations"><section className="panel resilience-section"><h2>Scientific Details</h2>{data.limitations.map(l=><p key={l}>{l}</p>)}<p>No complete thermal model, validated radio-link budget, hazard/descent analysis, propagated terrain uncertainty or mission-safety certification.</p><details><summary>Hardware, provenance, coverage and assumptions</summary>{[data.baseline,chosen.result].map((r,i)=><div key={i}><h3>{i===0?'Original':'Alternative'}</h3><pre>{JSON.stringify(r?{request:r.request,provenance:r.provenance,terrain:r.terrain_visibility?.assumptions,warnings:r.warnings}:chosen.errors,null,2)}</pre></div>)}</details></section></ScientificDetails></>}
    </>}
  </>
}
