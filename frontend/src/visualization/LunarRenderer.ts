import * as THREE from 'three'
import {OrbitControls} from 'three/addons/controls/OrbitControls.js'
import {elevationColor,exaggeratedPositions,geographicToScene,sceneToGeographic,surfaceBearing,surfacePose,markerWorldRadius} from '../lib/lunarScene'
import type {DirectionOverlay,RenderStats,SurfaceBearing,TerrainMesh,Vector3} from '../types/visualization'
import {GlobeImagery,type GlobeImageStatus} from './GlobeImagery'
import {surfaceFacing,type ApolloPin} from '../lib/apollo'

export type SceneMode='globe'|'terrain'|'surface'
export type Pick={kind:'globe';latitude:number;longitude:number}|{kind:'terrain';index:number}|{kind:'apollo';id:string}
export type HoverCoordinate={latitude:number;longitude:number;x:number;y:number}
export interface LunarView {
  setApollo?:(pins:ApolloPin[],visible:boolean,selected:string)=>void
  focusCoordinate?:(latitude:number,longitude:number)=>void
  setMode:(mode:SceneMode)=>void;setMesh:(mesh:TerrainMesh|null)=>void;setMarker:(latitude:number,longitude:number)=>void
  setDirections:(directions:DirectionOverlay)=>void;setExaggeration:(factor:number)=>void;setColorMode:(elevation:boolean)=>void
  setSurfaceBearing:(bearing:SurfaceBearing)=>void;setIndicators:(visible:boolean)=>void
  camera:(preset:'reset'|'south'|'top'|'in'|'out'|'regional'|'neighborhood')=>void;dispose:()=>void
}

function disposeGroup(group:THREE.Object3D) {
  const geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>(),textures=new Set<THREE.Texture>()
  group.traverse(node=>{
    const renderable=node as THREE.Mesh
    if(renderable.geometry)geometries.add(renderable.geometry)
    if(renderable.material)for(const mat of Array.isArray(renderable.material)?renderable.material:[renderable.material]){
      materials.add(mat)
      const map=(mat as THREE.SpriteMaterial).map
      if(map)textures.add(map)
    }
  })
  geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());group.clear()
}

export class LunarRenderer implements LunarView {
  private readonly renderer:THREE.WebGLRenderer
  private readonly scene=new THREE.Scene()
  private readonly cameraObject=new THREE.PerspectiveCamera(42,1,.001,100000)
  private readonly controls:OrbitControls
  private readonly globe=new THREE.Group()
  private readonly terrain=new THREE.Group()
  private readonly directions=new THREE.Group()
  private readonly marker=new THREE.Group()
  private readonly apollo=new THREE.Group()
  private readonly sunLight=new THREE.DirectionalLight(0xffedcb,1.4)
  private readonly raycaster=new THREE.Raycaster()
  private readonly resize:ResizeObserver
  private mode:SceneMode='globe'
  private mesh:TerrainMesh|null=null
  private surface:THREE.Mesh<THREE.BufferGeometry,THREE.MeshStandardMaterial>|null=null
  private globeSurface:THREE.Mesh
  private photographic:GlobeImagery|null=null
  private edgeLines:THREE.LineSegments|null=null
  private factor=1
  private colorMode=true
  private disposed=false
  private frame:number|null=null
  private pointer:[number,number]|null=null
  private stats:RenderStats={draws:0,meshBuilds:0,vertexUpdates:0,triangles:0,bufferBytes:0,lastDrawMs:0,meshBuildMs:0}
  private latitude=0
  private longitude=0
  private bearing:SurfaceBearing={azimuth:0,elevation:0}
  private overlay:DirectionOverlay={origin:[0,0,0],sun:null,earth:null}
  private indicators=true
  private surfaceReady=false

