"""Read only a registered 2x2 source quality window at each retained DEM point."""
from concurrent.futures import ThreadPoolExecutor
import json
from pathlib import Path
import re
from urllib.request import urlopen
import numpy as np
import rasterio
from rasterio.windows import Window
from prepare_site_registry import CachedRangeSource, ROOT, SOURCE

def sample(task):
    site,kind,url=task;shared={'bytes':0,'requests':0,'cache':{}}
    result={'site_id':site['id'],'quantity':kind,'source_url':url}
    def opener(path,mode='rb'):
        if path!='quality.tif':raise FileNotFoundError(path)
        return CachedRangeSource(url,shared)
    try:
        meta=json.loads((ROOT/site['manifest']).read_text())
        with rasterio.Env(GDAL_DISABLE_READDIR_ON_OPEN='EMPTY_DIR'):
            with rasterio.open('quality.tif',opener=opener) as src:
                from pyproj import CRS,Transformer
                if abs(src.transform.a)!=5 or abs(src.transform.e)!=5 or src.crs.to_dict().get('proj')!='stere':raise ValueError('Unexpected quality grid')
                row,col=site['representative_pixel'];a,b,x0,d,e,y0=meta['transform'];x=x0+a*(col-meta['source_window'][0]+.5);y=y0+e*(row-meta['source_window'][1]+.5)
                qx,qy=Transformer.from_crs(CRS.from_wkt(meta['projection']),src.crs,always_xy=True).transform(x,y)
                row,col=src.index(qx,qy)
                if row<0 or col<0 or row+1>=src.height or col+1>=src.width:raise ValueError('Representative point outside quality raster')
                window=Window(col,row,2,2)
                raw=src.read(1,window=window,masked=True)
                result.update(value=None if np.ma.getmaskarray(raw)[0,0] else float(raw[0,0]*src.scales[0]+src.offsets[0]),
                  source_pixel=[row,col],scale=src.scales[0],offset=src.offsets[0],bytes_transferred=shared['bytes'])
    except Exception as error:result.update(value=None,missing_reason=str(error))
    print(site['id'],kind,result.get('value'),flush=True);return result

def main():
    registry=json.loads((ROOT/'data/manifests/polar-sites/registry.json').read_text())
    with urlopen(SOURCE,timeout=30) as response:page=response.read(500000).decode()
    links=re.findall(r'href\s*=\s*["\']?([^\s>"\']+)',page,re.I);tasks=[]
    for site in registry['sites']:
        for suffix,kind in [('slp','slope_deg'),('toterr','height_rms_m'),('slperr','slope_rms_deg'),('ldec','return_count')]:
            matches=[u for u in links if '/'+site['catalog_id']+'/' in u and u.endswith('_'+suffix+'.tif')]
            if matches and site['dataset_id']:tasks.append((site,kind,matches[0]))
    saved=ROOT/'data/manifests/polar-sites/quality.json'
    old=json.loads(saved.read_text())['samples'] if saved.exists() else []
    accepted={(r['site_id'],r['quantity']):r for r in old if r.get('value') is not None}
    tasks=[t for t in tasks if (t[0]['id'],t[1]) not in accepted]
    with ThreadPoolExecutor(max_workers=3) as pool:results=[*accepted.values(),*pool.map(sample,tasks)]
    (ROOT/'data/manifests/polar-sites/quality.json').write_text(json.dumps({'source':SOURCE,'meaning':'Native source pixel values, not propagated uncertainty or landing safety. LDEC is the native source product value; fractional values are retained without interpreting them as fractional observations.','samples':results},indent=2)+'\n',encoding='utf-8')

if __name__=='__main__':main()
