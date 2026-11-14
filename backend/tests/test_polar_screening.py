from hashlib import sha256
import json
from pathlib import Path
import numpy as np
import pytest
from lunascend.terrain.polar_screening import polar_layer, scaled_values, ROOT


def test_pds_scale_masks_and_zero_are_distinct():
    raw=np.array([[0,-32768,25000]])
    values=scaled_values(raw,np.array([[True,False,True]]),.00004,0)
    assert values[0,0]==0 and np.isnan(values[0,1]) and values[0,2]==1
    assert scaled_values(np.array([-20000,20000]),np.array([True,True]),.000025,.5).tolist()==[0,1]


@pytest.mark.parametrize('layer',['solar','earth','shadow'])
def test_real_native_window_integrity_projection_and_meaning(layer):
    r=polar_layer(layer)
    assert r['shape']==[65,65] and len(r['values'])==4225 and len(r['corners'])==4356
    assert r['mode']=='long_term_environment' and r['reference_frame']=='MOON_ME_DE421'
    assert r['pixel_size_m']==60 and r['product_version']=='V1.05'
    assert all(v is None or 0<=v<=1 for v in r['values'])
    if layer=='shadow':assert set(r['values'])=={0,1}
    # Projection of retained first corner follows pinned native stereographic grid.
    from pyproj import Transformer
    t=Transformer.from_crs('+proj=longlat +R=1737400','+proj=stere +lat_0=-90 +lat_ts=-90 +lon_0=0 +R=1737400',always_xy=True)
    x,y=t.transform(r['corners'][0][1],r['corners'][0][0])
    assert x==pytest.approx(-12960,abs=1e-7) and y==pytest.approx(-10080,abs=1e-7)
    catalog=json.loads((ROOT/'data/manifests/polar-screening.json').read_text())
    source=next(p for p in catalog['products'] if p['id']==layer)
    assert source['bytes_transferred']<150000 and source['range_requests']<=100
    assert sha256((ROOT/'data/fixtures/polar-screening'/source['file']).read_bytes()).hexdigest()==source['sha256']


def test_invalid_values_cannot_enter_layer():
    with pytest.raises(ValueError):scaled_values(np.array([30000]),np.array([True]),.00004,0)
