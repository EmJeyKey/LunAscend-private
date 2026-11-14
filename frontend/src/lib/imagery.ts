import catalog from '../../../data/manifests/lunar-imagery.json'

export interface ImageLevel {level:number;width:number;height:number;resolution:number}
export interface ImageLayer {
  id:string;product:string;title:string;provider:string;projection:string;units:string;radius_m:number;origin:number[];bounds:number[]
  levels:ImageLevel[];extension:string;nominal_source_m_per_pixel:number;acquisition:string;source_url:string;capabilities_sha256:string
  frame:string;registration:string;coverage:string;usage:string
}
export const imageLayers:ImageLayer[]=catalog.layers
export const imageLayer=(id:string)=>{const layer=imageLayers.find(l=>l.id===id);if(!layer)throw new Error('Unknown image layer');return layer}
export interface MapView {x:number;y:number;resolution:number}
export interface ImageTile {layer:string;level:number;row:number;column:number}
export const tileKey=(t:ImageTile)=>`${t.layer}/${t.level}/${t.row}/${t.column}`
const radians=Math.PI/180
export const wrapLongitude=(lon:number)=>((lon+180)%360+360)%360-180

// Cartographic rendering only: same lunar spherical stereographic parameters as the
// source FGDC metadata and PyProj. This is NOT a DE421/DE440 frame transformation.
export function mapProject(layer:ImageLayer,latitude:number,longitude:number):[number,number] {
  if(layer.projection==='geographic')return [wrapLongitude(longitude),latitude]
  const rho=2*layer.radius_m*Math.tan(Math.PI/4+latitude*radians/2)
  return [rho*Math.sin(longitude*radians),rho*Math.cos(longitude*radians)]
}
export function mapUnproject(layer:ImageLayer,x:number,y:number) {
  if(layer.projection==='geographic')return {latitude:y,longitude:wrapLongitude(x)}
  return {latitude:(2*Math.atan(Math.hypot(x,y)/(2*layer.radius_m))-Math.PI/2)/radians,longitude:wrapLongitude(Math.atan2(x,y)/radians)}
}
export function screenPoint(view:MapView,width:number,height:number,x:number,y:number):[number,number] {
  return [(x-view.x)/view.resolution+width/2,(view.y-y)/view.resolution+height/2]
}
export function mapPoint(view:MapView,width:number,height:number,x:number,y:number):[number,number] {
  return [view.x+(x-width/2)*view.resolution,view.y-(y-height/2)*view.resolution]
}
export function zoomMap(view:MapView,width:number,height:number,x:number,y:number,factor:number,layer:ImageLayer):MapView {
  const point=mapPoint(view,width,height,x,y)
  // No invented detail beyond the finest delivered source pixels (up to 2 CSS px/pixel).
  const resolution=Math.max(layer.levels.at(-1)!.resolution/2,Math.min(layer.levels[0].resolution*2,view.resolution*factor))
  return {x:point[0]-(x-width/2)*resolution,y:point[1]+(y-height/2)*resolution,resolution}
}
export function panMap(view:MapView,dx:number,dy:number):MapView {
  return {...view,x:view.x-dx*view.resolution,y:view.y+dy*view.resolution}
}
export function inImageBounds(layer:ImageLayer,x:number,y:number) {
  return x>=layer.bounds[0]&&x<=layer.bounds[2]&&y>=layer.bounds[1]&&y<=layer.bounds[3]
}
export function tileBounds(tile:ImageTile) {
  const layer=imageLayer(tile.layer),size=layer.levels[tile.level].resolution*256
  const left=layer.origin[0]+tile.column*size,top=layer.origin[1]-tile.row*size
  return [left,top-size,left+size,top] as const
}
export function visibleTiles(layer:ImageLayer,level:number,view:MapView,width:number,height:number):ImageTile[] {
  const grid=layer.levels[level],size=grid.resolution*256,[x0,y0,x1,y1]=layer.bounds
  const left=Math.max(x0,view.x-width/2*view.resolution),right=Math.min(x1,view.x+width/2*view.resolution)
  const bottom=Math.max(y0,view.y-height/2*view.resolution),top=Math.min(y1,view.y+height/2*view.resolution)
  if(left>=right||bottom>=top)return []
  const result:ImageTile[]=[]
  for(let row=Math.max(0,Math.floor((layer.origin[1]-top)/size));row<=Math.min(grid.height-1,Math.floor((layer.origin[1]-bottom-1e-9)/size));row++)
    for(let column=Math.max(0,Math.floor((left-layer.origin[0])/size));column<=Math.min(grid.width-1,Math.floor((right-layer.origin[0]-1e-9)/size));column++)result.push({layer:layer.id,level,row,column})
  return result
}
export function mapLevel(layer:ImageLayer,view:MapView,width:number,height:number,dpr=1) {
  let level=Math.min(layer.levels.length-1,Math.max(0,Math.ceil(Math.log2(layer.levels[0].resolution/view.resolution*Math.min(dpr,1.5)))))
  while(level>0&&visibleTiles(layer,level,view,width,height).length>28)level--
  return level
}
export function globeLevel(distance:number,height:number) {
  // Approximate projected source-pixel demand; the actual tile grid remains authoritative.
  return Math.min(8,Math.max(0,Math.ceil(Math.log2(Math.max(1,height/(256*Math.max(.015,distance-1)))))))
}
export function imageResolution(layer:ImageLayer,level:number) {
  const grid=layer.levels[level]
  if(!grid)return 'Source resolution pending'
  const value=grid.resolution
  return layer.units==='degrees'?`${value.toFixed(6)}°/px (~${(value*radians*layer.radius_m).toFixed(1)} m/px along a meridian)`:`${value.toFixed(2)} projected m/px`
}
export function mapScale(layer:ImageLayer,view:MapView) {
  const location=mapUnproject(layer,view.x,view.y)
  const mPerPixel=layer.units==='degrees'?view.resolution*radians*layer.radius_m*Math.max(.00001,Math.cos(location.latitude*radians)):view.resolution/(1+(Math.hypot(view.x,view.y)/(2*layer.radius_m))**2)
  const raw=mPerPixel*100,power=10**Math.floor(Math.log10(raw)),nice=[1,2,5,10].find(v=>v*power>=raw)!
  return {pixels:nice*power/mPerPixel,meters:nice*power}
}

