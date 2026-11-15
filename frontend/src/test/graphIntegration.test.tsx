import {describe,it,expect} from 'vitest'
import {renderToStaticMarkup} from 'react-dom/server'
import evidence from '../../../docs/validation/sun-earth-audit.json'
import type {ScenarioRequest} from '../types/analysis'
import {parseResult} from '../api/analysis'
import {ElevationPlot} from '../components/ScientificChartPanel'
import {ModelPowerPlot} from '../components/OperationalConditions'
import {BatteryPlot} from '../components/EngineeringPanel'
import {LunarHorizon} from '../components/LunarHorizon'

const source=evidence.locations[0]
const actual=()=>parseResult(structuredClone(source.response),source.request as ScenarioRequest)
describe('actual Site01 graph integration',()=>{
  it('plots every returned geometric sample with exact values and UTC, at a readable scale',()=>{
    const r=actual(),html=renderToStaticMarkup(<ElevationPlot result={r} index={0} onSelect={()=>{}}/>)
    expect((html.match(/data-graph-series=/g)||[])).toHaveLength(50)
    for(const row of r.observations!)for(const body of ['sun','earth'] as const){
      expect(html).toContain(`data-graph-series="${body}_elevation_deg" data-utc="${row.time_utc}" data-value="${row[`${body}_elevation_deg`].value}"`)
    }
    const low=Number(html.match(/data-axis-min="([^"]+)"/)![1]),high=Number(html.match(/data-axis-max="([^"]+)"/)![1])
    expect(high-low).toBeLessThan(12);expect(low).toBeLessThan(0);expect(high).toBeGreaterThan(0)
  })
  it('plots backend generation, demand and stored energy without deriving power from elevation',()=>{
    const power=actual().power!
    for(const quantity of ['solar_generation_w','load_w','battery_energy_wh'] as const){
      const html=renderToStaticMarkup(quantity==='battery_energy_wh'?<BatteryPlot power={power} quantity={quantity}/>:<ModelPowerPlot power={power} quantity={quantity}/>)
      expect((html.match(/data-graph-series=/g)||[])).toHaveLength(50)
      for(const c of power.cases)for(const s of c.samples)expect(html).toContain(`data-graph-series="${c.assumption}.${quantity}" data-utc="${s.time_utc}" data-value="${s[quantity]}"`)
    }
  })
  it('plots the actual native horizon and omits missing samples rather than drawing zeros',()=>{
    const r=actual(),h=r.horizon!,row=r.terrain_visibility!.observations[0]
    const html=renderToStaticMarkup(<LunarHorizon horizon={h} row={row} azimuth={null}/>)
    expect((html.match(/data-graph-series="terrain_horizon_deg"/g)||[])).toHaveLength(h.elevation_deg.filter(v=>v!==null).length)
    const power=r.power!;power.cases[0].samples[3].solar_generation_w=null
    const missing=renderToStaticMarkup(<ModelPowerPlot power={power} quantity="solar_generation_w"/>)
    expect(missing).not.toContain(`data-graph-series="conservative.solar_generation_w" data-utc="${power.cases[0].samples[3].time_utc}"`)
    expect(missing).toContain('data-graph-series="conservative.solar_generation_w" data-utc="2026-11-14T00:00:00Z" data-value="0"')
  })
})
