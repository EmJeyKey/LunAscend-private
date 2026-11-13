"""Analytical mesh/georeferencing cases; fixtures are explicitly synthetic."""
from pathlib import Path
import json
import pytest
from pydantic import ValidationError
np=pytest.importorskip('numpy')
pytest.importorskip('rasterio')
pytest.importorskip('pyproj')
from test_terrain import synthetic
from lunascend.contracts.visualization import MeshRequest,InspectionRequest
from lunascend.terrain.visualization import analyze_mesh,inspect_terrain,retained_axis
from lunascend.terrain.dem import LunarDEM,TerrainError
from lunascend.terrain.geometry import RADIUS_M,local_basis,unit_lonlat


def setup(tmp_path,values=None,**kwargs):
    config,anchor=synthetic(tmp_path,values,**kwargs)
    request=MeshRequest(dataset_id=anchor.dataset_id,latitude_deg=anchor.latitude_deg,longitude_deg=anchor.longitude_deg,
        reference_frame='MOON_ME_DE421',observer_height_m=2.0,half_extent_m=500.0,max_grid_side=33)
    return config,request


def test_bounded_window_original_values_georeference_and_datum(tmp_path):
    config,request=setup(tmp_path,np.full((401,401),100.0),scale=2.0,offset=3.0)
    mesh=analyze_mesh(request,config)
    assert max(mesh.grid_shape)<=33 and len(mesh.positions_m)<=1089
    assert mesh.surface_elevation_m==pytest.approx(203.0)
    assert mesh.original_elevation_range_m==(203.0,203.0)
    assert mesh.source_sha256==config.manifest['sha256']
    assert mesh.observer_scene_m==(0.0,2.0,0.0)
    assert mesh.reference_frame=='MOON_ME_DE421' and mesh.reference_radius_m==1737400
    assert 'SYNTHETIC' in mesh.warnings[-1]
    assert mesh.projected_x_m[1]>mesh.projected_x_m[0] and mesh.projected_y_m[1]<mesh.projected_y_m[0]
    assert len(mesh.model_dump_json())<400000