/** A viewer owns its bitmaps: four transports, 48 decoded tiles, abort obsolete jobs.
 * Failed tiles cool down for 20 s. No synthetic images, no silent provider fallback. */
export class TilePool {
  private cache=new Map<string,ImageBitmap>()
  private running=new Map<string,AbortController>()
  private wanted=new Map<string,ImageTile>()
  private failed=new Map<string,number>()
  private disposed=false
  failures=0
  errorsFor(layer:string){return [...this.failed.keys()].filter(key=>key.startsWith(layer+'/')).length}
  constructor(private changed:()=>void,private fetcher:typeof fetch=(...args)=>fetch(...args),private decode:(blob:Blob)=>Promise<ImageBitmap>=blob=>createImageBitmap(blob),private limit=48){}
  get(tile:ImageTile){const key=tileKey(tile),image=this.cache.get(key);if(image){this.cache.delete(key);this.cache.set(key,image)}return image}
  sync(tiles:ImageTile[]){
    if(this.disposed)return
    this.wanted=new Map(tiles.slice(0,this.limit).map(tile=>[tileKey(tile),tile]))
    for(const [key,controller] of this.running)if(!this.wanted.has(key))controller.abort()
    this.pump()
  }
  private pump(){
    if(this.disposed)return
    for(const key of this.wanted.keys()){
      if(this.running.size>=4)break
      if(this.cache.has(key)||this.running.has(key)||(this.failed.get(key)||0)>Date.now())continue
      const controller=new AbortController();this.running.set(key,controller)
      const base=import.meta.env.VITE_API_BASE_URL||'/backend'
      void this.fetcher(`${base.replace(/\/$/,'')}/api/v1/imagery/tiles/${key}`,{signal:AbortSignal.any([controller.signal,AbortSignal.timeout(35000)])}).then(async response=>{
        if(!response.ok)throw new Error(`Tile HTTP ${response.status}`)
        const blob=await response.blob()
        if(!['image/jpeg','image/png'].includes(blob.type)||blob.size>2_000_000)throw new Error('Unsupported image format')
        const image=await this.decode(blob)
        if(controller.signal.aborted||this.disposed){image.close();return}
        if(image.width!==256||image.height!==256){image.close();throw new Error('Unexpected image dimensions')}
        this.cache.set(key,image);this.failed.delete(key)
        while(this.cache.size>this.limit){const oldest=this.cache.keys().next().value!;this.cache.get(oldest)!.close();this.cache.delete(oldest)}
      }).catch(()=>{if(!controller.signal.aborted&&!this.disposed){this.failures++;this.failed.set(key,Date.now()+20000);while(this.failed.size>128)this.failed.delete(this.failed.keys().next().value!)}}).finally(()=>{
        this.running.delete(key);if(!this.disposed){this.changed();this.pump()}
      })
    }
  }
  retry(){this.failed.clear();this.failures=0;this.pump()}
  dispose(){if(this.disposed)return;this.disposed=true;this.running.forEach(c=>c.abort());this.running.clear();this.wanted.clear();this.cache.forEach(i=>i.close());this.cache.clear()}
}
