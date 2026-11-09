"""Isolated seven-kernel geometry; original ephemeris pool and source are untouched."""
import json
import sys
from pathlib import Path
from hashlib import sha256
import numpy as np
from lunascend.contracts.models import ScenarioRequest, LunarSite
from lunascend.ephemeris.kernels import KernelConfiguration, GeometryError, PROJECT_ROOT, file_sha256
from lunascend.ephemeris.engine import sample_times, observation_loaded, provenance, observer_position, validate_site
from lunascend.terrain.geometry import local_basis, unit_lonlat, RADIUS_M


def calculate(data: dict) -> dict:
    request = ScenarioRequest.model_validate(data["request"])
    config = KernelConfiguration(Path(data["kernel_dir"]), Path(data["manifest_path"]))
    extras = json.loads((PROJECT_ROOT / "data/manifests/terrain-frame-kernels.json").read_text(encoding="utf-8"))["kernels"]
    for record in extras:
        if Path(record["filename"]).name != record["filename"] or file_sha256(config.kernel_dir / record["filename"]) != record["sha256"]:
            raise GeometryError("MISSING_DATA", "Terrain frame kernel integrity check failed.")
    with config.loaded() as loaded:
        spice = loaded.spice
        for record in extras:
            spice.furnsh(str(config.kernel_dir / record["filename"]))
        times = sample_times(request, loaded)
        rotation = spice.pxform("MOON_ME_DE440_ME421", "MOON_ME_DE421", times[0][1])
        up, _, _ = local_basis(request.site.latitude_deg, request.site.longitude_deg)
        native_up = rotation @ up
        lon, lat = map(float, unit_lonlat(native_up))
        if data["mode"] == "anchor":
            return {"latitude_deg": lat, "longitude_deg": lon, "matrix": rotation.tolist(),
                "kernels": [{k: r[k] for k in ("filename", "url", "sha256")} for r in (*loaded.records, *extras)]}
        surface = data["surface_elevation_m"]
        native_up, native_east, native_north = local_basis(lat, lon)
        observations, native, history = [], [], []
        for utc, et in times:
            matrix = spice.pxform("MOON_ME_DE440_ME421", "MOON_ME_DE421", et)
            longitude, latitude = map(float, unit_lonlat(matrix.T @ native_up))
            site = LunarSite(**{**request.site.model_dump(), "latitude_deg": latitude,
                "longitude_deg": longitude, "surface_elevation_m": surface})
            validate_site(site)
            observation = observation_loaded(site, utc, et, loaded, set())
            observations.append(observation)
            up, east, north = local_basis(latitude, longitude)
            values = {}
            for body in ("sun", "earth"):
                azimuth = getattr(observation, body + "_azimuth_deg").value
                elevation = getattr(observation, body + "_elevation_deg").value
                if azimuth is None or elevation is None:
                    values[body] = {"azimuth_deg": None, "elevation_deg": elevation}
                else:
                    az, el = np.deg2rad([azimuth, elevation])
                    vector = matrix @ (up * np.sin(el) + np.cos(el) * (north * np.cos(az) + east * np.sin(az)))
                    e, n, u = float(vector @ native_east), float(vector @ native_north), float(vector @ native_up)
                    values[body] = {"azimuth_deg": float(np.rad2deg(np.arctan2(e, n)) % 360) if np.hypot(e, n) > 1e-12 else None,
                        "elevation_deg": float(np.rad2deg(np.arctan2(u, np.hypot(e, n))))}
            native.append({"time_utc": utc.isoformat(), **values})
            position_m = np.asarray(observer_position(site, spice)) * 1000
            expected = native_up * (RADIUS_M + surface + site.observer_height_m)
            residual = float(np.linalg.norm(matrix @ position_m - expected))
            if residual > 1e-6:
                raise GeometryError("FRAME_MISMATCH", "Observer frame/radius reconciliation failed.")
            history.append({"time_utc": utc.isoformat(), "latitude_deg_de440": latitude,
                "longitude_deg_de440": longitude, "surface_elevation_m": surface,
                "observer_height_m": site.observer_height_m, "observer_radius_m": float(np.linalg.norm(position_m)),
                "native_position_residual_m": residual, "de440_to_de421_matrix": matrix.tolist()})
        return {"observations": [r.model_dump(mode="json") for r in observations], "native": native,
            "observer_geometry": history, "provenance": [p.model_dump(mode="json") for p in provenance(loaded, tuple(observations))],
            "frame_kernel_fingerprint": sha256(json.dumps(extras, sort_keys=True).encode()).hexdigest()}


if __name__ == "__main__":
    try:
        print(json.dumps(calculate(json.loads(sys.stdin.read())), allow_nan=False))
    except GeometryError as exc:
        print(json.dumps({"error": exc.error.model_dump(mode="json")})); sys.exit(1)
    except OSError:
        print(json.dumps({"error": {"code": "MISSING_DATA", "message": "Required frame kernels are missing or unreadable."}})); sys.exit(1)
    except Exception:
        print(json.dumps({"error": {"code": "OUTSIDE_COVERAGE", "message": "Exact frame/geometry calculation could not be completed; no identity or mock fallback."}})); sys.exit(1)
