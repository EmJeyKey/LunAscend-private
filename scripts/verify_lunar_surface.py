"""Reproduce Site01 observer/horizon consistency without modifying saved references.

Run from repository root with backend/.venv/Scripts/python.exe.
This is an internal integration check, not independent terrain validation.
"""
from hashlib import sha256
import json
from pathlib import Path

from lunascend.contracts.terrain import TerrainRequest
from lunascend.contracts.visualization import MeshRequest
from lunascend.terrain.visualization import analyze_mesh
from lunascend.terrain.engine import analyze_terrain
from lunascend.visibility.classify import classify


def main() -> None:
    root = Path(__file__).resolve().parents[1]
    saved_path = root / "docs/validation/step-9-results.json"
    saved = json.loads(saved_path.read_text(encoding="utf-8"))["response"]["baseline"]
    site = saved["request"]["site"]
    mesh = analyze_mesh(MeshRequest(latitude_deg=site["latitude_deg"], longitude_deg=site["longitude_deg"],
        reference_frame="MOON_ME_DE440_ME421", coordinate_epoch_utc=saved["request"]["start_utc"],
        observer_height_m=site["observer_height_m"], half_extent_m=1000.0, max_grid_side=65))
    options = saved["request"]["settings"]["terrain_options"]
    terrain = analyze_terrain(TerrainRequest(dataset_id=mesh.request.dataset_id, reference_frame="MOON_ME_DE421",
        latitude_deg=mesh.native_latitude_deg, longitude_deg=mesh.native_longitude_deg,
        observer_height_m=mesh.request.observer_height_m, azimuth_samples=options["azimuth_samples"],
        max_search_radius_m=options["max_search_radius_m"], radial_step_m=options["radial_step_m"]))
    assert abs(mesh.surface_elevation_m - saved["terrain_visibility"]["surface_elevation_m"]) < 1e-7
    rows = {}
    for body in ("sun", "earth"):
        old = saved["terrain_visibility"]["observations"][0][body]
        fresh = classify(terrain.horizon, old["azimuth_deg"], old["elevation_deg"])
        assert fresh.classification == old["classification"]
        for key in ("horizon_elevation_deg", "clearance_deg"):
            assert abs(getattr(fresh, key) - old[key]) < 1e-7
        rows[body] = fresh.model_dump(mode="json")
    residual = max(abs(a-b) for a, b in zip(terrain.horizon.elevation_deg, saved["horizon"]["elevation_deg"]) if a is not None and b is not None)
    assert terrain.horizon.ray_coverage == tuple(saved["horizon"]["ray_coverage"])
    assert residual < 1e-7
    report = {"scope": "Fresh existing mesh/horizon engines, compared with unchanged saved Step 9 directions; no new independent validation",
        "reference_sha256": sha256(saved_path.read_bytes()).hexdigest(), "utc": saved["request"]["start_utc"],
        "input": mesh.request.model_dump(mode="json"), "native_latitude_deg": mesh.native_latitude_deg,
        "native_longitude_deg": mesh.native_longitude_deg, "surface_elevation_m": mesh.surface_elevation_m,
        "observer_scene_m": mesh.observer_scene_m, "source_sha256": mesh.source_sha256,
        "horizon_radius_m": terrain.horizon.max_search_radius_m, "radial_step_m": terrain.horizon.radial_step_m,
        "azimuth_step_deg": terrain.horizon.azimuth_step_deg, "maximum_horizon_residual_deg": residual,
        "rendered_grid_shape": mesh.grid_shape, "rendered_stride_pixels": mesh.source_stride_pixels,
        "rendered_extent_m": [mesh.projected_x_m[-1]-mesh.projected_x_m[0], mesh.projected_y_m[0]-mesh.projected_y_m[-1]],
        "global_horizon_complete": terrain.horizon.global_horizon_complete, "bodies": rows}
    output = root / "docs/validation/step-11.5-surface-check.json"
    output.write_text(json.dumps(report, indent=2, allow_nan=False)+"\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
