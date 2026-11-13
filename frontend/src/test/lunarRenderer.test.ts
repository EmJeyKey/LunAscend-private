import {afterEach,describe,expect,it,vi} from 'vitest'
import type {RenderStats} from '../types/visualization'
import evidence from '../../../docs/validation/step-10-results.json'
import {parseMesh} from '../api/visualization'
import type {MeshRequest} from '../types/visualization'
const shared=vi.hoisted(()=>({dispose:vi.fn(),forceLoss:vi.fn(),controlDispose:vi.fn(),disconnect:vi.fn(),remove:vi.fn(),cancel:vi.fn()}))
vi.mock('three',async()=>{
  const real=await vi.importActual<typeof import('three')>('three')
  class Renderer {
    domElement=new class extends EventTarget {
      setAttribute(){} remove(){shared.remove()}
      getBoundingClientRect(){return {left:0,top:0,width:800,height:500}}
    }()
    info={render:{triangles:0}}
    setPixelRatio(){}setClearColor(){}setSize(){}render(){this.info.render.triangles=6728}
    dispose(){shared.dispose()}forceContextLoss(){shared.forceLoss()}
  }
  return {...real,WebGLRenderer:Renderer}
})
vi.mock('three/addons/controls/OrbitControls.js',async()=>{
  const real=await vi.importActual<typeof import('three')>('three')
  return {OrbitControls:class {target=new real.Vector3();enableDamping=false;autoRotate=false;minDistance=0;maxDistance=0;enablePan=false;addEventListener(){}removeEventListener(){}update(){}dispose(){shared.controlDispose()}}}
})
import {LunarRenderer} from '../visualization/LunarRenderer'

afterEach(()=>{vi.unstubAllGlobals();vi.clearAllMocks()})
describe('renderer ownership and on-demand update separation (GPU mocked)',()=>{
  function setup(){
    let id=0
    const pending=new Map<number,FrameRequestCallback>()
    vi.stubGlobal('window',{devicePixelRatio:1})
    vi.stubGlobal('document',{createElement:()=>({width:0,height:0,getContext:()=>null})})
    vi.stubGlobal('requestAnimationFrame',(callback:FrameRequestCallback)=>{pending.set(++id,callback);return id})
    vi.stubGlobal('cancelAnimationFrame',(key:number)=>{pending.delete(key);shared.cancel(key)})
    vi.stubGlobal('ResizeObserver',class {observe(){}disconnect(){shared.disconnect()}})
    const host={clientWidth:800,clientHeight:500,appendChild:vi.fn()} as unknown as HTMLElement
    const values:RenderStats[]=[]
    const renderer=new LunarRenderer(host,vi.fn(),s=>values.push(s),vi.fn())
    const flush=()=>{const callbacks=[...pending.values()];pending.clear();callbacks.forEach(fn=>fn(0))}
    return {renderer,flush,values}
  }
  it('reuses static geometry when directions/time change; exaggeration only updates vertices',()=>{
    const {renderer,flush,values}=setup()
    const mesh=parseMesh(evidence.mesh,evidence.mesh.request as MeshRequest)
    renderer.setMode('terrain');renderer.setMesh(mesh);flush()
    renderer.setDirections({origin:mesh.observer_scene_m,sun:[1,0,0],earth:[0,1,0]});flush()
    expect(values.at(-1)?.meshBuilds).toBe(1);expect(values.at(-1)?.vertexUpdates).toBe(0)
    renderer.setDirections({origin:mesh.observer_scene_m,sun:[0,0,-1],earth:[0,-1,0]});flush()
    expect(values.at(-1)?.meshBuilds).toBe(1);expect(values.at(-1)?.vertexUpdates).toBe(0)
    renderer.setExaggeration(5);flush()
    expect(values.at(-1)?.meshBuilds).toBe(1);expect(values.at(-1)?.vertexUpdates).toBe(1)
    renderer.setMesh(null);flush();expect(values.at(-1)?.bufferBytes).toBe(0)
    renderer.dispose()
  })
  it('releases controls, resize observer, canvas, GPU renderer and pending frame exactly once',()=>{
    const {renderer}=setup();renderer.dispose();renderer.dispose()
    expect(shared.dispose).toHaveBeenCalledTimes(1);expect(shared.forceLoss).toHaveBeenCalledTimes(1)
    expect(shared.controlDispose).toHaveBeenCalledTimes(1);expect(shared.disconnect).toHaveBeenCalledTimes(1)
    expect(shared.remove).toHaveBeenCalledTimes(1);expect(shared.cancel).toHaveBeenCalledTimes(1)
  })
})
