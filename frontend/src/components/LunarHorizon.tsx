import {useId} from 'react'
import type {TerrainHorizon,TerrainRow} from '../types/analysis'

// Discrete neighboring rays only. Null endpoints never create a segment.
export function horizonSegments(h:TerrainHorizon) {
  return h.azimuth_deg.flatMap((a,i)=>{
    const j=(i+1)%h.azimuth_deg.length,b=h.elevation_deg[i],c=h.elevation_deg[j]
    return b===null||c===null?[]:[{a,b,next:j===0?360:h.azimuth_deg[j],c,partial:h.ray_coverage[i]!=='sampled_radius'||h.ray_coverage[j]!=='sampled_radius'}]
  })
}
export function LunarHorizon({horizon,row,azimuth}:{horizon:TerrainHorizon|null;row:TerrainRow|null|undefined;azimuth:number|null}) {
  const patternId=useId()
  if(!horizon)return <p className="horizon-unavailable">Scientific horizon unavailable. Missing terrain is unknown; no flat horizon is substituted.</p>
  const elevations=[...horizon.elevation_deg,...(row?[row.sun.elevation_deg,row.earth.elevation_deg]:[])].filter((v):v is number=>v!==null)
  const low=Math.floor(Math.min(-1,...elevations))-1,high=Math.ceil(Math.max(1,...elevations))+1
  const x=(a:number)=>55+a/360*800,y=(e:number)=>25+(high-e)/(high-low)*200
  const nearest=horizon.azimuth_deg.reduce((best,a,i)=>{
    const distance=(v:number)=>Math.abs(((v-(azimuth??0)+540)%360)-180)
    return distance(a)<distance(horizon.azimuth_deg[best])?i:best
  },0)
  return <section className="lunar-horizon" aria-label="Native terrain horizon profile">
    <h3>Local horizon · 360°</h3>
    <p>MOON_ME_DE421 · azimuth clockwise from north · observer {horizon.observer_height_m} m above the original DEM.</p>
    <div className="horizon-chart-scroll" role="region" tabIndex={0} aria-label="Scrollable scientific horizon chart"><svg viewBox="0 0 900 280" role="img" aria-label="Finite sampled terrain horizon elevation against azimuth. Solid gold: sampled radius. Dashed gold: known partial lower bounds. Hatched sectors: missing or incomplete data. Gold and cyan points: returned Sun and Earth center directions.">
      <defs><pattern id={patternId} patternUnits="userSpaceOnUse" width="8" height="8"><path d="M0 8L8 0" stroke="#95a3b2" opacity=".25"/></pattern></defs>
      {horizon.ray_coverage.map((coverage,i)=>coverage==='sampled_radius'?null:<rect key={i} x={x(horizon.azimuth_deg[i])} y="25" width={800*horizon.azimuth_step_deg/360} height="200" fill={`url(#${patternId})`}/>)}
      {[low,0,high].map(e=><g key={e}><line x1="55" x2="855" y1={y(e)} y2={y(e)} stroke="#293747"/><text x="48" y={y(e)+4} textAnchor="end">{e}°</text></g>)}
      {[0,90,180,270,360].map((a,i)=><g key={a}><line x1={x(a)} x2={x(a)} y1="25" y2="225" stroke="#293747"/><text x={x(a)} y="246" textAnchor="middle">{['N 0°','E 90°','S 180°','W 270°','N 360°'][i]}</text></g>)}
      {horizonSegments(horizon).map((s,i)=><line key={i} x1={x(s.a)} y1={y(s.b)} x2={x(s.next)} y2={y(s.c)} stroke="#d6ad70" strokeWidth="2" strokeDasharray={s.partial?'3 4':undefined}/>)}
      {azimuth!==null&&<line x1={x(azimuth)} x2={x(azimuth)} y1="25" y2="225" stroke="#f0eee9" strokeDasharray="5 4"/>}
      {row&&(['sun','earth'] as const).map(body=>{const b=row[body];return b.azimuth_deg===null||b.elevation_deg===null?null:<g key={body} fill={body==='sun'?'#e9b968':'#7bbfd0'}><circle cx={x(b.azimuth_deg)} cy={y(b.elevation_deg)} r="4"/><text x={x(b.azimuth_deg)+7} y={y(b.elevation_deg)-8}>{body==='sun'?'Sun':'Earth'}</text></g>})}
      <text x="55" y="14">Terrain horizon elevation / °</text><text x="455" y="273" textAnchor="middle">Azimuth / °{azimuth!==null?' · white dashed line = camera bearing':''}</text>
    </svg></div>
    <p>Solid gold: evaluated radius · dashed: known partial lower bounds · hatching: incomplete sectors. Gaps are not joined. Straight segments only connect neighboring known samples; terrain between rays remains unresolved.</p>
    <p className="mono">{azimuth===null?'Reference':'Nearest camera'} ray {horizon.azimuth_deg[nearest].toFixed(2)}° · horizon {horizon.elevation_deg[nearest]?.toFixed(3)??'Unknown'}° · {horizon.ray_coverage[nearest].replaceAll('_',' ')} · defining range {horizon.obstruction_distance_m?.[nearest]?.toFixed(1)??'Unknown'} m · first missing range: {horizon.first_missing_distance_m?.[nearest]===undefined?'Unknown':horizon.first_missing_distance_m[nearest]===null?'None within sampled radius':`${horizon.first_missing_distance_m[nearest]!.toFixed(1)} m`}.</p>
    <p>Search radius {horizon.max_search_radius_m} m · radial step {horizon.radial_step_m} m · azimuth step {horizon.azimuth_step_deg}°. All horizons are globally partial. Positive clearance is conditional; the body’s disk, distant terrain and DEM uncertainty remain unresolved.</p>
  </section>
}
