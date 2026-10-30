import { ArrowUpRight, BookOpen, FlaskConical, Layers2, Radio, ShieldCheck, Sun, Telescope } from 'lucide-react'
import { PageHeader, StatusBadge } from '../components/ui'

const topics = [
  { icon: Telescope, number: '01', title: 'Geometry gives us direction.', text: 'Ephemeris models describe the positions of the Sun and Earth relative to a lunar observer. Future calculations will state their lunar frame, time scale and geometric or apparent-position convention.' },
  { icon: Layers2, number: '02', title: 'The local horizon matters.', text: 'Nearby ridges and distant terrain can obstruct low-elevation directions. A verified elevation model, reference surface and observer height are required before predicting visibility.' },
  { icon: Sun, number: '03', title: 'Sunlight is an input, not a power budget.', text: 'Electrical generation also depends on panel area, orientation and efficiency. Battery feasibility requires load and energy-balance assumptions. These models are not implemented yet.' },
  { icon: Radio, number: '04', title: 'Seeing Earth is only the beginning.', text: 'Geometric line of sight does not guarantee reliable communication. Antenna direction, ground-station visibility and a radio link budget add requirements beyond seeing the Earth disk.' },
  { icon: FlaskConical, number: '05', title: 'A preview is never a prediction.', text: 'This milestone contains synthetic input locations and original illustrative artwork. No mock analysis generator or NASA-derived result is active. Missing scientific values are shown as unavailable.' },
  { icon: ShieldCheck, number: '06', title: 'Validation needs executed evidence.', text: 'Future results will include provenance, assumptions and a validation state. Planned JPL Horizons comparisons and terrain reference checks have not yet been performed. Passing software tests is not scientific validation.' },
]

export function Methodology() {
  return <><PageHeader eyebrow="SCIENCE / TRANSPARENCY" title="Built on evidence." description="A useful mission tool makes its methods as clear as its results."/>
    <section className="methodology-intro panel"><div className="methodology-symbol"><BookOpen size={34} strokeWidth={1.2}/></div><div><StatusBadge tone="gold">Scientific models not yet active</StatusBadge><h2>Understand the conditions.<br/>Make the trade-offs visible.</h2><p>LunAscend is an educational lunar landing-site and mission-resilience navigator. It is being developed to compare the effects of site selection, timing and engineering constraints, with uncertainty and unavailable data kept visible.</p></div></section>
    <div className="methodology-grid">{topics.map(({ icon: Icon, number, title, text }) => <article className="methodology-card" key={number}><div><Icon size={22} strokeWidth={1.5}/><span>{number}</span></div><h2>{title}</h2><p>{text}</p></article>)}</div>
    <section className="sources-panel panel"><h2>Planned scientific sources</h2><p>No scientific datasets have been downloaded for this preview.</p><div>{[
      ['JPL SPICE', 'https://naif.jpl.nasa.gov/naif/'], ['JPL Horizons', 'https://ssd.jpl.nasa.gov/horizons/'],
      ['NASA / PDS LOLA', 'https://pds-geosciences.wustl.edu/missions/lro/lola.htm'], ['NASA Goddard PGDA', 'https://pgda.gsfc.nasa.gov/'],
    ].map(([label, href]) => <a key={label} href={href} target="_blank" rel="noreferrer">{label}<ArrowUpRight size={14}/></a>)}</div></section>
    <p className="page-footnote">Independent student project. No NASA endorsement is implied. Not flight-qualified mission software.</p>
  </>
}
