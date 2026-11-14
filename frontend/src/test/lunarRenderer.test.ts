import {afterEach,describe,expect,it,vi} from 'vitest'
import type {RenderStats} from '../types/visualization'
import evidence from '../../../docs/validation/step-10-results.json'
import {parseMesh} from '../api/visualization'
import type {MeshRequest} from '../types/visualization'
const shared=vi.hoisted(()=>({dispose:vi.fn(),forceLoss:vi.fn(),controlDispose:vi.fn(),disconnect:vi.fn(),remove:vi.fn(),cancel:vi.fn(),draw:vi.fn()}))
vi.mock('three',async()=>{
  const real=await vi.importActual<typeof import('three')>('three')
  class Renderer {
    domElement=new class extends EventTarget {
      setAttribute(){} remove(){shared.remove()}
      getBoundingClientRect(){return {left:0,top:0,width:800,height:500}}
    }()
    info={render:{triangles:0}}
    setPixelRatio(){}setClearColor(){}setSize(){}render(scene:unknown,camera:unknown){this.info.render.triangles=6728;shared.draw(scene,camera)}
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
    const appendChild=vi.fn()
    const host={clientWidth:800,clientHeight:500,appendChild} as unknown as HTMLElement
    const values:RenderStats[]=[]
    const surfaceStatus=vi.fn()
    const picks=vi.fn(),hover=vi.fn()
    const renderer=new LunarRenderer(host,picks,s=>values.push(s),vi.fn(),vi.fn(),surfaceStatus,vi.fn(),hover)
    const flush=()=>{const callbacks=[...pending.values()];pending.clear();callbacks.forEach(fn=>fn(0))}
    return {renderer,flush,values,surfaceStatus,picks,hover,canvas:appendChild.mock.calls[0][0] as EventTarget}
  }
  it('raycasts the globe without marker interception and hides far-side pins (GPU mocked)',()=>{
    const {renderer,flush,picks,hover,canvas}=setup()
    renderer.setApollo([{id:'near',name:'Near',latitude:0,longitude:0,context_latitude:0,context_longitude:0,landing_date:'test',historical_utc:null},{id:'far',name:'Far',latitude:0,longitude:-180,context_latitude:0,context_longitude:-180,landing_date:'test',historical_utc:null}],true,'near')
    renderer.focusCoordinate(0,0);flush()
    const [scene,camera]=shared.draw.mock.calls.at(-1)! as [import('three').Scene,import('three').PerspectiveCamera]
    camera.lookAt(0,0,0);camera.updateMatrixWorld(true);scene.updateMatrixWorld(true)
    const pins:import('three').Object3D[]=[];scene.traverse(node=>{if(node.userData.apolloId)pins.push(node)})
    expect(pins.find(p=>p.userData.apolloId==='near')?.visible).toBe(true)
    expect(pins.find(p=>p.userData.apolloId==='far')?.visible).toBe(false)
    const event=(name:string,x=400,y=250)=>{const e=new Event(name);Object.defineProperties(e,{clientX:{value:x},clientY:{value:y},button:{value:0},buttons:{value:0}});canvas.dispatchEvent(e)}
    event('pointermove');expect(hover.mock.calls.at(-1)?.[0].latitude).toBeCloseTo(0,5)
    event('pointerdown');event('pointerup');expect(picks).toHaveBeenLastCalledWith({kind:'apollo',id:'near'})
    event('pointerleave');expect(hover).toHaveBeenLastCalledWith(null)
    event('pointermove',-100,-100);expect(hover).toHaveBeenLastCalledWith(null)
    renderer.setApollo([],false,'');flush();event('pointerdown');event('pointerup')
    expect(picks.mock.calls.at(-1)?.[0].kind).toBe('globe')
    renderer.dispose()
  })
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
  it('anchors surface camera at DEM + 2 m, locks true scale and reuses geometry through camera/time/view changes',async()=>{
    const THREE=await vi.importActual<typeof import('three')>('three')
    const {renderer,flush,values}=setup(),mesh=parseMesh(evidence.mesh,evidence.mesh.request as MeshRequest)
    renderer.setMesh(mesh);renderer.setMode('surface');renderer.setSurfaceBearing({azimuth:90,elevation:0});flush()
    const [scene,camera]=shared.draw.mock.calls.at(-1)! as [import('three').Scene,import('three').PerspectiveCamera]
    expect(camera.position.toArray()).toEqual([0,2,0])
    expect(camera.getWorldDirection(new THREE.Vector3()).x).toBeCloseTo(1)
    // Measure decimated terrain underneath the DEM-derived observer, without changing its real height.
    const ray=new THREE.Raycaster(new THREE.Vector3(0,1000,0),new THREE.Vector3(0,-1,0))
    scene.updateMatrixWorld(true)
    const terrainObjects:import('three').Object3D[]=[]
    scene.traverse(node=>{if(node instanceof THREE.Mesh&&node.geometry.getAttribute('position').count===mesh.positions_m.length)terrainObjects.push(node)})
    const ground=ray.intersectObjects(terrainObjects,false)[0]
    expect(ground).toBeDefined();expect(ground.point.y).toBeLessThan(camera.position.y)
    renderer.setDirections({origin:mesh.observer_scene_m,sun:[1,0,0],earth:[0,-1,0],surfaceSun:true,surfaceEarth:false});flush()
    const sky=scene.children.find(g=>g.children.some(n=>n instanceof THREE.Mesh&&n.renderOrder===6))!
    expect(sky.children).toHaveLength(1)
    renderer.setExaggeration(5);renderer.setSurfaceBearing({azimuth:270,elevation:-30});flush()
    expect(camera.position.toArray()).toEqual([0,2,0]);expect(values.at(-1)?.vertexUpdates).toBe(0)
    for(const mode of ['terrain','globe','surface'] as const){renderer.setMode(mode);flush()}
    expect(values.at(-1)?.meshBuilds).toBe(1);expect(camera.position.toArray()).toEqual([0,2,0])
    renderer.dispose()
  })
  it('withholds a coarse surface crossing the DEM eye instead of inventing a higher camera',()=>{
    const {renderer,flush,surfaceStatus}=setup(),mesh=parseMesh(evidence.mesh,evidence.mesh.request as MeshRequest)
    // Deliberately mismatched display heights model a decimation error; not another NASA dataset.
    renderer.setMesh({...mesh,positions_m:mesh.positions_m.map(p=>p?[p[0],p[1]+10,p[2]]:null)})
    renderer.setMode('surface');flush()
    expect(surfaceStatus).toHaveBeenLastCalledWith(expect.stringContaining('real eye height has not been moved'))
    const scene=shared.draw.mock.calls.at(-1)![0] as import('three').Scene
    let visibleTerrain=false
    scene.traverse(node=>{const n=node as import('three').Mesh;if(n.geometry?.getAttribute('position')?.count===mesh.positions_m.length)visibleTerrain=!!n.parent?.visible})
    expect(visibleTerrain).toBe(false);renderer.dispose()
  })
})
