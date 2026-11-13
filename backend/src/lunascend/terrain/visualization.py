"""Retained real pixel centers, spherical Cartesian placement, masked indexed mesh."""
from collections import Counter
import numpy as np
from lunascend.contracts.visualization import MeshRequest, TerrainMesh, InspectionRequest, TerrainInspection
from .dem import DatasetConfiguration, LunarDEM
from .frames import frame_rotation
from .geometry import local_basis, unit_lonlat, RADIUS_M
from .errors import TerrainError


def resolve(request: MeshRequest) -> tuple[np.ndarray, dict, float, float]:
    matrix, metadata = frame_rotation(request.terrain_anchor())
    lon,lat = unit_lonlat(matrix @ local_basis(request.latitude_deg,request.longitude_deg)[0])
    return matrix,metadata,float(lat),float(lon)


def retained_axis(count: int, stride: int) -> np.ndarray:
    values = list(range(0,count,stride))
    if values[-1]!=count-1: values.append(count-1)
    return np.asarray(values,dtype=int)


def analyze_mesh(request: MeshRequest, configuration: DatasetConfiguration | None = None) -> TerrainMesh:
    config = configuration or DatasetConfiguration.selected(request.dataset_id)
    _,bridge,lat,lon = resolve(request)
    with LunarDEM(config) as dem:
        surface = dem.elevation(lon,lat)
        cx,cy = dem.to_map.transform(lon,lat)
        extent = request.half_extent_m
        bounds = (cx-extent,cy-extent,cx+extent,cy+extent)
        corner_lon,corner_lat = dem.to_geo.transform(np.array([bounds[0],bounds[2]]),np.array([bounds[1],bounds[3]]))
        window = dem.window_for(corner_lon,corner_lat)
        values = window.values
        rows,cols = values.shape
        stride = max(1,int(np.ceil((max(rows,cols)-1)/(request.max_grid_side-1))))
        rr,cc = retained_axis(rows,stride),retained_axis(cols,stride)
        affine = dem.dataset.window_transform(window.window)
        xs = affine.c+(cc+.5)*affine.a
        ys = affine.f+(rr+.5)*affine.e
        xx,yy = np.meshgrid(xs,ys)
        longitudes,latitudes = dem.to_geo.transform(xx,yy)
        la,lo = np.deg2rad(latitudes.ravel()),np.deg2rad(longitudes.ravel())
        units = np.stack((np.cos(la)*np.cos(lo),np.cos(la)*np.sin(lo),np.sin(la)),axis=1)
        heights = values[np.ix_(rr,cc)].ravel()
        up,east,north = local_basis(lat,lon)
        basis = np.stack((east,up,-north))  # determinant +1; scene X east, Y up, Z south.
        origin = up*(RADIUS_M+surface)
        positions = ((RADIUS_M+heights[:,None])*units-origin) @ basis.T
        radial = units @ basis.T
        # Integral mask prevents decimation from bridging ANY missing source pixel.
        invalid = ~np.isfinite(values)
        prefix = np.pad(invalid.astype(np.int32).cumsum(0,dtype=np.int32).cumsum(1,dtype=np.int32),((1,0),(1,0)))
        indices,omitted = [],0
        width = len(cc)
        for row in range(len(rr)-1):
            for col in range(len(cc)-1):
                a,b,c,d = row*width+col,row*width+col+1,(row+1)*width+col,(row+1)*width+col+1
                r0,r1,c0,c1 = rr[row],rr[row+1]+1,cc[col],cc[col+1]+1
                missing = prefix[r1,c1]-prefix[r0,c1]-prefix[r1,c0]+prefix[r0,c0]
                if missing:
                    omitted += 1
                    continue
                for triangle in ((a,c,b),(b,c,d)):
                    i,j,k = triangle
                    if np.dot(np.cross(positions[j]-positions[i],positions[k]-positions[i]),radial[i]+radial[j]+radial[k])<0:
                        j,k = k,j
                    indices.extend((i,j,k))
        edges = Counter(tuple(sorted(pair)) for i in range(0,len(indices),3) for pair in
            ((indices[i],indices[i+1]),(indices[i+1],indices[i+2]),(indices[i+2],indices[i])))
        finite = values[np.isfinite(values)]
        retained = heights[np.isfinite(heights)]
        if retained.size==0:
            raise TerrainError('OUTSIDE_COVERAGE','No retained valid DEM samples at this visualization resolution; choose a smaller window or finer mesh.')
        warnings = (
            'Visualization mesh only: retained original pixel-center heights; not a scientific horizon or hazard model.',
            'Missing source pixels invalidate whole decimated cells; no triangles fill nodata or terrain outside the window.',
            'Original elevations are meters above the 1737400 m sphere in MOON_ME_DE421; source spacing is not effective accuracy.',
            'Scene is a proper rotation of spherical body-fixed positions: X east, Y radial up, Z minus north; origin is the selected DEM surface.',
            'Vertical exaggeration is rendering only, relative to selected-site elevation; body direction arrows retain true angles.',
            'Lighting is illustrative; rendered shadows/intersections do not establish illumination or radio-link availability.',
        )
        if config.manifest.get('source_kind')=='synthetic':
            warnings=(*warnings,'SYNTHETIC TEST TERRAIN: analytical fixture only; not NASA terrain.')
        return TerrainMesh(request=request,vertical_reference=dem.meta['vertical_reference'],crs_wkt=dem.dataset.crs.to_wkt(),
            source_url=dem.meta['source_url'],source_sha256=dem.meta['sha256'],source_pixel_spacing_m=dem.meta['pixel_resolution_m'],
            source_window_shape=(rows,cols),grid_shape=(len(rr),len(cc)),source_stride_pixels=stride,
            projected_x_m=tuple(xs),projected_y_m=tuple(ys),requested_bounds_m=bounds,dataset_bounds_m=tuple(dem.dataset.bounds),
            native_latitude_deg=lat,native_longitude_deg=lon,surface_elevation_m=surface,
            observer_scene_m=(0.0,request.observer_height_m,0.0),body_origin_m=tuple(origin),body_to_scene=tuple(map(tuple,basis)),
            frame_transform=bridge,positions_m=tuple(tuple(p) if np.isfinite(h) else None for p,h in zip(positions,heights)),
            radial_vectors_scene=tuple(map(tuple,radial)),latitude_deg=tuple(latitudes.ravel()),longitude_deg=tuple(longitudes.ravel()),
            elevation_m=tuple(float(h) if np.isfinite(h) else None for h in heights),indices=tuple(indices),
            boundary_edges=tuple(pair for pair,count in edges.items() if count==1),
            original_elevation_range_m=(float(finite.min()),float(finite.max())),mesh_elevation_range_m=(float(retained.min()),float(retained.max())),
            nodata_pixels=int(invalid.sum()),omitted_cells=omitted,warnings=warnings)