def test_spherical_body_and_scene_roundtrip_handedness_and_triangle_normals(tmp_path):
    config,request=setup(tmp_path)
    mesh=analyze_mesh(request,config)
    basis=np.asarray(mesh.body_to_scene)
    assert np.linalg.det(basis)==pytest.approx(1.0,abs=1e-14)
    assert basis@basis.T==pytest.approx(np.eye(3),abs=1e-14)
    for i in (0,len(mesh.positions_m)//2,len(mesh.positions_m)-1):
        body=np.asarray(mesh.body_origin_m)+basis.T@mesh.positions_m[i]
        lon,lat=unit_lonlat(body)
        assert lat==pytest.approx(mesh.latitude_deg[i],abs=1e-12)
        assert lon==pytest.approx(mesh.longitude_deg[i],abs=1e-12)
        assert np.linalg.norm(body)==pytest.approx(RADIUS_M+mesh.elevation_m[i],abs=1e-8)
    for i in range(0,len(mesh.indices),3):
        a,b,c=mesh.indices[i:i+3]
        p=np.asarray(mesh.positions_m)
        normal=np.cross(p[b]-p[a],p[c]-p[a])
        assert normal@np.asarray(mesh.radial_vectors_scene[a])>0
    assert mesh.boundary_edges


def test_geographic_projection_roundtrip_and_east_positive_south_pole_region(tmp_path):
    config,request=setup(tmp_path)
    with LunarDEM(config) as dem:
        for lon in (-3.0,0.0,3.0):
            x,y=dem.to_map.transform(lon,request.latitude_deg)
            back_lon,back_lat=dem.to_geo.transform(x,y)
            assert back_lon==pytest.approx(lon,abs=1e-12)
            assert back_lat==pytest.approx(request.latitude_deg,abs=1e-12)
            assert np.sign(x)==np.sign(lon)
    up,east,north=local_basis(request.latitude_deg,0.0)
    assert east==pytest.approx([0,1,0])
    assert np.cross(east,north)==pytest.approx(up)


def test_interior_nodata_is_not_bridged_even_when_retained_vertices_are_known(tmp_path):
    config,request=setup(tmp_path)
    initial=analyze_mesh(request,config)
    with LunarDEM(config) as dem:
        col,row=(~dem.dataset.transform)@(initial.projected_x_m[0],initial.projected_y_m[0])
    values=np.zeros((401,401),dtype='float32')
    values[int(row)+1,int(col)+1]=np.nan
    config,request=setup(tmp_path,values)
    mesh=analyze_mesh(request,config)
    assert all(v is not None for v in mesh.elevation_m)
    assert mesh.nodata_pixels==1 and mesh.omitted_cells>0
    assert len(mesh.indices)==(mesh.grid_shape[0]-1)*(mesh.grid_shape[1]-1)*6-mesh.omitted_cells*6
    assert all(mesh.positions_m[i] is not None for i in mesh.indices)


def test_clipped_window_never_fabricates_outside_dataset(tmp_path):
    config,request=setup(tmp_path)
    with LunarDEM(config) as dem:
        lon,lat=dem.to_geo.transform(1800.0,9000.0)
    mesh=analyze_mesh(MeshRequest(**{**request.model_dump(),'latitude_deg':lat,'longitude_deg':lon,'half_extent_m':1000.0}),config)
    assert mesh.projected_x_m[-1]<mesh.dataset_bounds_m[2]
    assert mesh.requested_bounds_m[2]>mesh.dataset_bounds_m[2]
    assert max(mesh.grid_shape)<=33


def test_inspection_uses_original_dem_and_source_frame_not_visual_exaggeration(tmp_path):
    config,request=setup(tmp_path,np.full((401,401),25.0))
    mesh=analyze_mesh(request,config)
    i=len(mesh.positions_m)//2
    sample=inspect_terrain(InspectionRequest(anchor=request,latitude_deg=mesh.latitude_deg[i],longitude_deg=mesh.longitude_deg[i]),config)
    assert sample.elevation_m==pytest.approx(25.0)
    assert sample.source_sha256==mesh.source_sha256
    assert sample.input_frame_latitude_deg==pytest.approx(sample.latitude_deg)
    assert sample.distance_from_site_m>=0
    with pytest.raises(TerrainError):
        inspect_terrain(InspectionRequest(anchor=request,latitude_deg=-85.0,longitude_deg=120.0),config)


@pytest.mark.parametrize('patch',[{'half_extent_m':4001.0},{'max_grid_side':1000},{'latitude_deg':-90.0},{'latitude_deg':float('nan')},
    {'reference_frame':'IAU_MOON'},{'reference_frame':'MOON_ME_DE440_ME421','coordinate_epoch_utc':None}])
def test_invalid_visualization_request_is_rejected(patch):
    with pytest.raises(ValidationError):MeshRequest(**{'latitude_deg':-89.0,'longitude_deg':0.0,'reference_frame':'MOON_ME_DE421',**patch})


def test_missing_dataset_and_arbitrary_path_are_not_substituted():
    request=MeshRequest(dataset_id='../private.tif',latitude_deg=-89.0,longitude_deg=0.0,reference_frame='MOON_ME_DE421')
    with pytest.raises(TerrainError) as exc:analyze_mesh(request)
    assert exc.value.error.code=='MISSING_DATA'


def test_exact_frame_bridge_preserves_existing_site01_height():
    root=Path(__file__).parents[2]
    saved=json.loads((root/'docs/validation/step-7.5-results.json').read_text(encoding='utf-8'))['result']
    site=saved['request']['site']
    request=MeshRequest(latitude_deg=site['latitude_deg'],longitude_deg=site['longitude_deg'],reference_frame='MOON_ME_DE440_ME421',
        coordinate_epoch_utc=saved['request']['start_utc'],observer_height_m=site['observer_height_m'],half_extent_m=250.0,max_grid_side=33)
    from lunascend.terrain.dem import DatasetConfiguration
    if not DatasetConfiguration.selected(request.dataset_id).path.exists():pytest.skip('Pinned NASA DEM not installed')
    mesh=analyze_mesh(request)
    assert mesh.native_latitude_deg==pytest.approx(saved['terrain_visibility']['native_latitude_deg'],abs=1e-11)
    assert mesh.native_longitude_deg==pytest.approx(saved['terrain_visibility']['native_longitude_deg'],abs=1e-11)
    assert mesh.surface_elevation_m==pytest.approx(saved['terrain_visibility']['surface_elevation_m'],abs=1e-7)


def test_api_invalid_limits_and_missing_dataset_are_structured():
    from fastapi.testclient import TestClient
    from lunascend.main import create_app
    with TestClient(create_app()) as client:
        body={'latitude_deg':-89.0,'longitude_deg':0.0,'reference_frame':'MOON_ME_DE421','dataset_id':'missing'}
        response=client.post('/api/v1/terrain/mesh',json=body)
        assert response.status_code==503 and response.json()['errors'][0]['code']=='MISSING_DATA'
        body['max_grid_side']=200
        assert client.post('/api/v1/terrain/mesh',json=body).status_code==422


def test_retained_axis_includes_both_endpoints_once():
    assert retained_axis(10,4).tolist()==[0,4,8,9]
    assert retained_axis(9,4).tolist()==[0,4,8]

def test_visualization_concurrency_bound_returns_explicit_resource_error(monkeypatch):
    import asyncio
    from lunascend.api import terrain
    async def check():
        lock=asyncio.Lock()
        monkeypatch.setattr(terrain,'_visualization_lock',lock)
        request=MeshRequest(latitude_deg=-89.0,longitude_deg=0.0,reference_frame='MOON_ME_DE421')
        async with lock:
            response=await terrain.visualization_product(request)
            assert response.status_code==422
            assert b'RESOURCE_LIMIT' in response.body
    asyncio.run(check())
