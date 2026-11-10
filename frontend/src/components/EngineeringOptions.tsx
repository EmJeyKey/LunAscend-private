import type { AnalysisOptions } from '../types/analysis'
import type { EngineeringDraft } from '../types/engineering'
import { initialEngineering } from '../lib/engineering'

const fields: {key: keyof EngineeringDraft; label: string; min: number; max: number}[] = [
  {key:'panel_area_m2',label:'Active panel area / m²',min:0,max:1e6}, {key:'panel_efficiency',label:'Panel efficiency / 0–1',min:0,max:1},
  {key:'solar_irradiance_w_m2',label:'Assumed irradiance / W/m²',min:0,max:10000}, {key:'system_efficiency',label:'Electrical conversion efficiency / 0–1',min:0,max:1},
  {key:'derating_factor',label:'Additional derating factor / 0–1',min:0,max:1}, {key:'baseline_load_w',label:'Baseline load / W',min:0,max:1e9},
  {key:'heater_load_w',label:'Additional constant heater load / W',min:0,max:1e9}, {key:'battery_capacity_wh',label:'Modeled battery capacity / Wh',min:0.000001,max:1e12},
  {key:'initial_soc_pct',label:'Initial battery charge / %',min:0,max:100}, {key:'minimum_soc_pct',label:'Minimum permitted charge / %',min:0,max:100},
  {key:'charging_efficiency',label:'Charging efficiency / >0–1',min:0.000001,max:1}, {key:'discharging_efficiency',label:'Discharging efficiency / >0–1',min:0.000001,max:1},
]
export function EngineeringOptions({options,onChange}: {options: AnalysisOptions; onChange: (value: AnalysisOptions) => void}) {
  const enabled = options.providerMode === 'scientific' && !!options.terrainEnabled
  const draft = options.engineering || initialEngineering
  const edit = (key: keyof EngineeringDraft,value: string) => onChange({...options,engineering:{...draft,[key]:value}})
  return <fieldset className="terrain-options engineering-options"><legend>Optional power, battery & DTE assumptions</legend><p>Requires Scientific SPICE and NASA terrain. Hardware values are assumptions, not measurements. Efficiency 0.25 means 25%.</p>
    <label className="terrain-toggle"><input type="checkbox" disabled={!enabled} checked={!!options.powerEnabled} onChange={e=>onChange({...options,powerEnabled:e.target.checked})}/>Estimate solar power and battery energy</label>
    {options.powerEnabled && <><label>Panel orientation<select aria-label="Panel orientation mode" value={draft.orientation_mode} onChange={e=>edit('orientation_mode',e.target.value)}><option value="fixed_horizontal">Fixed horizontal · radial local up</option><option value="ideal_sun_tracking">Ideal Sun tracking · unlimited pointing</option></select></label><div className="analysis-input-grid">{fields.map(({key,label,min,max})=><label key={key}>{label}<input aria-label={label} type="number" min={min} max={max} step="any" required value={draft[key]} onChange={e=>edit(key,e.target.value)}/></label>)}</div><p>1361 W/m² is a configurable nominal assumption, not a measured site value. Both conservative and optimistic illumination cases run. Minimum charge is a reserve that the model will not discharge below; any unsupplied load is recorded.</p></>}
    <label className="terrain-toggle"><input type="checkbox" disabled={!enabled} checked={!!options.communicationEnabled} onChange={e=>onChange({...options,communicationEnabled:e.target.checked})}/>Evaluate conditional direct-to-Earth access</label>
    {options.communicationEnabled && <><label>Required Earth-center clearance / °<input aria-label="Required Earth-center clearance in degrees" type="number" min="0" max="90" step="any" required value={draft.minimum_earth_clearance_deg} onChange={e=>edit('minimum_earth_clearance_deg',e.target.value)}/></label><p>A clearance requirement is an equipment assumption. Missing that margin is distinct from terrain obstruction. No radio link budget is calculated.</p></>}
  </fieldset>
}