def inspect_terrain(request: InspectionRequest, configuration: DatasetConfiguration | None = None) -> TerrainInspection:
    matrix,_,lat,lon = resolve(request.anchor)
    config = configuration or DatasetConfiguration.selected(request.anchor.dataset_id)
    with LunarDEM(config) as dem:
        # Original DEM interpolation, never a ray/triangle-interpolated mesh height.
        height = dem.elevation(request.longitude_deg,request.latitude_deg)
        u0 = local_basis(lat,lon)[0]
        u = local_basis(request.latitude_deg,request.longitude_deg)[0]
        angle = float(np.arctan2(np.linalg.norm(np.cross(u0,u)),np.dot(u0,u)))
        if angle*RADIUS_M>request.anchor.half_extent_m*3:
            raise TerrainError('RESOURCE_LIMIT','Inspected point is outside the bounded selected-site neighborhood.')
        input_lon,input_lat = unit_lonlat(matrix.T @ u)
        return TerrainInspection(latitude_deg=request.latitude_deg,longitude_deg=request.longitude_deg,elevation_m=height,
            distance_from_site_m=angle*RADIUS_M,input_frame_latitude_deg=float(input_lat),input_frame_longitude_deg=float(input_lon),
            input_reference_frame=request.anchor.reference_frame,coordinate_epoch_utc=request.anchor.coordinate_epoch_utc,
            dataset_id=request.anchor.dataset_id,source_sha256=dem.meta['sha256'])
