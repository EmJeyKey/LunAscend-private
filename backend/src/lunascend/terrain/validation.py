"""Reproducible real-data ingestion/convergence report, NOT external validation."""
from collections import Counter
from hashlib import file_digest
import json
from pathlib import Path
import time
import tracemalloc
import numpy as np
import pyproj
import rasterio
from lunascend.contracts.terrain import TerrainRequest
from .dem import DatasetConfiguration, LunarDEM, ROOT
from .engine import analyze_terrain
from .frames import frame_rotation
from .geometry import local_basis, unit_lonlat


def main() -> None:
    config = DatasetConfiguration.selected("lola-site01-5m-v2020")
    with LunarDEM(config) as dem:
        ds = dem.dataset
        observations = []
        for row, col in [(1500, 1500), (1600, 1600), (1700, 1700)]:
            x, y = ds.xy(row, col); lon, lat = dem.to_geo.transform(x, y)
            observations.append(dict(row=row, col=col, x_m=x, y_m=y, longitude_deg=lon, latitude_deg=lat,
                elevation_m=dem.elevation(lon, lat), raw_pixel=float(ds.read(1, window=rasterio.windows.Window(col, row, 1, 1))[0, 0])))
        ds_metadata = {"crs_wkt": ds.crs.to_wkt(), "bounds_m": list(ds.bounds), "dimensions": [ds.width, ds.height],
            "scale": ds.scales[0], "offset": ds.offsets[0], "band_unit": ds.units[0], "nodata": "NaN",
            "registration": ds.tags().get("AREA_OR_POINT"), "height_units_source": "NASA product 78 and README; band unit tag absent"}
        edge_lon, edge_lat = dem.to_geo.transform(*ds.xy(50, 50))
    center = observations[1]
    request = TerrainRequest(dataset_id=config.manifest["dataset_id"], latitude_deg=center["latitude_deg"],
        longitude_deg=center["longitude_deg"], reference_frame="MOON_ME_DE421", observer_height_m=2.)
    tracemalloc.start(); start = time.perf_counter()
    result = analyze_terrain(request)
    elapsed = time.perf_counter() - start
    _, peak = tracemalloc.get_traced_memory(); tracemalloc.stop()
    refined = analyze_terrain(TerrainRequest(**{**request.model_dump(), "radial_step_m": 2.5}))
    high = analyze_terrain(TerrainRequest(**{**request.model_dump(), "observer_height_m": 5.}))
    coarse = analyze_terrain(TerrainRequest(**{**request.model_dump(), "azimuth_samples": 180}))
    edge = analyze_terrain(TerrainRequest(**{**request.model_dump(), "latitude_deg": edge_lat,
        "longitude_deg": edge_lon, "azimuth_samples": 72}))
    frame_cases = []
    for date in ("2026-11-14T00:00:00Z", "2026-11-19T00:00:00Z", "2030-01-01T00:00:00Z"):
        bridge_request = TerrainRequest(**{**request.model_dump(), "reference_frame": "MOON_ME_DE440_ME421", "coordinate_epoch_utc": date})
        matrix, details = frame_rotation(bridge_request)
        native = local_basis(request.latitude_deg, request.longitude_deg)[0]
        input_lon, input_lat = unit_lonlat(matrix.T @ native)
        bridged = analyze_terrain(TerrainRequest(**{**bridge_request.model_dump(), "latitude_deg": float(input_lat),
            "longitude_deg": float(input_lon), "azimuth_samples": 36, "max_search_radius_m": 1000.}))
        frame_cases.append(dict(epoch=date, input_latitude_deg=float(input_lat), input_longitude_deg=float(input_lon),
            native_latitude_deg=bridged.dataset_observer_latitude_deg, native_longitude_deg=bridged.dataset_observer_longitude_deg,
            elevation_m=bridged.surface_elevation_m, rotation_angle_rad=float(np.arctan2(np.linalg.norm([matrix[2, 1]-matrix[1, 2], matrix[0, 2]-matrix[2, 0], matrix[1, 0]-matrix[0, 1]]) / 2, (np.trace(matrix) - 1) / 2)),
            roundtrip_vector_residual=float(np.max(np.abs(matrix @ (matrix.T @ native) - native))), transform=details))
    values = np.asarray(result.horizon.elevation_deg, dtype=float)
    report = dict(report_id="step-7-real-ingestion-v1", classification="Real LOLA ingestion and internal numerical checks; no independent matched external horizon reference",
        dataset=config.manifest, metadata=ds_metadata, representative_pixels=observations,
        request=request.model_dump(mode="json"), result=result.model_dump(mode="json"),
        summary=dict(min_sampled_horizon_deg=float(np.nanmin(values)), max_sampled_horizon_deg=float(np.nanmax(values)),
            coverage_counts=dict(Counter(result.horizon.ray_coverage))),
        convergence=dict(max_abs_change_5m_to_2_5m_deg=float(np.nanmax(np.abs(values - np.asarray(refined.horizon.elevation_deg)))),
            common_azimuth_max_difference_180_to_360_deg=float(np.max(np.abs(values[::2] - np.asarray(coarse.horizon.elevation_deg)))),
            higher_observer_never_raises_sampled_horizon=bool(np.all(np.asarray(high.horizon.elevation_deg) <= values))),
        limited_coverage_example=dict(request=edge.request.model_dump(mode="json"), coverage_counts=dict(Counter(edge.horizon.ray_coverage)),
            first_missing_distance_m=list(edge.horizon.first_missing_distance_m)),
        frame_cases=frame_cases, performance=dict(elapsed_seconds=elapsed, tracemalloc_peak_bytes=peak,
            memory_caveat="Python/NumPy tracked allocations only; excludes GDAL native cache and child process RSS", **result.sampling_details),
        versions=dict(numpy=np.__version__, rasterio=rasterio.__version__, gdal=rasterio.__gdal_version__, pyproj=pyproj.__version__, proj=pyproj.proj_version_str))
    report["terrain_source_hashes"] = {}
    for path in sorted(Path(__file__).parent.glob("*.py")):
        with path.open("rb") as stream: report["terrain_source_hashes"][path.name] = file_digest(stream, "sha256").hexdigest()
    destination = ROOT / "docs/validation/step-7-results.json"
    destination.write_text(json.dumps(report, indent=2, allow_nan=False) + "\n", encoding="utf-8")
    print(json.dumps({"report": str(destination.relative_to(ROOT)), "summary": report["summary"], "convergence": report["convergence"], "performance": report["performance"]}, indent=2))


if __name__ == "__main__": main()
