import * as THREE from 'three'
import {geographicToScene,sceneToGeographic} from '../lib/lunarScene'
import {globeLevel,imageLayer,imageResolution,mapLevel,mapProject,mapUnproject,tileBounds,tileKey,TilePool,visibleTiles,type ImageTile} from '../lib/imagery'

export interface GlobeImageStatus {layer:string;level:number;ready:number;total:number;failures:number;resolution:string}

/** Photographic context shell only. No heights, frame conversion, or scientific shadows. */
export class GlobeImagery {
  readonly group=new THREE.Group()
  private readonly pool:TilePool
  private meshes=new Map<string,THREE.Mesh<THREE.BufferGeometry,THREE.MeshBasicMaterial>>()
  private wanted:ImageTile[]=[]
  private layerId='wac-global'
  private level=0
  private disposed=false
  constructor(private redraw:()=>void,private status:(value:GlobeImageStatus)=>void){this.pool=new TilePool(()=>this.renderTiles())}
  update(position:THREE.Vector3,height:number,active=true){
    if(this.disposed)return
    if(!active){this.pool.sync([]);return}
    const distance=position.length(),focus=sceneToGeographic(position.toArray() as [number,number,number])
    this.layerId=focus.latitude< -85.5&&distance<1.13?'nac-south':focus.latitude< -60&&distance<1.8?'wac-south':'wac-global'
    const layer=imageLayer(this.layerId)
    // Always retain the two verified global parent photographs under regional detail.
    const base:ImageTile[]=[0,1].map(column=>({layer:'wac-global',level:0,row:0,column}))
    if(layer.projection==='geographic'){
      this.level=globeLevel(distance,height)
      const angular=Math.min(360,Math.max(.2,Math.sqrt(Math.max(.00001,distance-1))*130))
      let view={x:focus.longitude,y:focus.latitude,resolution:angular/height}
      while(this.level>0&&visibleTiles(layer,this.level,view,height*1.6,height).length>24)this.level--
      const detail=visibleTiles(layer,this.level,view,height*1.6,height)
      // Add the opposite side of the longitude seam when the visible patch wraps.
      for(const shift of [-360,360]){view={...view,x:focus.longitude+shift};detail.push(...visibleTiles(layer,this.level,view,height*1.6,height))}
      this.wanted=[...base,...detail.slice(0,28)]
    }else{
      const [x,y]=mapProject(layer,focus.latitude,focus.longitude)
      const span=Math.max(1600,(distance-1)*layer.radius_m*1.7)
      const view={x,y,resolution:span/height}
      this.level=mapLevel(layer,view,height,height)
      const parents=this.level>0?visibleTiles(layer,this.level-1,view,height,height):[]
      this.wanted=[...base,...parents,...visibleTiles(layer,this.level,view,height,height)]
    }
    this.wanted=[...new Map(this.wanted.map(t=>[tileKey(t),t])).values()]
    this.pool.sync(this.wanted);this.renderTiles()
  }
  private renderTiles(){
    if(this.disposed)return
    const keys=new Set(this.wanted.map(tileKey))
    // Old textures stay until their replacements have pixels, avoiding blank camera transitions.
    const detailReady=this.wanted.some(t=>t.layer===this.layerId&&t.level===this.level&&this.pool.get(t))
    if(detailReady)for(const [key,mesh] of this.meshes)if(!keys.has(key)){this.release(mesh);this.meshes.delete(key)}
    for(const tile of this.wanted){const key=tileKey(tile);if(this.meshes.has(key))continue
      const image=this.pool.get(tile);if(!image)continue
      const canvas=document.createElement('canvas');canvas.width=256;canvas.height=256
      const ctx=canvas.getContext('2d');if(!ctx)continue
      // Explicit missing optical pixels, not a lower-resolution photograph falsely
      // presented as valid high-resolution coverage through transparent nodata.
      if(imageLayer(tile.layer).extension==='png'){ctx.fillStyle='#080d15';ctx.fillRect(0,0,256,256)}
      ctx.drawImage(image,0,0)
      const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=2
      const mesh=new THREE.Mesh(this.geometry(tile),new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,toneMapped:false}))
      // Higher source levels draw last; persistent lower-resolution parents fill genuine holes.
      mesh.renderOrder=1+tile.level+(tile.layer==='wac-global'?0:20)
      this.group.add(mesh);this.meshes.set(key,mesh)
    }
    // Bound GPU use even during repeated requests that never finish.
    while(this.meshes.size>64){const key=this.meshes.keys().next().value!,mesh=this.meshes.get(key)!;this.release(mesh);this.meshes.delete(key)}
    const ready=this.wanted.filter(t=>t.layer===this.layerId&&t.level===this.level&&this.meshes.has(tileKey(t))).length
    const total=this.wanted.filter(t=>t.layer===this.layerId&&t.level===this.level).length
    this.status({layer:imageLayer(this.layerId).title,level:this.level,ready,total,failures:this.pool.failures,resolution:imageResolution(imageLayer(this.layerId),this.level)})
    this.redraw()
  }
  private geometry(tile:ImageTile){
    const layer=imageLayer(tile.layer),[left,bottom,right,top]=tileBounds(tile),side=17
    const x0=Math.max(left,layer.bounds[0]),x1=Math.min(right,layer.bounds[2]),y0=Math.max(bottom,layer.bounds[1]),y1=Math.min(top,layer.bounds[3])
    const positions:number[]=[],uv:number[]=[],indices:number[]=[]
    for(let row=0;row<side;row++)for(let column=0;column<side;column++){
      const x=x0+(x1-x0)*column/(side-1),y=y1-(y1-y0)*row/(side-1),p=mapUnproject(layer,x,y)
      positions.push(...geographicToScene(p.latitude,p.longitude,1.0005));uv.push((x-left)/(right-left),(y-bottom)/(top-bottom))
      if(row<side-1&&column<side-1){const a=row*side+column,b=a+1,c=a+side,d=c+1;indices.push(a,c,b,b,c,d)}
    }
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeBoundingSphere();return geometry
  }
  private release(mesh:THREE.Mesh<THREE.BufferGeometry,THREE.MeshBasicMaterial>){this.group.remove(mesh);mesh.geometry.dispose();mesh.material.map?.dispose();mesh.material.dispose()}
  dispose(){if(this.disposed)return;this.disposed=true;this.pool.dispose();this.meshes.forEach(mesh=>this.release(mesh));this.meshes.clear()}
}