  constructor(private host:HTMLElement,private onPick:(pick:Pick)=>void,private onStats:(stats:RenderStats)=>void,private onFailure:(message:string)=>void,private onBearing:(bearing:SurfaceBearing)=>void=()=>{},private onSurfaceStatus:(message:string)=>void=()=>{},onImagery:(status:GlobeImageStatus)=>void=()=>{},private onHover:(coordinate:HoverCoordinate|null)=>void=()=>{}) {
    this.renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'low-power'})
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5))
    this.renderer.setClearColor('#000000')
    this.renderer.toneMapping=THREE.ACESFilmicToneMapping
    this.renderer.domElement.setAttribute('aria-label','Interactive lunar scene: drag to orbit, right drag to pan, scroll to zoom. Use coordinate controls for precise selection.')
    this.renderer.domElement.setAttribute('role','img')
    host.appendChild(this.renderer.domElement)
    this.controls=new OrbitControls(this.cameraObject,this.renderer.domElement)
    this.controls.enableDamping=false;this.controls.autoRotate=false
    this.controls.addEventListener('change',this.requestDraw)
    this.scene.add(new THREE.HemisphereLight(0xe2e8ef,0x16202c,1.4))
    this.sunLight.position.set(3,4,2);this.scene.add(this.sunLight)
    this.globeSurface=new THREE.Mesh(new THREE.SphereGeometry(1,96,64),new THREE.MeshStandardMaterial({color:'#515762',roughness:1,depthWrite:false}))
    this.globe.add(this.globeSurface)
    this.globe.add(this.apollo)
    this.photographic=new GlobeImagery(this.requestDraw,onImagery);this.globe.add(this.photographic.group)
    const lineMaterial=new THREE.LineBasicMaterial({color:0x9aaab9,transparent:true,opacity:.26})
    for(const latitude of [-60,-30,0,30,60]){
      const points=Array.from({length:181},(_,i)=>new THREE.Vector3(...geographicToScene(latitude,i*2-180,1.002)))
      this.globe.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),lineMaterial))
    }
    for(const longitude of [0,45,90,135,180,225,270,315]){
      const points=Array.from({length:91},(_,i)=>new THREE.Vector3(...geographicToScene(i*2-90,longitude,1.002)))
      this.globe.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),lineMaterial))
    }
    for(const [label,position] of [['N',[0,1.09,0]],['S',[0,-1.09,0]],['0°',[1.1,0,0]],['90° E',[0,0,-1.1]]] as [string,Vector3][]){
      const canvas=document.createElement('canvas');canvas.width=256;canvas.height=64
      const ctx=canvas.getContext('2d')
      if(ctx){ctx.font='28px sans-serif';ctx.textAlign='center';ctx.fillStyle='#e0d3ac';ctx.fillText(label,128,43)}
      const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(canvas),transparent:true,depthTest:false}))
      sprite.position.set(...position);sprite.scale.set(.36,.09,1);this.globe.add(sprite)
    }
    this.scene.add(this.globe,this.terrain,this.directions,this.marker)
    this.terrain.visible=false
    this.renderer.domElement.addEventListener('pointerdown',this.pointerDown)
    this.renderer.domElement.addEventListener('pointerup',this.pointerUp)
    this.renderer.domElement.addEventListener('pointermove',this.pointerMove)
    this.renderer.domElement.addEventListener('pointercancel',this.pointerCancel)
    this.renderer.domElement.addEventListener('pointerleave',this.pointerLeave)
    this.renderer.domElement.addEventListener('webglcontextlost',this.contextLost)
    this.resize=new ResizeObserver(this.resizeScene);this.resize.observe(host)
    this.camera('reset');this.resizeScene()
  }
  private contextLost=(event:Event)=>{event.preventDefault();this.onFailure('WebGL context lost. Use the georeferenced polar map or the existing analysis readouts.');this.dispose()}
  private resizeScene=()=>{
    if(this.disposed)return
    const width=Math.max(1,this.host.clientWidth),height=Math.max(1,this.host.clientHeight)
    this.renderer.setSize(width,height,false);this.cameraObject.aspect=width/height;this.cameraObject.updateProjectionMatrix();this.camera(this.mode==='surface'?'top':'reset')
  }
  private requestDraw=()=>{
    if(this.disposed||this.frame!==null)return
    this.frame=requestAnimationFrame(()=>{
      this.frame=null;if(this.disposed)return
      const start=performance.now()
      this.globe.updateMatrixWorld(true)
      const camera=this.globe.worldToLocal(this.cameraObject.position.clone()).toArray()
      this.cameraObject.updateMatrixWorld(true)
      this.apollo.children.forEach(pin=>{
        pin.visible=surfaceFacing(pin.position.toArray(),camera)
        const depth=-pin.getWorldPosition(new THREE.Vector3()).applyMatrix4(this.cameraObject.matrixWorldInverse).z
        pin.scale.setScalar(markerWorldRadius(depth,this.cameraObject.fov,this.host.clientHeight,pin.userData.pixelRadius as number))
      })
      this.renderer.render(this.scene,this.cameraObject)
      this.stats={...this.stats,draws:this.stats.draws+1,triangles:this.renderer.info.render.triangles,lastDrawMs:performance.now()-start}
      this.onStats({...this.stats})
    })
    this.photographic?.update(this.cameraObject.position,this.host.clientHeight,this.mode==='globe')
  }
  private pointerDown=(event:PointerEvent)=>{if(event.button===0){this.pointer=[event.clientX,event.clientY];if(this.mode==='surface')this.renderer.domElement.setPointerCapture?.(event.pointerId)}}
  private pointerCancel=()=>{this.pointer=null}
  private pointerLeave=()=>this.onHover(null)
  private globeIntersection(event:PointerEvent){
    const box=this.renderer.domElement.getBoundingClientRect()
    this.raycaster.setFromCamera(new THREE.Vector2((event.clientX-box.left)/box.width*2-1,-(event.clientY-box.top)/box.height*2+1),this.cameraObject)
    return this.raycaster.intersectObject(this.globeSurface,false)[0]
  }
  private pointerMove=(event:PointerEvent)=>{
    if(this.mode==='globe'){
      if(event.buttons){this.onHover(null);return}
      const hit=this.globeIntersection(event),box=this.renderer.domElement.getBoundingClientRect()
      this.onHover(hit?{...sceneToGeographic(this.globeSurface.worldToLocal(hit.point.clone()).toArray() as Vector3),x:event.clientX-box.left,y:event.clientY-box.top}:null)
      return
    }
    if(this.mode!=='surface'||!this.pointer)return
    const [x,y]=this.pointer;this.pointer=[event.clientX,event.clientY]
    this.setSurfaceBearing(surfaceBearing(this.bearing.azimuth-(event.clientX-x)*.2,this.bearing.elevation+(event.clientY-y)*.2))
    this.onBearing({...this.bearing})
  }
  private pointerUp=(event:PointerEvent)=>{
    const down=this.pointer;this.pointer=null
    if(this.mode==='surface')return
    if(!down||Math.hypot(event.clientX-down[0],event.clientY-down[1])>5)return
    const box=this.renderer.domElement.getBoundingClientRect()
    this.raycaster.setFromCamera(new THREE.Vector2((event.clientX-box.left)/box.width*2-1,-(event.clientY-box.top)/box.height*2+1),this.cameraObject)
    const target=this.mode==='globe'?this.globeSurface:this.surface
    if(!target)return
    const hit=this.raycaster.intersectObject(target,false)[0]
    if(!hit)return
    if(this.mode==='globe'){
      const pin=this.apollo.visible?this.raycaster.intersectObjects(this.apollo.children.filter(p=>p.visible),false).find(p=>p.distance<=hit.distance+.04):undefined
      if(pin){this.onPick({kind:'apollo',id:pin.object.userData.apolloId as string});return}
      this.onPick({kind:'globe',...sceneToGeographic(this.globeSurface.worldToLocal(hit.point.clone()).toArray() as Vector3)})
    }
    else if(hit.face&&this.surface){
      const buffer=this.surface.geometry.getAttribute('position')
      const ids=[hit.face.a,hit.face.b,hit.face.c]
      const index=ids.sort((a,b)=>new THREE.Vector3().fromBufferAttribute(buffer,a).distanceToSquared(hit.point)-new THREE.Vector3().fromBufferAttribute(buffer,b).distanceToSquared(hit.point))[0]
      this.onPick({kind:'terrain',index})
    }
  }
  setMode(mode:SceneMode){
    this.onHover(null)
    if(this.mode===mode)return
    this.mode=mode;this.globe.visible=mode==='globe';this.terrain.visible=mode==='terrain'||mode==='surface'&&!!this.mesh&&this.mesh.request.observer_height_m>0
    if(mode==='surface')this.setExaggeration(1)
    if(mode==='surface')this.checkSurfaceObserver()
    this.controls.enabled=mode!=='surface'
    this.setMarker(this.latitude,this.longitude);this.setDirections(this.overlay);this.camera('reset')
  }
  setApollo(pins:ApolloPin[],visible:boolean,selected:string){
    disposeGroup(this.apollo);this.apollo.visible=visible
    for(const pin of pins){
      const pixelRadius=pin.id===selected?11:8
      const dot=new THREE.Mesh(new THREE.SphereGeometry(1,16,12),new THREE.MeshBasicMaterial({color:pin.id===selected?0xffffff:pin.category==='polar-study'?0x7bbfd0:0xf2d38b,depthTest:false}))
      dot.position.set(...geographicToScene(pin.context_latitude,pin.context_longitude,1.008));dot.userData.apolloId=pin.id;dot.userData.pixelRadius=pixelRadius;dot.renderOrder=102
      this.apollo.add(dot)
    }
    this.requestDraw()
  }
  focusCoordinate(latitude:number,longitude:number){
    this.controls.target.set(0,0,0);this.cameraObject.position.set(...geographicToScene(latitude,longitude,latitude< -80?1.3:2.4));this.controls.update();this.requestDraw()
  }
  setMesh(mesh:TerrainMesh|null){
    if(mesh===this.mesh)return
    const start=performance.now();this.mesh=mesh;disposeGroup(this.terrain)
    this.terrain.visible=this.mode==='terrain'||this.mode==='surface'&&!!mesh&&mesh.request.observer_height_m>0
    if(!mesh){this.surface=null;this.edgeLines=null;this.surfaceReady=false;this.onSurfaceStatus('');this.marker.visible=this.mode==='globe';this.stats.bufferBytes=0;this.requestDraw();return}
    const geometry=new THREE.BufferGeometry()
    geometry.setAttribute('position',new THREE.BufferAttribute(exaggeratedPositions(mesh,this.factor),3));geometry.setIndex(mesh.indices)
    geometry.computeVertexNormals();geometry.computeBoundingSphere()
    this.surface=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,side:THREE.FrontSide}))
    this.terrain.add(this.surface)
    this.edgeLines=new THREE.LineSegments(new THREE.BufferGeometry(),new THREE.LineBasicMaterial({color:0xf2d38b,transparent:true,opacity:.85}))
    this.terrain.add(this.edgeLines)
    this.updateEdges();this.setColorMode(this.colorMode)
    if(this.mode==='surface')this.checkSurfaceObserver()
    this.stats={...this.stats,meshBuilds:this.stats.meshBuilds+1,meshBuildMs:performance.now()-start,bufferBytes:geometry.getAttribute('position').array.byteLength+geometry.getAttribute('normal').array.byteLength+geometry.getAttribute('color').array.byteLength+(geometry.index?.array.byteLength||0)}
    this.setMarker(this.latitude,this.longitude)
    if(this.mode!=='globe')this.camera('reset')
    this.requestDraw()
  }
  private updateEdges(){
    if(!this.mesh||!this.surface||!this.edgeLines)return
    const positions=this.surface.geometry.getAttribute('position')
    const edgeValues=this.mesh.boundary_edges.flatMap(edge=>edge.flatMap(i=>[positions.getX(i),positions.getY(i),positions.getZ(i)]))
    this.edgeLines.geometry.dispose();this.edgeLines.geometry=new THREE.BufferGeometry()
    this.edgeLines.geometry.setAttribute('position',new THREE.Float32BufferAttribute(edgeValues,3))
  }
  private checkSurfaceObserver(){
    this.surfaceReady=false;this.onSurfaceStatus('')
    if(!this.mesh||!this.surface){this.terrain.visible=false;return}
    // Display-only safeguard: never raise the scientific observer to fit a coarse triangle.
    const start=this.mesh.original_elevation_range_m[1]-this.mesh.surface_elevation_m+100
    const ray=new THREE.Raycaster(new THREE.Vector3(0,start,0),new THREE.Vector3(0,-1,0))
    this.surface.updateMatrixWorld(true)
    const ground=ray.intersectObject(this.surface,false)[0]
    this.surfaceReady=this.mesh.request.observer_height_m>0&&!!ground&&ground.point.y+.05<this.mesh.observer_scene_m[1]
    this.terrain.visible=this.surfaceReady
    if(!this.surfaceReady)this.onSurfaceStatus('Surface View withheld: this mesh has no supported eye cell or crosses the DEM-derived observer. Select finer mesh detail or a positive observer height in Analysis. The real eye height has not been moved.')
  }
  setExaggeration(factor:number){
    if(this.mode==='surface')factor=1
    if(this.factor===factor)return
    this.factor=factor
    if(this.mesh&&this.surface){this.surface.geometry.setAttribute('position',new THREE.BufferAttribute(exaggeratedPositions(this.mesh,factor),3));this.surface.geometry.computeVertexNormals();this.surface.geometry.computeBoundingSphere();this.updateEdges();this.stats.vertexUpdates++;this.requestDraw()}
  }
  setColorMode(elevation:boolean){
    this.colorMode=elevation
    if(this.mesh&&this.surface){
      const colors=this.mesh.elevation_m.flatMap(h=>h===null?[0,0,0]:elevation?elevationColor(h,this.mesh!.original_elevation_range_m):[.38,.40,.44])
      this.surface.geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));this.requestDraw()
    }
  }
  setMarker(latitude:number,longitude:number){
    const changed=latitude!==this.latitude||longitude!==this.longitude
    this.latitude=latitude;this.longitude=longitude;disposeGroup(this.marker)
    this.marker.visible=this.mode==='globe'||this.mode==='terrain'&&!!this.mesh
    const local=this.mode!=='globe',extent=this.mesh?.request.half_extent_m||1000
    const position=local?this.mesh?.observer_scene_m||[0,0,0]:geographicToScene(latitude,longitude,1.014)
    const radius=local?extent*.012:.014
    const point=new THREE.Mesh(new THREE.SphereGeometry(radius,16,12),new THREE.MeshBasicMaterial({color:0xf2d38b,depthTest:!local,transparent:true,depthWrite:false}))
    point.position.set(...position as Vector3);point.renderOrder=100;this.marker.add(point)
    if(!local){
      const normal=new THREE.Vector3(...geographicToScene(latitude,longitude,1)).normalize()
      const ring=new THREE.Mesh(new THREE.RingGeometry(.018,.025,32),new THREE.MeshBasicMaterial({color:0xf0eee9,side:THREE.DoubleSide,depthTest:true,transparent:true,depthWrite:false}))
      ring.position.copy(normal.clone().multiplyScalar(1.017));ring.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),normal);ring.renderOrder=101;this.marker.add(ring)
    }
    this.requestDraw()
    if(changed&&this.mode==='globe')this.camera('reset')
  }
  setDirections(overlay:DirectionOverlay){
    this.overlay=overlay
    disposeGroup(this.directions)
    this.directions.visible=this.indicators
    if(this.mode!=='globe'){
      this.sunLight.visible=!!overlay.sun
      if(overlay.sun)this.sunLight.position.copy(new THREE.Vector3(...overlay.sun).multiplyScalar(10000))
    }else{this.sunLight.visible=true;this.sunLight.position.set(3,4,2)}
    const length=this.mode==='globe'?.62:(this.mesh?.request.half_extent_m||1000)*.72
    for(const [vector,color,allowed] of [[overlay.sun,0xf2d38b,overlay.surfaceSun],[overlay.earth,0x79c9de,overlay.surfaceEarth]] as [Vector3|null,number,boolean|undefined][]){
      if(!vector)continue
      if(this.mode==='surface'){
        // Direction annotations only, never disks or a claim of complete visibility.
        if(!allowed||!this.mesh||!this.surfaceReady)continue
        const point=new THREE.Mesh(new THREE.SphereGeometry(length*.006,12,8),new THREE.MeshBasicMaterial({color,depthTest:false}))
        point.position.copy(new THREE.Vector3(...vector).multiplyScalar(length).add(new THREE.Vector3(...this.mesh.observer_scene_m)))
        point.renderOrder=6;this.directions.add(point)
      }else{const arrow=new THREE.ArrowHelper(new THREE.Vector3(...vector).normalize(),new THREE.Vector3(...overlay.origin),length,color,length*.085,length*.045);this.directions.add(arrow)}
    }
    this.requestDraw()
  }
  setIndicators(visible:boolean){this.indicators=visible;this.directions.visible=visible;this.requestDraw()}
  setSurfaceBearing(bearing:SurfaceBearing){
    this.bearing=surfaceBearing(bearing.azimuth,bearing.elevation)
    if(this.mode==='surface')this.camera('top')
  }
  camera(preset:'reset'|'south'|'top'|'in'|'out'|'regional'|'neighborhood'){
    if(this.mode==='surface'){
      if(preset==='reset'){this.bearing={azimuth:0,elevation:0};this.onBearing({...this.bearing})}
      if(this.mesh&&this.surfaceReady){
        const pose=surfacePose(this.mesh,this.bearing)
        this.cameraObject.position.set(...pose.eye);this.cameraObject.up.set(0,1,0);this.cameraObject.lookAt(...pose.target)
        this.cameraObject.near=.05;this.cameraObject.far=100000;this.cameraObject.updateProjectionMatrix()
      }
      this.requestDraw();return
    }
    const local=this.mode==='terrain',scale=local?this.mesh?.request.half_extent_m||1000:1
    const fit=Math.max(1,1/this.cameraObject.aspect)
    this.controls.minDistance=local?scale*.1:1.005;this.controls.maxDistance=scale*12;this.controls.enablePan=local
    if(preset==='in'||preset==='out')this.cameraObject.position.sub(this.controls.target).multiplyScalar(preset==='in'?.8:1.25).add(this.controls.target)
    else{
      this.controls.target.set(0,0,0)
      if(preset==='south'&&!local)this.cameraObject.position.set(.001,-1.7*fit,.01)
      else if((preset==='regional'||preset==='neighborhood')&&!local)this.cameraObject.position.copy(new THREE.Vector3(...geographicToScene(this.latitude,this.longitude,preset==='regional'?1.4:1.03)))
      else if(preset==='top'&&local)this.cameraObject.position.set(0,scale*4.3*fit,.01)
      else if(local)this.cameraObject.position.set(scale*2.4*fit,scale*1.9*fit,scale*2.9*fit)
      else this.cameraObject.position.copy(new THREE.Vector3(...geographicToScene(this.latitude,this.longitude,3.4*fit)))
    }
    this.cameraObject.near=scale*.001;this.cameraObject.far=scale*40;this.cameraObject.updateProjectionMatrix();this.controls.update();this.requestDraw()
  }
  dispose(){
    if(this.disposed)return
    this.disposed=true;if(this.frame!==null)cancelAnimationFrame(this.frame)
    this.photographic?.dispose();this.photographic=null
    this.resize.disconnect();this.controls.removeEventListener('change',this.requestDraw);this.controls.dispose()
    this.renderer.domElement.removeEventListener('pointerdown',this.pointerDown);this.renderer.domElement.removeEventListener('pointerup',this.pointerUp);this.renderer.domElement.removeEventListener('webglcontextlost',this.contextLost)
    this.renderer.domElement.removeEventListener('pointermove',this.pointerMove);this.renderer.domElement.removeEventListener('pointercancel',this.pointerCancel)
    this.renderer.domElement.removeEventListener('pointerleave',this.pointerLeave)
    this.onHover(null)
    disposeGroup(this.scene);this.renderer.dispose();this.renderer.forceContextLoss();this.renderer.domElement.remove()
  }
}
