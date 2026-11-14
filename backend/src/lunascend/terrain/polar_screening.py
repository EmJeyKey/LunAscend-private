"""Small, hash-pinned NASA long-term windows; independent of mission calculations."""
from functools import lru_cache
from hashlib import sha256
import json
from pathlib import Path
import numpy as np
import rasterio
from pyproj import CRS, Transformer

ROOT=Path(__file__).resolve().parents[4]
MANIFEST=ROOT/'data/manifests/polar-screening.json'


def scaled_values(raw, mask, scale, offset):
    values=raw.astype('float64')*scale+offset
    if not np.isfinite(values[mask]).all() or np.any(values[mask]<0) or np.any(values[mask]>1):
        raise ValueError('Invalid NASA product scaling')
    return np.where(mask,values,np.nan)


@lru_cache(maxsize=3)
def polar_layer(layer: str) -> dict:
    catalog=json.loads(MANIFEST.read_text(encoding='utf-8'))
    record=next((r for r in catalog['products'] if r['id']==layer),None)
    if record is None:raise ValueError('Unsupported polar layer')
    directory=ROOT/'data/fixtures/polar-screening'
    path=directory/record['file'];label=directory/(record['product_id']+'.LBL')
    if sha256(path.read_bytes()).hexdigest()!=record['sha256'] or sha256(label.read_bytes()).hexdigest()!=record['label_sha256']:
        raise ValueError('NASA window or PDS label checksum mismatch')
    with rasterio.open(path) as source:
        expected=CRS.from_proj4('+proj=stere +lat_0=-90 +lat_ts=-90 +lon_0=0 +R=1737400 +units=m +no_defs')
        actual=CRS.from_wkt(source.crs.to_wkt())
        if source.shape!=(65,65) or source.count!=1 or not actual.equals(expected,ignore_axis_order=True) or list(source.transform)[:6]!=record['transform'] or source.scales[0]!=record['scale'] or source.offsets[0]!=record['offset'] or source.nodata!=record['nodata']:
            raise ValueError('Incompatible NASA raster metadata')
        raw=source.read(1);mask=source.read_masks(1)>0
        values=scaled_values(raw,mask,source.scales[0],source.offsets[0])
        if layer=='shadow' and not np.isin(values[mask],[0.,1.]).all():raise ValueError('Nonbinary shadow product')
        inverse=Transformer.from_crs(actual,actual.geodetic_crs,always_xy=True)
        rows,cols=np.meshgrid(np.arange(66),np.arange(66),indexing='ij')
        x=source.transform.c+cols*source.transform.a;y=source.transform.f+rows*source.transform.e
        longitude,latitude=inverse.transform(x,y)
        return {'layer':layer,'version':catalog['version'],'product':record['product_id'],'product_version':record['product_version'],
            'reference_frame':'MOON_ME_DE421','mode':'long_term_environment','pixel_size_m':60,'shape':[65,65],
            'values':[float(v) if np.isfinite(v) else None for v in values.flat],
            'corners':[[float(lat),float(lon)] for lat,lon in zip(latitude.flat,longitude.flat)],
            'units':'binary_shadow' if layer=='shadow' else 'fraction_any_disk_visible',
            'source_sha256':record['sha256'],'label_sha256':record['label_sha256'],
            'source_url':record['source_url'],'attribution':catalog['attribution'],
            'coverage':catalog['region'],'time_basis':'NASA hourly model over approximately 18.6 years; label acquisition dates describe input observations, not a selected mission date.',
            'limitations':['Only this native 3.9 km square is installed. Outside it is not evaluated.',
                'Any-disk visibility is not Earth-center DTE or a radio link.',
                'Nominal overlay on photographs; exact image-to-DE421 registration is unverified.',
                'This is a NASA model raster, not a guarantee of permanent shadow or sunlight at a mission epoch.']}
