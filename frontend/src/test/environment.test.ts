import {describe,expect,it} from 'vitest'
import {environmentColor,parseEnvironment} from '../lib/environment'
describe('NASA layer display guards',()=>{
  it('keeps missing cells transparent and measured zero visible',()=>{
    expect(environmentColor('solar',null)).toBeNull()
    expect(environmentColor('solar',0)).not.toBeNull()
    expect(environmentColor('shadow',1)).not.toEqual(environmentColor('shadow',0))
  })
  it('rejects unsupported and date-specific raster payloads',()=>{
    expect(()=>parseEnvironment({mode:'selected_date'},'solar')).toThrow()
    expect(()=>parseEnvironment(null,'earth')).toThrow()
  })
})
