"""Bounded acquisition of official polar DEM samples; no whole remote rasters.

Each marker is a valid DEM pixel, not an approved touchdown coordinate.
Existing Site01 data are never replaced. Run from the project root.
"""
import json
import re
from hashlib import sha256
from pathlib import Path
from urllib.request import urlopen
from urllib.parse import urljoin
import numpy as np
import rasterio
from rasterio.windows import Window
from pyproj import Transformer
from prepare_polar_screening import RangeSource

ROOT = Path(__file__).resolve().parents[1]
SOURCE = 'https://pgda.gsfc.nasa.gov/products/78'
NAMES = {'Site01':('Connecting Ridge','ridge'),'Site04':('Shackleton Rim','rim'),
 'Site06':('Nobile Rim 1','rim'),'Site07':('Peak Near Shackleton','study region'),
 'Site11':('de Gerlache Rim','rim'),'Site20':('Leibnitz Beta Plateau','plateau'),
 'Site23':('Malapert Massif','massif'),'Site42':('de Gerlache–Kocher Massif','massif'),
 'DM1':('Amundsen Rim','rim'),'DM2':('Nobile Rim 2','rim'),
 'SL3':('Connecting Ridge Extension','ridge'),'Haworth':('Haworth','crater area'),
 'Shoemaker':('Shoemaker','crater area')}

