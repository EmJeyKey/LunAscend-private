import { useEffect } from 'react'
import { useLocation } from 'react-router'
import { BookOpen, FlaskConical, Layers2, Radio, ShieldCheck, Sun, Telescope } from 'lucide-react'
import { PageHeader, StatusBadge } from '../components/ui'
import { OfficialResources, HorizonsEvidence, LocalScientificSources } from '../components/OfficialResources'
import {ScientificDetails} from '../components/PresentationControls'
import {SourceInfo} from '../components/SourceInfo'

const topics = [
  { icon: Telescope, number: '01', title: 'Sun/Earth ephemeris geometry', text: 'Ephemeris models describe the positions of the Sun and Earth relative to a lunar observer. The scientific provider uses matched DE440 SPICE kernels, planetocentric east-positive coordinates in MOON_ME_DE440_ME421, and a 1,737,400 m sphere. Heights are explicit. Public angles use geometric correction NONE, without refraction.' },
  { icon: Layers2, number: '02', title: 'Terrain obstruction', text: 'Nearby ridges and distant terrain can obstruct low-elevation directions. Optional NASA LOLA Site01 analysis uses a curvature-aware finite horizon, DEM surface height plus observer height, exact per-epoch DE421/DE440 rotations, and circular-linear azimuth interpolation. Center clearance equals body elevation minus the modeled horizon. Known obstruction, conditional clearance, indeterminate and unavailable states remain distinct. Interpolated horizons can miss narrow ridges. Operational intervals and crossings are approximate sampled estimates, not continuous guarantees or full-disk visibility.' },
  { icon: Sun, number: '03', title: 'Illumination and electrical generation', text: 'Electrical generation also depends on panel area, orientation and efficiency. Battery feasibility requires load and energy-balance assumptions. Optional fixed-horizontal or ideal-tracking PV and battery energy-balance cases use explicit nominal irradiance, loads, efficiencies, reserve and capacity assumptions. Conservative and optimistic illumination scenarios are not guaranteed bounds. Unknown intervals withhold full-period battery results.' },
  { icon: Radio, number: '04', title: 'Line of sight and radio-link performance', text: 'Geometric line of sight does not guarantee reliable communication. Antenna direction, ground-station visibility and a radio link budget add requirements beyond seeing the Earth disk. Optional DTE access compares center clearance with an equipment margin, keeps unknown intervals separate and does not calculate a link budget.' },
  { icon: FlaskConical, number: '05', title: 'Preview and unavailable data', text: 'The selectable example locations are synthetic. The global globe is context only; the local viewer uses original NASA LOLA terrain only where supported. Scientific SPICE observations and deterministic mock demonstration curves are selectable explicitly. Mock values are always labeled and never substituted for scientific failures. Missing scientific values are shown as unavailable.' },
  { icon: ShieldCheck, number: '06', title: 'Scientific validation requirements', text: 'Results include source records, assumptions and metric-level validation states. The saved Horizons evidence below reports the executed comparisons over a finite synthetic site/epoch grid. Shared JPL model heritage limits independence; this is not a global physical accuracy claim. Unmatched cases remain unvalidated. Terrain obstruction and browser lighting remain independently unvalidated.' },
]

export function Methodology() {
  const { hash } = useLocation()
  useEffect(() => {
    const id = hash.slice(1)
    if (!['official-resources', 'horizons-validation'].includes(id)) return
    const frame = requestAnimationFrame(() => {const target=document.getElementById(id);const details=target?.closest('details');if(details)details.open=true;target?.scrollIntoView({ block: 'start' })})
    return () => cancelAnimationFrame(frame)
  }, [hash])
  return <><PageHeader eyebrow="SCIENCE / TRANSPARENCY" title="How LunAscend Works" description="NASA supplies source data and scientific software. LunAscend combines them with your mission assumptions to explore possible conditions."/>
    <section className="methodology-intro panel"><div className="methodology-symbol"><BookOpen size={34} strokeWidth={1.2}/></div><div><StatusBadge tone="gold">Geometry and finite terrain center model</StatusBadge><h2>Analysis scope and limitations</h2><p>LunAscend is an educational lunar landing-site and mission-resilience navigator. It is being developed to compare the effects of site selection, timing and engineering constraints, with uncertainty and unavailable data kept visible.</p></div></section>
    <section className="panel how-it-works"><h2>From source data to a mission estimate</h2><ol><li><strong>Locate the Sun and Earth.</strong> NASA/JPL SPICE astronomical models calculate their directions at the requested UTC times.</li><li><strong>Read measured terrain heights.</strong> NASA LOLA elevation data describe the available local surface. The installed DEM covers a finite region around Site01.</li><li><strong>Estimate terrain obstruction.</strong> LunAscend compares each direction with a horizon derived from those heights. Missing and more distant terrain remain unknown.</li><li><strong>Estimate electrical conditions.</strong> LunAscend models solar power and battery energy using your panels, loads, capacity, reserve and efficiencies. These are derived estimates, not NASA survival conclusions.</li><li><strong>Compare plans and delays.</strong> The same models evaluate selected locations and dates against explicit requirements, without a universal landing score.</li><li><strong>Inspect real photographs.</strong> LROC WAC/NAC optical products show surface detail where available. Photos are separate from LOLA heights; their historical shadows are not current illumination predictions.</li></ol>
      <p>Seeing Earth means possible direct access, not a proven radio link. A promising battery case is conditional, not a spacecraft-survival guarantee. Unknown information cannot count as success.</p><p>Saved JPL Horizons comparisons check a separate implementation with shared JPL model heritage. They are not fully independent observational validation or a global accuracy claim.</p>
    </section>
    <OfficialResources/>
    <SourceInfo kind="images"/>
    <ScientificDetails title="Scientific Methodology: models, measurements and validation"><HorizonsEvidence/><LocalScientificSources/>
    <div className="methodology-grid">{topics.map(({ icon: Icon, number, title, text }) => <article className="methodology-card" key={number}><div><Icon size={22} strokeWidth={1.5}/><span>{number}</span></div><h2>{title}</h2><p>{text}</p></article>)}</div>
    </ScientificDetails><p className="page-footnote">Independent student project. No NASA, JPL, ASU, CSA or resource-provider endorsement is implied. Not flight-qualified mission software.</p>
  </>
}
