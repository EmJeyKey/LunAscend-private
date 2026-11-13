import * as THREE from 'three'
import {OrbitControls} from 'three/addons/controls/OrbitControls.js'
import {elevationColor,exaggeratedPositions,geographicToScene,sceneToGeographic} from '../lib/lunarScene'
import type {DirectionOverlay,RenderStats,TerrainMesh,Vector3} from '../types/visualization'

export type SceneMode='globe'|'terrain'
export type Pick={kind:'globe';latitude:number;longitude:number}|{kind:'terrain';index:number}
export interface LunarView {
  setMode:(mode:SceneMode)=>void;setMesh:(mesh:TerrainMesh|null)=>void;setMarker:(latitude:number,longitude:number)=>void
  setDirections:(directions:DirectionOverlay)=>void;setExaggeration:(factor:number)=>void;setColorMode:(elevation:boolean)=>void
  camera:(preset:'reset'|'south'|'top'|'in'|'out')=>void;dispose:()=>void
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
  private readonly raycaster=new THREE.Raycaster()
  private readonly resize:ResizeObserver
  private mode:SceneMode='globe'
  private mesh:TerrainMesh|null=null
  private surface:THREE.Mesh<THREE.BufferGeometry,THREE.MeshStandardMaterial>|null=null
  private globeSurface:THREE.Mesh
  private edgeLines:THREE.LineSegments|null=null
  private factor=1
  private colorMode=true
  private disposed=false
  private frame:number|null=null
  private pointer:[number,number]|null=null
  private stats:RenderStats={draws:0,meshBuilds:0,vertexUpdates:0,triangles:0,bufferBytes:0,lastDrawMs:0,meshBuildMs:0}
  private latitude=0
  private longitude=0

