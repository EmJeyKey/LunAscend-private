export interface CompassBody {azimuth:number|null;elevation:number|null}

/** A local bearing inset, deliberately independent of the map/camera orientation. */
export function DirectionCompass({sun,earth,frame}:{sun:CompassBody;earth:CompassBody;frame:string}) {
  return <aside className="direction-compass" aria-label="Calculated Sun and Earth bearing vectors">
    <strong>Local directions · N ↑</strong>
    <svg viewBox="0 0 180 150" role="img" aria-label="Local compass, north up and east right. Arrows show returned azimuth, not distance or elevation.">
      <circle cx="90" cy="76" r="51" fill="none" stroke="#95a3b2" opacity=".4"/>
      <path d="M90 20V132M34 76H146" stroke="#95a3b2" opacity=".3"/>
      <g fill="#f0eee9" fontSize="11" textAnchor="middle"><text x="90" y="14">N</text><text x="156" y="80">E</text><text x="90" y="145">S</text><text x="23" y="80">W</text></g>
      {([['Sun',sun,'#f2d38b',46],['Earth',earth,'#7bbfd0',36]] as const).map(([name,body,color,length])=>{
        if(body.azimuth==null||body.elevation==null)return null
        const angle=body.azimuth*Math.PI/180,x=90+length*Math.sin(angle),y=76-length*Math.cos(angle)
        return <g key={name} stroke={color} fill={color} strokeWidth="3" aria-label={`${name} azimuth ${body.azimuth.toFixed(2)} degrees, elevation ${body.elevation.toFixed(2)} degrees`}>
          <path d={`M90 76L${x} ${y}`} fill="none"/>
          <path d="M-5 8L0 0L5 8" transform={`translate(${x} ${y}) rotate(${body.azimuth})`} fill="none"/>
        </g>
      })}
      <circle cx="90" cy="76" r="3" fill="#f0eee9"/>
    </svg>
    {([['Sun',sun],['Earth',earth]] as const).map(([name,body])=><span key={name} className={`viewer-${name.toLowerCase()}`}>{name}: {body.azimuth==null||body.elevation==null?'Run analysis / direction unavailable':`az ${body.azimuth.toFixed(2)}° · el ${body.elevation.toFixed(2)}°`}</span>)}
    <small>{frame} · local bearings, not map axes. Not a visibility or radio-link result.</small>
  </aside>
}
