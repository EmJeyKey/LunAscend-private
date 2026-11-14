import {describe,expect,it} from 'vitest'
import {environmentColor,parseEnvironment} from '../lib/environment'
describe('NASA layer display guards',()=>{
  it('keeps missing cells transparent and measured zero visible',()=>{
    expect(environmentColor('solar',null)).toBeNull()
    expect(environmentColor('solar',0)).not.toBeNull()
    expect(environmentColor('shadow',1)).not.toEqual(environmentColor('shadow',0))
    expect(environmentColor('screening',0)).toContain('145,153,164')
    expect(environmentColor('screening',1)).toContain('211,102,96')
    expect(environmentColor('screening',3)).toContain('114,176,136')
  })
  it('rejects unsupported and date-specific raster payloads',()=>{
    expect(()=>parseEnvironment({mode:'selected_date'},'solar')).toThrow()
    expect(()=>parseEnvironment(null,'earth')).toThrow()
  })
})
