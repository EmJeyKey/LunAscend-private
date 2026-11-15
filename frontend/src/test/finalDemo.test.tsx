import {describe,it,expect,vi} from 'vitest'
import {renderToStaticMarkup} from 'react-dom/server'
import {MemoryRouter} from 'react-router'
import evidence from '../../../docs/validation/sun-earth-audit.json'
import {parseResult} from '../api/analysis'
import type {ScenarioRequest,ScenarioResult} from '../types/analysis'
import {MissionResults} from '../components/MissionResults'
import {MissionControls} from '../components/MissionControls'
import {TerrainTimePlot} from '../components/TerrainTimePlots'
import {initialOptions} from '../lib/analysis'
const current=vi.hoisted(()=>({result:null as ScenarioResult|null,index:0}))
vi.mock('../state/MissionContext',()=>({useMission:()=>({mission:{site:{id:'site01',name:'Site01',latitude:-89.46315760953222,longitude:-137.50097847854008},startUtc:'2026-11-14T00:00:00Z',durationHours:24},analysis:{status:current.result?'success':'idle',result:current.result},sampleIndex:current.index,selectSample:vi.fn(),options:initialOptions,updateOptions:vi.fn(),updateMission:vi.fn(),invalidate:vi.fn()})}))
const actual=()=>parseResult(structuredClone(evidence.locations[0].response),evidence.locations[0].request as ScenarioRequest)
describe('final demonstration presentation',()=>{
 it('offers one complete analysis action and collapsed technical settings',()=>{
  const html=renderToStaticMarkup(<MemoryRouter><MissionControls/></MemoryRouter>)
  expect(html.match(/type="submit"/g)).toHaveLength(1)
  expect(html).toContain('Run Complete Mission Analysis');expect(html).not.toContain('Run Full Analysis')
  expect(html).toContain('<details class="analysis-settings">')
 })
 it('keeps actual Site01 power failure distinct from conditional sunlight and landing suitability',()=>{
  current.result=actual();const html=renderToStaticMarkup(<MemoryRouter><MissionResults report={null} error=""/></MemoryRouter>)
  expect(html).toContain('Sun potentially available');expect(html).toContain('Earth blocked');expect(html).toContain('Not enough electricity')
  expect(html).toContain('Terrain suitability not evaluated');expect(html).not.toContain('Safe to land')
  expect(html.match(/<article>/g)).toHaveLength(4)
 })
 it('preserves all native terrain timeline values without mixing geometric frames',()=>{
  const terrain=actual().terrain_visibility!
  for(const target of ['sun','earth'] as const){const html=renderToStaticMarkup(<TerrainTimePlot terrain={terrain} target={target}/>)
   expect(html.match(/data-graph-series=/g)).toHaveLength(50)
   for(const r of terrain.observations)expect(html).toContain(`data-graph-series="${target}_terrain_horizon_elevation_deg" data-utc="${r.time_utc}" data-value="${r[target].horizon_elevation_deg}"`)
  }
 })
 it('accepts independently failed engineering products only with explicit partial-error evidence',()=>{
  const raw=structuredClone(evidence.locations[0].response) as unknown as ScenarioResult
  raw.power=null;raw.errors=[{code:'CALCULATION_FAILED',module:'power',message:'Power failed; geometry retained',field:null,recoverable:true,details:{}}]
  expect(parseResult(raw,evidence.locations[0].request as ScenarioRequest).communication).not.toBeNull()
  raw.errors=[];expect(()=>parseResult(raw,evidence.locations[0].request as ScenarioRequest)).toThrow()
 })
})
