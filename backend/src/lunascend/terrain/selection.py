"""Select installed compatible terrain by actual four-pixel support, never a proximity guess."""
import json
from .dem import ROOT, DatasetConfiguration, LunarDEM, TerrainError
from .frames import frame_rotation
from .geometry import local_basis, unit_lonlat
from lunascend.contracts.terrain import TerrainRequest

def select_terrain(request: TerrainRequest) -> dict:
    rotation, _ = frame_rotation(request)
    up, _, _ = local_basis(request.latitude_deg, request.longitude_deg)
    lon, lat = unit_lonlat(rotation @ up)
    registry = json.loads((ROOT / "data/manifests/polar-sites/registry.json").read_text(encoding="utf-8"))
    ids = [request.dataset_id, "lola-site01-5m-v2020", *(s["dataset_id"] for s in registry["sites"])]
    checked = []
    for dataset_id in dict.fromkeys(ids):
        try:
            configuration = DatasetConfiguration.selected(dataset_id)
            with LunarDEM(configuration) as dem:
                elevation = dem.elevation(float(lon), float(lat))
            return {"dataset_id": dataset_id, "surface_elevation_m": elevation,
                "pixel_resolution_m": configuration.manifest["pixel_resolution_m"],
                "reference_frame": "MOON_ME_DE421", "vertical_reference": configuration.manifest["vertical_reference"],
                "source_url": configuration.manifest["source_url"], "sha256": configuration.manifest["sha256"],
                "recommended_radius_m": 2500 if dataset_id == "lola-site01-5m-v2020" else 100,
                "coverage": "observer_four_pixel_support_only", "checked": checked,
                "limitations": ["Equal nominal 5 m products: preserve the explicitly selected valid source, then prefer the larger Site01 footprint before bounded windows. No unverified mosaicking.", "Valid observer support does not prove complete rays or global horizon coverage."]}
        except TerrainError as exc:
            checked.append({"dataset_id": dataset_id, "reason": exc.error.code, "message": exc.error.message})
    return {"dataset_id": None, "checked": checked,
        "reason_code": "outside_dataset_coverage" if any(item["reason"] == "OUTSIDE_COVERAGE" for item in checked) else "dataset_unavailable",
        "reason": "No installed, registered terrain has valid four-pixel support at this location. Geometry can still be calculated with an explicitly assumed surface height."}