class CachedRangeSource(RangeSource):
    def _range(self,start,size):
        # GDAL strip reads often overlap. Cache bounded 128 KiB HTTP blocks.
        if size<=0:return b''
        block=131072;parts=[];end=start+size
        for offset in range(start//block*block,end,block):
            length=min(block,self.shared.get('size',offset+block)-offset)
            data=super()._range(offset,length)
            parts.append(data[max(0,start-offset):min(length,end-offset)])
        return b''.join(parts)

def main():
    with urlopen(SOURCE,timeout=30) as response: page=response.read(500000).decode()
    with urlopen('https://pgda.gsfc.nasa.gov/data/LOLA_5mpp/README',timeout=30) as response: readme=response.read(64000)
    evidence=ROOT/'data/manifests/polar-sites';evidence.mkdir(parents=True,exist_ok=True)
    (evidence/'README.source.txt').write_bytes(readme)
    links=[urljoin(SOURCE,u) for u in re.findall(r'href\s*=\s*["\']?([^\s>"\']+)',page,re.I)]
    previous=json.loads((evidence/'registry.json').read_text(encoding='utf-8'))['sites'] if (evidence/'registry.json').exists() else []
    records=[]
    for code,(name,kind) in NAMES.items():
        record={'id':f'pgda-{code.lower()}','name':name,'catalog_id':code,'category':'polar-study',
          'geographic_type':kind,'source':SOURCE,'reference_frame':'MOON_ME_DE421',
          'point_kind':'Dataset-area marker — not a landing-site coordinate.',
          'latitude':None,'longitude':None,'dataset_id':None}
        matches=[u for u in links if '/'+code+'/' in u and u.endswith('_surf.tif')]
        if not matches:
            record['missing_reason']='Catalog has no unambiguous surface DEM link.';records.append(record);print(code,record,flush=True);continue
        url=matches[0];record['source_url']=url
        cached=next((s for s in previous if s['id']==record['id'] and s.get('manifest')),None)
        if cached:
            manifest=json.loads((ROOT/cached['manifest']).read_text(encoding='utf-8'));target=ROOT/manifest['path']
            if target.exists() and sha256(target.read_bytes()).hexdigest()==manifest['sha256']:
                records.append(cached);print(code,'verified cached native window',flush=True);continue
        shared={'bytes':0,'requests':0,'cache':{}}
        def opener(path,mode='rb'):
            if path!='source.tif':raise FileNotFoundError(path)
            return CachedRangeSource(url,shared)
        try:
            with rasterio.Env(GDAL_DISABLE_READDIR_ON_OPEN='EMPTY_DIR'):
                with rasterio.open('source.tif',opener=opener) as src:
                    print(code,'source',src.shape,src.block_shapes,flush=True)
                    # Inspect a bounded interior area and select the closest valid
                    # four-pixel-supported sample to its center, not a map guess.
                    side=min(65,src.width,src.height)
                    window=Window((src.width-side)//2,(src.height-side)//2,side,side)
                    raw=src.read(1,window=window,masked=True)
                    valid=~np.ma.getmaskarray(raw)&np.isfinite(raw.data)
                    support=valid[:-1,:-1]&valid[1:,:-1]&valid[:-1,1:]&valid[1:,1:]
                    rows,cols=np.where(support)
                    if not len(rows):raise ValueError('No valid interior four-pixel support in bounded center window; no guessed marker.')
                    i=np.argmin((rows-side/2)**2+(cols-side/2)**2);r,c=int(rows[i]),int(cols[i])
                    transform=src.window_transform(window);x,y=transform*(c+.5,r+.5)
                    lon,lat=Transformer.from_crs(src.crs,src.crs.geodetic_crs,always_xy=True).transform(x,y)
                    dataset_id=f'pgda-{code.lower()}-5m-window-v1'
                    target=ROOT/'data/fixtures/polar-sites'/f'{code}-window.tif';target.parent.mkdir(parents=True,exist_ok=True)
                    profile=src.profile.copy();profile.update(driver='GTiff',width=side,height=side,transform=transform)
                    with rasterio.open(target,'w',**profile) as dst:
                        dst.write(raw.filled(src.nodata),1);dst.write_mask(valid);dst.scales=src.scales;dst.offsets=src.offsets
                    m={'source_kind':'official','citation':'NASA PGDA product 78; Barker et al. (2021), doi:10.1016/j.pss.2020.105119. No NASA endorsement.','schema_version':'1.0','dataset_id':dataset_id,'name':name+' bounded NASA DEM window',
                      'product_version':url.rsplit('/',1)[1]+'; '+str(shared.get('last_modified')),
                      'source_url':url,'documentation_url':SOURCE,'path':target.relative_to(ROOT).as_posix(),
                      'bytes':target.stat().st_size,'sha256':sha256(target.read_bytes()).hexdigest(),
                      'reference_frame':'MOON_ME_DE421','units':'m','reference_radius_m':1737400,
                      'vertical_reference':'Height in meters above 1737400 m sphere','projection':src.crs.to_wkt(),
                      'width':side,'height':side,'transform':list(transform)[:6],
                      'scale':src.scales[0],'offset':src.offsets[0],'nodata':'NaN' if np.isnan(src.nodata) else src.nodata,
                      'pixel_resolution_m':abs(transform.a),'source_shape':[src.height,src.width],
                      'source_window':[int(window.col_off),int(window.row_off),side,side],
                      'source_bytes':shared['size'],'bytes_transferred':shared['bytes'],
                      'uncertainty':'5 m grid spacing is not independent accuracy. Separate source-pixel slope/RMS/LDEC samples are available; uncertainty is not propagated into horizon or engineering models.',
                      'readme_sha256':sha256(readme).hexdigest()}
                    (evidence/f'{code}.json').write_text(json.dumps(m,indent=2)+'\n',encoding='utf-8')
                    record.update(latitude=lat,longitude=lon,dataset_id=dataset_id,elevation_m=float(raw[r,c]*src.scales[0]+src.offsets[0]),
                      manifest=f'data/manifests/polar-sites/{code}.json',missing_reason=None,
                      representative_pixel=[int(window.row_off)+r,int(window.col_off)+c])
        except Exception as error:record['missing_reason']=str(error)
        records.append(record);print(code,record,flush=True)
        (evidence/'registry.json').write_text(json.dumps({'version':'pgda-valid-pixel-v1','source':SOURCE,'sites':records},indent=2)+'\n',encoding='utf-8')
    (evidence/'registry.json').write_text(json.dumps({'version':'pgda-valid-pixel-v1','source':SOURCE,'sites':records},indent=2)+'\n',encoding='utf-8')

if __name__=='__main__':main()
