"""Acquire a small native NASA raster window using enforced, budgeted HTTP ranges.

Run with the existing terrain environment. Never fetch the entire polar raster.
"""
import io
import json
import re
from hashlib import sha256
from pathlib import Path
from urllib.request import Request, urlopen
import numpy as np
import rasterio
from rasterio.windows import Window
from pyproj import Transformer

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'data/fixtures/polar-screening'
PRODUCTS = {'solar':'AVGVISIB_85S_060M_201608', 'earth':'AVGVISIB_85S_060M_201608_EARTH', 'shadow':'LPSR_85S_060M_201608'}


class RangeSource(io.RawIOBase):
    """A single file handle with an 8 MB transfer and 100 request ceiling."""
    def __init__(self, url, shared):
        self.url,self.shared,self.position=url,shared,0
        if 'size' not in shared:
            self._range(0,16384)
    def readable(self): return True
    def seekable(self): return True
    def tell(self): return self.position
    def seek(self,offset,whence=0):
        self.position=offset if whence==0 else self.position+offset if whence==1 else self.shared['size']+offset
        if self.position<0: raise ValueError('negative seek')
        return self.position
    def _range(self,start,size):
        key=(start,size)
        if key in self.shared['cache']: return self.shared['cache'][key]
        if size>1_000_000 or self.shared['bytes']+size>8_000_000 or self.shared['requests']>=100:
            raise ValueError('NASA range budget exceeded')
        with urlopen(Request(self.url,headers={'Range':f'bytes={start}-{start+size-1}'}),timeout=20) as response:
            match=re.fullmatch(r'bytes (\d+)-(\d+)/(\d+)',response.headers.get('Content-Range',''))
            if response.status!=206 or not match or int(match[1])!=start or response.headers.get_content_type()!='image/tiff':
                raise ValueError('Source must return bounded TIFF byte ranges')
            data=response.read(size+1)
            if len(data)>size: raise ValueError('Range exceeded')
            self.shared.update(size=int(match[3]),etag=response.headers.get('ETag'),last_modified=response.headers.get('Last-Modified'))
        self.shared['bytes']+=len(data);self.shared['requests']+=1;self.shared['cache'][key]=data
        return data
    def read(self,size=-1):
        if self.position>=self.shared['size']: return b''
        if size<0: raise ValueError('Whole-raster reads prohibited')
        size=min(size,self.shared['size']-self.position)
        if not size:return b''
        data=self._range(self.position,size);self.position+=len(data);return data


def main():
    OUT.mkdir(parents=True,exist_ok=True)
    records=[]
    for kind,product in PRODUCTS.items():
        url=f'https://pgda.gsfc.nasa.gov/data/MoonIllumination/{product}.TIF'
        label_url=f'https://imbrium.mit.edu/EXTRAS/ILLUMINATION/IMG/{product}.LBL'
        with urlopen(label_url,timeout=20) as response: label=response.read(64001)
        if len(label)>64000 or b'PDS_VERSION_ID' not in label: raise ValueError('Invalid source label')
        (OUT/f'{product}.LBL').write_bytes(label)
        text=label.decode();shared={'bytes':0,'requests':0,'cache':{}}
        def opener(path,mode='rb'):
            if path!=f'{product}.tif':raise FileNotFoundError(path)
            return RangeSource(url,shared)
        with rasterio.Env(GDAL_DISABLE_READDIR_ON_OPEN='EMPTY_DIR'):
            with rasterio.open(f'{product}.tif',opener=opener) as source:
                transformer=Transformer.from_crs('+proj=longlat +R=1737400 +no_defs',source.crs,always_xy=True)
                x,y=transformer.transform(-137.5,-89.463158)
                row,col=source.index(x,y);window=Window(col-32,row-32,65,65)
                raw=source.read(1,window=window,masked=True)
                values=raw.astype('float64')*source.scales[0]+source.offsets[0]
                profile=source.profile.copy();profile.update(width=65,height=65,transform=source.window_transform(window),driver='GTiff')
                filename=f'{kind}-site01-60m.tif'
                with rasterio.open(OUT/filename,'w',**profile) as dest:
                    dest.write(raw.filled(source.nodata or 0),1);dest.write_mask(~np.ma.getmaskarray(raw));dest.scales=source.scales;dest.offsets=source.offsets
                records.append({'id':kind,'product_id':product,'product_version':re.search(r'PRODUCT_VERSION_ID\s*=\s*"([^"]+)',text)[1],
                    'file':filename,'sha256':sha256((OUT/filename).read_bytes()).hexdigest(),'source_url':url,'label_url':label_url,'label_sha256':sha256(label).hexdigest(),
                    'source_shape':[source.height,source.width],'window':[int(window.col_off),int(window.row_off),65,65],
                    'source_crs_wkt':source.crs.to_wkt(),'transform':list(source.window_transform(window))[:6],'scale':source.scales[0],'offset':source.offsets[0],
                    'nodata':source.nodata,'valid_pixels':int(raw.count()),'raw_range':[float(raw.min()),float(raw.max())],
                    'scaled_range':[float(values.min()),float(values.max())],'source_etag':shared['etag'],'source_bytes':shared['size'],
                    'bytes_transferred':shared['bytes'],'range_requests':shared['requests'],'reference_frame':'MOON_ME_DE421'})
        print(kind,records[-1],flush=True)
    (ROOT/'data/manifests/polar-screening.json').write_text(json.dumps({'version':'nasa-pgda-polar-window-v1','region':'Site01 context window only; 65 × 65 native 60 m pixels',
        'meaning':'Long-term NASA model products, not selected-date predictions or flight safety.',
        'source':'https://pgda.gsfc.nasa.gov/products/69','attribution':'NASA/LOLA team; cite Mazarico et al. (2011), doi:10.1016/j.icarus.2010.10.030. No agency endorsement.',
        'products':records},indent=2)+'\n',encoding='utf-8')


if __name__=='__main__':main()
