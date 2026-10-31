import { ArrowUpRight, BookOpen, FlaskConical, Layers2, Radio, ShieldCheck, Sun, Telescope } from 'lucide-react'
import { PageHeader, StatusBadge } from '../components/ui'

const topics = [
  { icon: Telescope, number: '01', title: 'Sun/Earth ephemeris geometry', text: 'Ephemeris models describe the positions of the Sun and Earth relative to a lunar observer. The scientific provider uses matched DE440 SPICE kernels, planetocentric east-positive coordinates in MOON_ME_DE440_ME421, and a 1,737,400 m sphere. Heights are explicit. Public angles use geometric correction NONE, without refraction.' },
  { icon: Layers2, number: '02', title: 'Terrain obstruction', text: 'Nearby ridges and distant terrain can obstruct low-elevation directions. A verified elevation model, reference surface and observer height are required before predicting visibility.' },
  { icon: Sun, number: '03', title: 'Illumination and electrical generation', text: 'Electrical generation also depends on panel area, orientation and efficiency. Battery feasibility requires load and energy-balance assumptions. These models are not implemented yet.' },
  { icon: Radio, number: '04', title: 'Line of sight and radio-link performance', text: 'Geometric line of sight does not guarantee reliable communication. Antenna direction, ground-station visibility and a radio link budget add requirements beyond seeing the Earth disk.' },
  { icon: FlaskConical, number: '05', title: 'Preview and unavailable data', text: 'This milestone contains synthetic input locations and original illustrative artwork. Scientific SPICE observations and deterministic mock demonstration curves are selectable explicitly. Mock values are always labeled and never substituted for scientific failures. Missing scientific values are shown as unavailable.' },
  { icon: ShieldCheck, number: '06', title: 'Scientific validation requirements', text: 'Results include source records, assumptions and metric-level validation states. Step 3 executed 36 passing Horizons comparisons over a finite synthetic site/epoch grid. Shared JPL model heritage limits independence; this is not a global physical accuracy claim. Unmatched cases remain unvalidated. Terrain reference checks have not been performed.' },
]

export function Methodology() {
  return <><PageHeader eyebrow="SCIENCE / TRANSPARENCY" title="Scientific Methodology" description="Data sources, modeling assumptions, validation status and limitations."/>
    <section className="methodology-intro panel"><div className="methodology-symbol"><BookOpen size={34} strokeWidth={1.2}/></div><div><StatusBadge tone="gold">Geometry available · terrain pending</StatusBadge><h2>Analysis scope and limitations</h2><p>LunAscend is an educational lunar landing-site and mission-resilience navigator. It is being developed to compare the effects of site selection, timing and engineering constraints, with uncertainty and unavailable data kept visible.</p></div></section>
    <div className="methodology-grid">{topics.map(({ icon: Icon, number, title, text }) => <article className="methodology-card" key={number}><div><Icon size={22} strokeWidth={1.5}/><span>{number}</span></div><h2>{title}</h2><p>{text}</p></article>)}</div>
    <section className="sources-panel panel"><h2>Scientific sources & future terrain inputs</h2><p>SPICE supplies calculated astronomical geometry. Horizons supplies saved comparison references. LOLA/PGDA terrain integration remains a future milestone. The 0° reference is the ideal geometric horizon, not local terrain.</p><div>{[
      ['JPL SPICE', 'https://naif.jpl.nasa.gov/naif/'], ['JPL Horizons', 'https://ssd.jpl.nasa.gov/horizons/'],
      ['NASA / PDS LOLA', 'https://pds-geosciences.wustl.edu/missions/lro/lola.htm'], ['NASA Goddard PGDA', 'https://pgda.gsfc.nasa.gov/'],
    ].map(([label, href]) => <a key={label} href={href} target="_blank" rel="noreferrer">{label}<ArrowUpRight size={14}/></a>)}</div></section>
    <p className="page-footnote">Independent student project. No NASA endorsement is implied. Not flight-qualified mission software.</p>
  </>
}
