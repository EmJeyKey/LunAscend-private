import {Link} from 'react-router'
import type {ScenarioResult} from '../types/analysis'
import {sourceCatalog} from '../lib/resources'
import {imageLayers} from '../lib/imagery'
export type SourceKind='sunlight'|'earth'|'power'|'battery'|'terrain'|'images'|'comparison'|'resilience'
const explanations:Record<SourceKind,string>={
  sunlight:'NASA/JPL SPICE calculates the Sun’s direction. When a terrain result is available, LunAscend compares it with a horizon derived from NASA LOLA elevations to estimate obstruction of the Sun’s center.',
  earth:'NASA/JPL SPICE calculates Earth’s direction. LunAscend compares that direction with the LOLA-based terrain horizon and, when requested, the chosen clearance requirement. This is possible access, not a radio-link prediction.',
  power:'LunAscend estimates electrical generation from the returned Sun direction, terrain classifications and the selected panel area, efficiency, orientation and losses. Irradiance and hardware values are user assumptions, not NASA site measurements.',
  battery:'LunAscend models stored energy from its solar-generation estimates, electrical demand, battery capacity, initial charge, reserve and charging/discharging efficiencies. NASA does not produce or approve this battery outcome.',
  terrain:'NASA LOLA provides measured surface elevation. LunAscend uses the selected pinned finite LOLA dataset for local geometry and a sampled terrain-horizon model. Missing or distant terrain remains unknown.',
  images:'These photographs come from the identified LROC WAC/NAC products served by NASA Moon Trek. LOLA elevation and optical photographs are different datasets. Exact image-to-local-DEM registration remains unverified; photographic shadows belong to the acquisition period.',
  comparison:'Each option uses its own returned SPICE/LOLA results and requested LunAscend engineering estimates. Comparisons retain the site, UTC, coverage and hardware assumptions of each option; there is no universal suitability score.',
  resilience:'LunAscend recalculates the selected dates and sites with the existing SPICE, LOLA and engineering models, then checks explicit mission requirements. Missing evidence cannot pass a requirement; hardware assumptions remain visible.',
}
export function SourceInfo({kind,result}:{kind:SourceKind;result?:ScenarioResult|null}) {
  const mock=result?.provider_mode==='mock'&&kind!=='images'
  const ids=kind==='images'?['moon-trek']:kind==='terrain'?['lola']:['spice',...(result?.terrain_visibility?['lola']:[])]
  const selectedTerrain=result?.terrain_visibility?.dataset_id
  const records=sourceCatalog.sources.filter(source=>ids.includes(source.id)&&(source.id!=='lola'||!selectedTerrain||selectedTerrain==='lola-site01-5m-v2020'))
  const terrainSource=result?.provenance.find(p=>p.id==='terrain-dem')
  return <details className="source-info"><summary>NASA DATA &amp; SOURCES</summary>
    {mock?<ul className="mock-warning"><li>MOCK / NOT LUNAR PREDICTIONS. These are deterministic illustrative curves, not NASA measurements, SPICE predictions or terrain calculations.</li></ul>:<><ul><li>{explanations[kind]}</li></ul>{result===null&&<ul><li>No analysis result is displayed yet. This explains the method, not a calculated outcome.</li></ul>}{result&&!result.terrain_visibility&&kind!=='images'&&<ul><li>No terrain-qualified result is present. Sun/Earth elevation alone does not establish terrain clearance.</li></ul>}
      {!records.length&&<ul><li>Source metadata unavailable. No dataset version or provider identity is inferred.</li></ul>}{records.map(source=><div className="source-info-record" key={source.id}><strong>{source.name}</strong><span>{source.organization}</span><ul><li>{source.product_id||'Product identifier unspecified'} · {source.version||'Release unspecified'}</li></ul><ul><li>{source.coordinate_system}</li></ul><ul><li>{source.original_resolution||'Resolution not applicable or unspecified'}</li></ul><ul><li>{source.offline}</li></ul><ul><li>{source.attribution}</li></ul><a href={source.official_url} target="_blank" rel="noopener noreferrer">Original source ↗</a><details><summary>Usage conditions and limitations</summary><ul><li>{source.usage_conditions}</li></ul><ul><li>{source.limitations}</li></ul></details></div>)}
      {kind==='images'&&imageLayers.map(layer=><ul key={layer.id}><li><strong>{layer.product}</strong> · {layer.coverage} · {layer.acquisition}. Delivered finest resolution {layer.levels.at(-1)!.resolution.toFixed(6)} {layer.units}/px; nominal original {layer.nominal_source_m_per_pixel} m/px. {layer.usage}</li></ul>)}
      {selectedTerrain&&selectedTerrain!=='lola-site01-5m-v2020'&&terrainSource&&<div className="source-info-record"><strong>{terrainSource.data_source}</strong><ul><li>{terrainSource.source_version} · {terrainSource.reference_frame}</li></ul><ul className="mono"><li>{selectedTerrain} · {terrainSource.sha256}</li></ul><a href={terrainSource.source_url||undefined} target="_blank" rel="noopener noreferrer">Selected terrain source ↗</a><ul><li>Finite local window. Original Site01 metadata does not describe this dataset. Source-pixel uncertainty is not propagated into visibility or engineering predictions.</li></ul></div>}
      {result&&<ul><li>Result status: {result.status}. Detailed result-specific provenance IDs: {result.provenance.map(p=>p.id).join(', ')||'Unavailable'}.</li></ul>}
    </>}
    <Link to="/methodology#official-resources">Source products, attribution and saved validation</Link>
  </details>
}
