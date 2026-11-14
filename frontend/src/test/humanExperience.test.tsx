import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest'
import {renderToStaticMarkup} from 'react-dom/server'
import {MemoryRouter} from 'react-router'
import type {ReactNode} from 'react'
import evidence from '../../../docs/validation/step-8-results.json'
import geometry from '../../../docs/validation/step-3-example-result.json'
import search from '../../../docs/validation/step-9-results.json'
import mockFixture from './fixtures/mock-result.json'
import {parseResult} from '../api/analysis'
import {initialOptions} from '../lib/analysis'
import {analysisProblem,comparisonExplanation,conditionLabel,conditionSamples,glossary,opportunityExplanation,powerOutcome} from '../lib/humanize'
import {ModelPowerPlot,OperationalConditions,SampleTimeline,SimpleEngineering} from '../components/OperationalConditions'
import {FriendlyComparison} from '../components/FriendlyComparison'
import {SourceInfo} from '../components/SourceInfo'
import {Glossary,PresentationControls,ScientificDetails} from '../components/PresentationControls'
import {PresentationProvider,type PresentationMode} from '../state/PresentationContext'
import type {ScenarioRequest} from '../types/analysis'
import type {ComparisonScenario} from '../state/ComparisonStore'
import type {Opportunity} from '../types/resilience'
import {sourceCatalog} from '../lib/resources'

const current=vi.hoisted(()=>({result:null as unknown,status:'idle',message:'',index:0,cleared:false,select:vi.fn()}))
vi.mock('../state/MissionContext',()=>({useMission:()=>({analysis:{result:current.result,status:current.status,message:current.message},sampleIndex:current.index,resultsCleared:current.cleared,selectSample:current.select})}))
const actual=()=>parseResult(structuredClone(evidence.result),evidence.result.request as ScenarioRequest)
const render=(node:ReactNode,mode:PresentationMode='simple')=>renderToStaticMarkup(<MemoryRouter><PresentationProvider initialMode={mode}>{node}</PresentationProvider></MemoryRouter>)
beforeEach(()=>{current.result=null;current.status='idle';current.message='';current.index=0;current.cleared=false})
afterEach(()=>{vi.unstubAllGlobals();vi.clearAllMocks()})

