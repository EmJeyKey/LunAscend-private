"""Reproduce actual Site01 mesh/inspection; compare with existing saved science."""
from hashlib import sha256
import json
from time import perf_counter
from pathlib import Path
from lunascend.contracts.visualization import MeshRequest, InspectionRequest
from .visualization import analyze_mesh, inspect_terrain
from .dem import ROOT


def main() -> None:
    evidence=json.loads((ROOT/'docs/validation/step-9-results.json').read_text(encoding='utf-8'))['response']['baseline']
    site=evidence['request']['site']
    request=MeshRequest(latitude_deg=site['latitude_deg'],longitude_deg=site['longitude_deg'],reference_frame='MOON_ME_DE440_ME421',
        coordinate_epoch_utc=evidence['request']['start_utc'],observer_height_m=site['observer_height_m'],half_extent_m=1000.0,max_grid_side=65)
    start=perf_counter();mesh=analyze_mesh(request);elapsed=perf_counter()-start
    inspection=inspect_terrain(InspectionRequest(anchor=request,latitude_deg=mesh.native_latitude_deg,longitude_deg=mesh.native_longitude_deg))
    residual=mesh.surface_elevation_m-evidence['terrain_visibility']['surface_elevation_m']
    if abs(residual)>1e-7:raise RuntimeError('Mesh anchor differs from the existing scientific observer surface')
    sources=[ROOT/'backend/src/lunascend/terrain/visualization.py',ROOT/'backend/src/lunascend/contracts/visualization.py',Path(__file__)]
    report={'report_id':'step-10-site01-visualization-v1','mesh_runtime_s':elapsed,
        'source_sha256':{str(p.relative_to(ROOT)).replace('\\','/'):sha256(p.read_bytes()).hexdigest() for p in sources},
        'mesh':mesh.model_dump(mode='json'),'inspection':inspection.model_dump(mode='json'),
        'surface_residual_vs_step9_m':residual,'vertical_exaggeration':1,
        'directions_source':'Existing saved Step 9 SPICE/LOLA baseline; not a new ephemeris comparison or independent rendering validation',
        'scientific_first':evidence['observations'][0],'native_first':evidence['terrain_visibility']['observations'][0],
        'scientific_last':evidence['observations'][-1],'native_last':evidence['terrain_visibility']['observations'][-1]}
    (ROOT/'docs/validation/step-10-results.json').write_text(json.dumps(report,separators=(',',':'),allow_nan=False)+'\n',encoding='utf-8')
    print(json.dumps({'runtime_s':elapsed,'grid':mesh.grid_shape,'triangles':len(mesh.indices)//3,'source_range_m':mesh.original_elevation_range_m,
        'mesh_range_m':mesh.mesh_elevation_range_m,'datum':mesh.vertical_reference,'surface_residual_m':residual,'surface_m':mesh.surface_elevation_m}))


if __name__=='__main__':main()
