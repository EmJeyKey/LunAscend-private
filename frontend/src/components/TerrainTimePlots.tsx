import {useMission} from '../state/MissionContext'
import type {TerrainVisibility} from '../types/analysis'

export function TerrainTimePlot({terrain,target}:{terrain:TerrainVisibility;target:'sun'|'earth'}){
 const rows=terrain.observations
 if(rows.length<2)return <p>No supported terrain timeline.</p>
 const values=rows.flatMap(r=>[r[target].elevation_deg,r[target].horizon_elevation_deg]).filter((v):v is number=>v!==null)
 if(!values.length)return <p>Terrain directions are unavailable.</p>
 const first=Date.parse(rows[0].time_utc),last=Date.parse(rows.at(-1)!.time_utc)
 const low=Math.min(0,...values)-1,high=Math.max(0,...values)+1
 const x=(t:string)=>55+(Date.parse(t)-first)/(last-first)*800,y=(v:number)=>25+(high-v)/(high-low)*170
 return <figure className="model-power-plot"><figcaption><strong>{target==='sun'?'Sun':'Earth'} elevation and terrain horizon over time</strong><span>Native DE421 frame · degrees · UTC</span></figcaption>
 <svg viewBox="0 0 900 250" data-terrain-target={target} data-axis-min={low} data-axis-max={high} role="img" aria-label={`${target} center elevation and modeled terrain horizon against UTC in native DE421`}>
 {[low,0,high].map(v=><g key={v}><line x1="55" x2="855" y1={y(v)} y2={y(v)} className="elevation-grid"/><text x="48" y={y(v)+4} textAnchor="end">{v.toFixed(2)}°</text></g>)}
 {(['elevation_deg','horizon_elevation_deg'] as const).map(field=>{let drawing=false;const path=rows.map(r=>{const v=r[target][field];if(v===null){drawing=false;return ''}const p=`${drawing?'L':'M'}${x(r.time_utc)},${y(v)}`;drawing=true;return p}).join(' ');return <g key={field}><path d={path} className={field==='elevation_deg'?'sun-curve':'earth-curve'}/>{rows.map(r=>r[target][field]===null?null:<circle key={r.time_utc} data-graph-series={`${target}_terrain_${field}`} data-utc={r.time_utc} data-value={r[target][field]} cx={x(r.time_utc)} cy={y(r[target][field]!)} r="2.5" fill={field==='elevation_deg'?'#f2d38b':'#79c7da'}><title>{`${r.time_utc} - ${field}: ${r[target][field]} degrees - ${r[target].classification}`}</title></circle>)}</g>})}
 <text x="55" y="222">{rows[0].time_utc}</text><text x="855" y="243" textAnchor="end">{rows.at(-1)!.time_utc}</text>
 </svg><ul><li>Gold: body center. Dashed cyan: modeled horizon in that direction.</li><li>Gaps are unknown; clearance is conditional on finite terrain coverage.</li></ul></figure>
}
export function TerrainTimePlots(){const {analysis}=useMission();const t=analysis.result?.terrain_visibility;return t?<><TerrainTimePlot terrain={t} target="sun"/><TerrainTimePlot terrain={t} target="earth"/></>:null}