describe('plain-language statuses preserve authoritative scientific meaning',()=>{
  it('uses actual Site01 terrain classifications and returned UTC, without converting angles to power or signal strength',()=>{
    const result=actual(),sun=conditionSamples(result,'sun'),earth=conditionSamples(result,'earth')
    expect(sun).toHaveLength(result.observations!.length)
    expect(sun[0].state).toBe('potential');expect(sun[0].label).toBe('Sun potentially available within modeled coverage')
    expect(earth[0].state).toBe('blocked');expect(earth[0].label).toBe('Earth center blocked by modeled terrain')
    expect(sun.map(s=>s.timeUtc)).toEqual(result.observations!.map(s=>s.time_utc))
    expect(result.terrain_visibility!.observations[0].sun.clearance_deg).toBeCloseTo(6.114,3)
    expect(result.terrain_visibility!.observations[0].earth.clearance_deg).toBeCloseTo(-6.017,3)
    expect(JSON.stringify(sun)).not.toMatch(/signal strength|irradiance|guaranteed sunlight/)
  })
  it('does not infer terrain visibility from positive geometric Sun/Earth elevations',()=>{
    const result=parseResult(structuredClone(geometry),geometry.request as ScenarioRequest)
    expect(conditionSamples(result,'sun').every(s=>s.state==='not_calculated')).toBe(true)
    expect(conditionSamples(result,'earth').every(s=>s.state==='not_calculated')).toBe(true)
  })
  it('distinguishes unknown terrain, required clearance and possible access without interpolating missing timestamps',()=>{
    const result=actual(),time=result.observations![0].time_utc
    // In-memory presentation cases, never edited scientific reference evidence.
    result.terrain_visibility!.observations[0].sun.classification='indeterminate'
    expect(conditionSamples(result,'sun')[0].state).toBe('unknown')
    result.communication!.access_samples[0].classification='below_clearance_requirement'
    expect(conditionSamples(result,'earth')[0].label).toContain('does not meet your clearance requirement')
    result.communication!.access_samples[0].classification='conditional_access'
    expect(conditionSamples(result,'earth')[0].label).toBe('Potential direct Earth access')
    result.terrain_visibility!.observations=result.terrain_visibility!.observations.filter(s=>s.time_utc!==time)
    expect(conditionSamples(result,'sun')[0].state).toBe('unknown')
  })
  it('labels all mock samples as illustrative and never as NASA scientific predictions',()=>{
    const result=parseResult(structuredClone(mockFixture),mockFixture.request as ScenarioRequest)
    expect(conditionSamples(result,'sun').every(s=>s.state==='mock')).toBe(true)
    const html=render(<SourceInfo kind="sunlight" result={result}/>)
    expect(html).toContain('MOCK / NOT LUNAR PREDICTIONS');expect(html).toContain('not NASA measurements')
    expect(html).not.toContain('source-info-record')
    expect(conditionLabel('unknown','sun')).not.toContain('blocked')
    current.result=result
    const presentation=render(<OperationalConditions/>)
    expect(presentation).toContain('demonstration samples do not use SPICE or NASA terrain')
    expect(presentation).not.toContain('Sun and Earth are tested against the modeled local terrain')
  })
  it('preserves all sampled states and labels time gaps instead of inventing visibility transitions',()=>{
    const rows=conditionSamples(actual(),'sun'),html=render(<SampleTimeline title="Sunlight availability" rows={rows} index={2} onSelect={vi.fn()}/>)
    expect((html.match(/class="sample-mark /g)||[])).toHaveLength(rows.length)
    expect(html).toContain(rows[2].timeUtc.replace('T',' ').replace('Z',' UTC'))
    expect(html).toContain('not a continuous visibility window');expect(html).toContain('Unknown');expect(html).toContain('Not calculated')
  })
})

describe('quantitative engineering presentation uses returned electrical values',()=>{
  it('draws genuine generation watts and preserves the configured model outcomes and energy accounting',()=>{
    const result=actual(),before=JSON.stringify(result),html=render(<SimpleEngineering power={result.power!} index={0}/>)
    expect(html).toContain('Estimated solar power (W)');expect(html).toContain('Modeled stored battery energy (Wh)')
    expect(html).toContain('14698.80 Wh');expect(html).toContain('772.50 Wh')
    expect(html).toContain('Only the optimistic case meets the configured battery model')
    expect(html).toContain('Neither case guarantees spacecraft survival')
    expect(html).toContain(String(result.power!.cases[1].samples[0].solar_generation_w))
    expect(JSON.stringify(result)).toBe(before)
  })
  it('breaks quantitative curves at unknown samples and shows an explicit unavailable state when all values are missing',()=>{
    const power=actual().power!
    // Synthetic missing-data presentation fixture; no saved NASA result is changed.
    power.cases=power.cases.slice(0,1);power.cases[0].samples=power.cases[0].samples.slice(0,3)
    power.cases[0].samples[1].solar_generation_w=null
    const html=render(<ModelPowerPlot power={power} quantity="solar_generation_w"/>)
    const path=html.match(/<path d="([^"]*)" class="model-power-path/)! [1]
    expect((path.match(/M/g)||[])).toHaveLength(2);expect(path).not.toContain('L')
    power.cases[0].samples.forEach(s=>{s.solar_generation_w=null})
    const unavailable=render(<ModelPowerPlot power={power} quantity="solar_generation_w"/>)
    expect(unavailable).toContain('Missing values are not zero');expect(unavailable).not.toContain('<svg')
  })
  it('does not call optimistic-only success guaranteed survival or NASA approval',()=>{
    expect(powerOutcome(actual().power!)).toContain('Only the optimistic')
    const result=actual();result.power!.outcome='indeterminate'
    expect(powerOutcome(result.power!)).toContain('Not enough information')
    const html=render(<SourceInfo kind="battery" result={result}/>)
    expect(html).toContain('NASA does not produce or approve this battery outcome')
  })
})

describe('shared presentation, empty states, provenance and comparisons',()=>{
  it('defaults to Simple view and opens original technical content in Advanced view without changing data',()=>{
    const node=<><PresentationControls/><ScientificDetails><p>Original measurements preserved</p></ScientificDetails></>
    const simple=render(node),advanced=render(node,'advanced')
    expect(simple).toContain('aria-pressed="true">Simple view')
    expect(simple).toContain('Original measurements preserved');expect(simple).not.toMatch(/class="scientific-details" open/)
    expect(advanced).toContain('aria-pressed="true">Advanced view');expect(advanced).toMatch(/class="scientific-details" open/)
  })
  it.each([
    ['idle','',false,'No analysis yet.'],['loading','',false,'Calculating this mission'],['error','Failed to fetch',false,'scientific analysis service is currently unavailable'],['idle','',true,'previous results cleared'],['error','MISSING_DATA: NASA terrain absent',false,'not have enough terrain data'],
  ])('explains %s / %s without fabricating plots', (status,message,cleared,expected)=>{
    current.status=status;current.message=message;current.cleared=cleared
    const html=render(<OperationalConditions/>)
    expect(html).toContain(expected);expect(html).not.toContain('model-power-path');expect(html).not.toContain('sample-mark')
    if(status!=='loading')expect(html).toContain('form="mission-analysis-form"')
  })
  it('synchronizes at-this-moment values to the exact selected UTC sample',()=>{
    const result=actual();current.result=result;current.status='success';current.index=4
    const html=render(<OperationalConditions/>),sample=result.power!.cases[1].samples[4]
    expect(html).toContain(result.observations![4].time_utc.replace('T',' ').replace('Z',' UTC'))
    expect(html).toContain(sample.solar_generation_w!.toFixed(2)+' W')
    expect(html).toContain('Select calculated mission time');expect(html).toContain('value="4"')
    expect(html).toContain('Where does this data come from?');expect(html).toContain('not guaranteed radio communication')
  })
  it('withholds a solar-power curve when no power analysis exists and preserves partial/missing states',()=>{
    const result=actual();result.power=null;current.result=result
    const html=render(<OperationalConditions/>)
    expect(html).toContain('Power and battery were not calculated');expect(html).not.toContain('model-power-path')
    result.observations=null;result.status='unavailable'
    expect(render(<OperationalConditions/>)).toContain('No scientific observations available')
  })
  it('compares actual supported values only and explains different assumptions and unknown constraints',()=>{
    const baseline=actual(),other=actual()
    other.power!.cases[1].totals.solar_generated_wh!+=100
    expect(comparisonExplanation(baseline,other).join(' ')).toContain('100.00 Wh higher optimistic')
    other.power!.configuration.battery_capacity_wh=1000
    expect(comparisonExplanation(baseline,other).join(' ')).toContain('Hardware assumptions differ')
    other.provider_mode='mock';expect(comparisonExplanation(baseline,other)[0]).toContain('cannot be compared')
    const unknown=search.response.opportunities[4] as unknown as Opportunity
    const explanation=opportunityExplanation(unknown).join(' ')
    expect(explanation).toContain('Not enough information');expect(explanation).toContain('cannot count as a pass')
  })
  it('keeps location, UTC, conditions, hardware and source information together in a comparison',()=>{
    const result=actual(),scenario:ComparisonScenario={id:'base',name:'Original',selection:{site:{id:'site01',name:'Site01',latitude:result.request.site.latitude_deg,longitude:result.request.site.longitude_deg,description:''},startUtc:result.request.start_utc,durationHours:24},options:initialOptions,analysis:{status:'success',result,message:''}}
    const html=render(<FriendlyComparison scenarios={[scenario]} baselineId="base"/>)
    for(const phrase of ['Site01',result.request.start_utc,'14698.80 Wh','Limited local coverage','500 Wh battery','not identify a universally better','Where does this data come from?'])expect(html).toContain(phrase)
  })
  it('distinguishes LROC photos, LOLA heights, SPICE models and LunAscend calculations using the source registry',()=>{
    const image=render(<SourceInfo kind="images"/>),solar=render(<SourceInfo kind="power" result={actual()}/>)
    expect(image).toContain('LRO_NAC_Mosaic_SPole85.5_1mp');expect(image).toContain('4.180641');expect(image).toContain('registration remains unverified')
    expect(solar).toContain('LunAscend estimates electrical generation');expect(solar).toContain('not NASA site measurements')
    expect(solar).toContain('JPL NAIF SPICE');expect(solar).toContain('NASA LOLA / PGDA Site01')
    expect(analysisProblem('MISSING_DATA: kernels absent')).toContain('Required scientific data')
    const html=render(<Glossary/>)
    for(const [term] of glossary)expect(html).toContain(term)
    expect(html).toContain('not radio signal strength')
  })
  it('reports missing source metadata without inventing a release or provider',()=>{
    const filter=vi.spyOn(sourceCatalog.sources,'filter').mockReturnValueOnce([])
    const html=render(<SourceInfo kind="terrain"/>)
    filter.mockRestore()
    expect(html).toContain('Source metadata unavailable')
    expect(html).not.toContain('source-info-record')
  })
})