  constructor(private host:HTMLElement,private onPick:(pick:Pick)=>void,private onStats:(stats:RenderStats)=>void,private onFailure:(message:string)=>void) {
    this.renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'low-power'})
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5))
    this.renderer.setClearColor('#080d15')
    this.renderer.toneMapping=THREE.ACESFilmicToneMapping
    this.renderer.domElement.setAttribute('aria-label','Interactive lunar scene: drag to orbit, right drag to pan, scroll to zoom. Use coordinate controls for precise selection.')
    this.renderer.domElement.setAttribute('role','img')
    host.appendChild(this.renderer.domElement)
    this.controls=new OrbitControls(this.cameraObject,this.renderer.domElement)
    this.controls.enableDamping=false;this.controls.autoRotate=false
    this.controls.addEventListener('change',this.requestDraw)
    this.scene.add(new THREE.HemisphereLight(0xe2e8ef,0x16202c,1.4))
    const light=new THREE.DirectionalLight(0xffedcb,1.4);light.position.set(3,4,2);this.scene.add(light)
    this.globeSurface=new THREE.Mesh(new THREE.SphereGeometry(1,96,64),new THREE.MeshStandardMaterial({color:'#515762',roughness:1}))
    this.globe.add(this.globeSurface)
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
    this.renderer.domElement.addEventListener('webglcontextlost',this.contextLost)
    this.resize=new ResizeObserver(this.resizeScene);this.resize.observe(host)
    this.camera('reset');this.resizeScene()
  }
  private contextLost=(event:Event)=>{event.preventDefault();this.onFailure('WebGL context lost. Use the georeferenced polar map or the existing analysis readouts.');this.dispose()}
  private resizeScene=()=>{
    if(this.disposed)return
    const width=Math.max(1,this.host.clientWidth),height=Math.max(1,this.host.clientHeight)
    this.renderer.setSize(width,height,false);this.cameraObject.aspect=width/height;this.cameraObject.updateProjectionMatrix();this.camera('reset')
  }
  private requestDraw=()=>{
    if(this.disposed||this.frame!==null)return
    this.frame=requestAnimationFrame(()=>{
      this.frame=null;if(this.disposed)return
      const start=performance.now();this.renderer.render(this.scene,this.cameraObject)
      this.stats={...this.stats,draws:this.stats.draws+1,triangles:this.renderer.info.render.triangles,lastDrawMs:performance.now()-start}
      this.onStats({...this.stats})
    })
  }
  private pointerDown=(event:PointerEvent)=>{if(event.button===0)this.pointer=[event.clientX,event.clientY]}
  private pointerUp=(event:PointerEvent)=>{
    const down=this.pointer;this.pointer=null
    if(!down||Math.hypot(event.clientX-down[0],event.clientY-down[1])>5)return
    const box=this.renderer.domElement.getBoundingClientRect()
    this.raycaster.setFromCamera(new THREE.Vector2((event.clientX-box.left)/box.width*2-1,-(event.clientY-box.top)/box.height*2+1),this.cameraObject)
    const target=this.mode==='globe'?this.globeSurface:this.surface
    if(!target)return
    const hit=this.raycaster.intersectObject(target,false)[0]
    if(!hit)return
    if(this.mode==='globe')this.onPick({kind:'globe',...sceneToGeographic(hit.point.toArray() as Vector3)})
    else if(hit.face&&this.surface){
      const buffer=this.surface.geometry.getAttribute('position')
      const ids=[hit.face.a,hit.face.b,hit.face.c]
      const index=ids.sort((a,b)=>new THREE.Vector3().fromBufferAttribute(buffer,a).distanceToSquared(hit.point)-new THREE.Vector3().fromBufferAttribute(buffer,b).distanceToSquared(hit.point))[0]
      this.onPick({kind:'terrain',index})
    }
  }
  setMode(mode:SceneMode){
    if(this.mode===mode)return
    this.mode=mode;this.globe.visible=mode==='globe';this.terrain.visible=mode==='terrain'
    this.setMarker(this.latitude,this.longitude);disposeGroup(this.directions);this.camera('reset')
  }
  setMesh(mesh:TerrainMesh|null){
    if(mesh===this.mesh)return
    const start=performance.now();this.mesh=mesh;disposeGroup(this.terrain)
    if(!mesh){this.surface=null;this.edgeLines=null;this.marker.visible=this.mode==='globe';this.stats.bufferBytes=0;this.requestDraw();return}
    const geometry=new THREE.BufferGeometry()
    geometry.setAttribute('position',new THREE.BufferAttribute(exaggeratedPositions(mesh,this.factor),3));geometry.setIndex(mesh.indices)
    geometry.computeVertexNormals();geometry.computeBoundingSphere()
    this.surface=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,side:THREE.FrontSide}))
    this.terrain.add(this.surface)
    this.edgeLines=new THREE.LineSegments(new THREE.BufferGeometry(),new THREE.LineBasicMaterial({color:0xf2d38b,transparent:true,opacity:.85}))
    this.terrain.add(this.edgeLines)
    this.updateEdges();this.setColorMode(this.colorMode)
    this.stats={...this.stats,meshBuilds:this.stats.meshBuilds+1,meshBuildMs:performance.now()-start,bufferBytes:geometry.getAttribute('position').array.byteLength+geometry.getAttribute('normal').array.byteLength+geometry.getAttribute('color').array.byteLength+(geometry.index?.array.byteLength||0)}
    this.setMarker(this.latitude,this.longitude)
    if(this.mode==='terrain')this.camera('reset')
    this.requestDraw()
  }
  private updateEdges(){
    if(!this.mesh||!this.surface||!this.edgeLines)return
    const positions=this.surface.geometry.getAttribute('position')
    const edgeValues=this.mesh.boundary_edges.flatMap(edge=>edge.flatMap(i=>[positions.getX(i),positions.getY(i),positions.getZ(i)]))
    this.edgeLines.geometry.dispose();this.edgeLines.geometry=new THREE.BufferGeometry()
    this.edgeLines.geometry.setAttribute('position',new THREE.Float32BufferAttribute(edgeValues,3))
  }
  setExaggeration(factor:number){
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
    this.marker.visible=this.mode==='globe'||!!this.mesh
    const local=this.mode==='terrain',extent=this.mesh?.request.half_extent_m||1000
    const position=local?this.mesh?.observer_scene_m||[0,0,0]:geographicToScene(latitude,longitude,1.014)
    const radius=local?extent*.012:.014
    const point=new THREE.Mesh(new THREE.SphereGeometry(radius,16,12),new THREE.MeshBasicMaterial({color:0xf2d38b,depthTest:false}))
    point.position.set(...position as Vector3);point.renderOrder=5;this.marker.add(point);this.requestDraw()
    if(changed&&this.mode==='globe')this.camera('reset')
  }
  setDirections(overlay:DirectionOverlay){
    disposeGroup(this.directions)
    const length=this.mode==='globe'?.62:(this.mesh?.request.half_extent_m||1000)*.72
    for(const [vector,color] of [[overlay.sun,0xf2d38b],[overlay.earth,0x79c9de]] as [Vector3|null,number][]){
      if(vector){const arrow=new THREE.ArrowHelper(new THREE.Vector3(...vector).normalize(),new THREE.Vector3(...overlay.origin),length,color,length*.085,length*.045);this.directions.add(arrow)}
    }
    this.requestDraw()
  }
  camera(preset:'reset'|'south'|'top'|'in'|'out'){
    const local=this.mode==='terrain',scale=local?this.mesh?.request.half_extent_m||1000:1
    const fit=Math.max(1,1/this.cameraObject.aspect)
    this.controls.minDistance=scale*.1;this.controls.maxDistance=scale*12;this.controls.enablePan=local
    if(preset==='in'||preset==='out')this.cameraObject.position.sub(this.controls.target).multiplyScalar(preset==='in'?.8:1.25).add(this.controls.target)
    else{
      this.controls.target.set(0,0,0)
      if(preset==='south'&&!local)this.cameraObject.position.set(.01,-3.2*fit,.12)
      else if(preset==='top'&&local)this.cameraObject.position.set(0,scale*4.3*fit,.01)
      else if(local)this.cameraObject.position.set(scale*2.4*fit,scale*1.9*fit,scale*2.9*fit)
      else this.cameraObject.position.copy(new THREE.Vector3(...geographicToScene(this.latitude,this.longitude,3.4*fit)))
    }
    this.cameraObject.near=scale*.001;this.cameraObject.far=scale*40;this.cameraObject.updateProjectionMatrix();this.controls.update();this.requestDraw()
  }
  dispose(){
    if(this.disposed)return
    this.disposed=true;if(this.frame!==null)cancelAnimationFrame(this.frame)
    this.resize.disconnect();this.controls.removeEventListener('change',this.requestDraw);this.controls.dispose()
    this.renderer.domElement.removeEventListener('pointerdown',this.pointerDown);this.renderer.domElement.removeEventListener('pointerup',this.pointerUp);this.renderer.domElement.removeEventListener('webglcontextlost',this.contextLost)
    disposeGroup(this.scene);this.renderer.dispose();this.renderer.forceContextLoss();this.renderer.domElement.remove()
  }
}
