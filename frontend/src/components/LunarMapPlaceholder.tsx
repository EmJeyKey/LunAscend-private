import { Crosshair, Expand, Layers2, MapPin } from 'lucide-react'
import { useId, useState } from 'react'
import { Link } from 'react-router'
import { artworkCraters, contourPath } from '../data/illustration'
import { formatCoordinate } from '../lib/time'
import { useMission } from '../state/MissionContext'
import { PanelHeader, StatusBadge } from './ui'

export function LunarMapPlaceholder({ large = false }: { large?: boolean }) {
  const { mission } = useMission()
  const [grid, setGrid] = useState(true)
  const [contours, setContours] = useState(true)
  const [view, setView] = useState<'globe' | 'surface'>('globe')
  const uid = useId().replace(/:/g, '')
  const id = (name: string) => `${uid}-${name}`
  return <section className={`panel lunar-panel ${large ? 'large' : ''}`}>
    <PanelHeader icon={MapPin} title="Lunar site overview" action={<StatusBadge>Illustration</StatusBadge>} />
    <div className="atlas-view-switch" aria-label="Illustration presentation"><button aria-pressed={view === 'globe'} onClick={() => setView('globe')}>Lunar globe</button><button aria-pressed={view === 'surface'} onClick={() => setView('surface')}>Surface study</button><span>Artistic lighting · orientation unregistered</span></div>
    <div className={`lunar-art ${view}-view`}>
      <svg viewBox="0 0 1000 560" preserveAspectRatio={view === 'globe' ? 'xMidYMid meet' : 'xMidYMid slice'} role="img" aria-label="Schematic Moon with artistic lighting. Craters and marker are illustrative, without geographic registration or calculated Sun and Earth positions.">
        <defs>
          <clipPath id={id('disk')}><circle cx="500" cy="280" r="244"/></clipPath>
          <radialGradient id={id('globeShade')} cx="27%" cy="22%" r="85%"><stop stopColor="#f0eee9" stopOpacity=".19"/><stop offset=".45" stopColor="#080d15" stopOpacity="0"/><stop offset=".82" stopColor="#080d15" stopOpacity=".58"/><stop offset="1" stopColor="#02050a" stopOpacity=".98"/></radialGradient>
          <linearGradient id={id('base')} x2="1" y2="1"><stop stopColor="#28323d"/><stop offset=".55" stopColor="#151d27"/><stop offset="1" stopColor="#0b1119"/></linearGradient>
          <radialGradient id={id('crater')} cx="30%" cy="28%"><stop stopColor="#101821"/><stop offset=".54" stopColor="#121a23"/><stop offset=".76" stopColor="#202b36"/><stop offset=".86" stopColor="#46515a"/><stop offset=".92" stopColor="#29343e"/><stop offset="1" stopColor="#19232d" stopOpacity="0"/></radialGradient>
          <linearGradient id={id('rim')} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#b7b9b0" stopOpacity=".62"/><stop offset=".45" stopColor="#75818a" stopOpacity=".26"/><stop offset="1" stopColor="#111924" stopOpacity=".08"/></linearGradient>
          <pattern id={id('grid')} width="80" height="80" patternUnits="userSpaceOnUse" patternTransform="rotate(-18)"><path d="M80 0H0V80" fill="none" stroke="#96b7c3" strokeWidth=".7" opacity=".18"/></pattern>
          <filter id={id('grain')}><feTurbulence type="fractalNoise" baseFrequency=".6" numOctaves="3" stitchTiles="stitch" seed="8"/><feColorMatrix type="saturate" values="0"/></filter>
          <radialGradient id={id('vignette')}><stop offset=".35" stopColor="#0b1119" stopOpacity="0"/><stop offset="1" stopColor="#0b1119" stopOpacity=".75"/></radialGradient>
        </defs>
        <g clipPath={view === 'globe' ? `url(#${id('disk')})` : undefined}>
        <rect width="1000" height="560" fill={`url(#${id('base')})`}/>
        <g fill="none" stroke="#62717a" strokeWidth="1" opacity=".18">{Array.from({ length: 16 }, (_, i) => <path key={i} d={`M-70 ${i * 46} C180 ${i * 36 - 120},250 ${i * 45 + 80},520 ${i * 37} S800 ${i * 44 - 130},1100 ${i * 47 - 90}`}/>)}</g>
        {artworkCraters.map((crater, index) => <g key={index} transform={`translate(${crater.x} ${crater.y}) rotate(${crater.angle}) scale(1 ${crater.squash})`}>
          <circle r={crater.r * 1.25} fill={`url(#${id('crater')})`}/>
          <path d={contourPath(crater.r * .88, index)} fill="#151d27" fillOpacity=".35" stroke={`url(#${id('rim')})`} strokeWidth="7"/>
          {contours && Array.from({ length: 12 }, (_, ring) => <path key={ring} d={contourPath(crater.r * (.42 + ring * .065), ring * .3 + index)} fill="none" stroke={`url(#${id('rim')})`} opacity={ring > 8 ? .48 : .72} strokeWidth={ring === 7 ? 2 : 1}/>)}
          <path d={`M${-crater.r * .4},${-crater.r * .25} Q0,${-crater.r * .6} ${crater.r * .55},0`} fill="none" stroke="#7d878a" opacity=".15" strokeWidth="2"/>
        </g>)}
        <rect width="1000" height="560" filter={`url(#${id('grain')})`} opacity=".045"/>
        {grid && <rect width="1000" height="560" fill={`url(#${id('grid')})`}/>}
        <rect width="1000" height="560" fill={`url(#${id('vignette')})`}/>
        {view === 'globe' && <circle cx="500" cy="280" r="244" fill={`url(#${id('globeShade')})`}/>}
        <g transform="translate(505 205)"><path d="M-80 0H80M0-80V80" stroke="#f2d38b" opacity=".3" strokeDasharray="3 6"/><circle r="25" stroke="#ffe3a1" fill="none" opacity=".22"/><circle r="11" stroke="#ffe3a1" fill="#f6db9b" fillOpacity=".12"/><circle r="3.5" fill="#fff0bf"/><path d="M18-18 48-48H150" fill="none" stroke="#ffe3a1" strokeWidth="1" opacity=".7"/><text x="57" y="-59" fill="#fff1ce" fontSize="11" fontFamily="monospace" letterSpacing="2">PREVIEW MARKER</text></g>
        </g>
        {view === 'globe' && <circle cx="500" cy="280" r="244" fill="none" stroke="#c2c4bc" strokeOpacity=".32" strokeWidth="1"/>}
      </svg>
      <div className="art-caption"><span className="eyebrow">{view === 'globe' ? 'SCHEMATIC MOON' : 'SURFACE CONCEPT'}</span><span>No mapped hemisphere</span></div>
      <div className="map-tools"><button className={grid ? 'active' : ''} aria-pressed={grid} aria-label="Toggle illustrative grid" onClick={() => setGrid(!grid)}><Crosshair size={17}/></button><button className={contours ? 'active' : ''} aria-pressed={contours} aria-label="Toggle illustrative contours" onClick={() => setContours(!contours)}><Layers2 size={17}/></button>{!large && <Link to="/sites" aria-label="Open Lunar Site Explorer"><Expand size={17}/></Link>}</div>
      <div className="map-site-label"><span className="location-cross">+</span><div><strong>{mission.site.name}</strong><p>Input location · symbolic marker</p></div></div>
      <div className="map-art-label">ILLUSTRATIVE SURFACE<br/><span>NOT GEOREFERENCED · NO TERRAIN DATA</span></div>
    </div>
    <div className="map-footer"><span><MapPin size={13}/>{formatCoordinate(mission.site.latitude, true)}<i>/</i>{formatCoordinate(mission.site.longitude, false)}</span><span>Input coordinates only</span></div>
  </section>
}
