"""Explicit terrain composition; bounded local reuse, no global horizon claim."""
import json
import subprocess
import sys
from hashlib import sha256
from math import ceil
from typing import Callable
from lunascend.contracts.models import (ScenarioRequest, ScenarioResult, DataProvenance,
    EphemerisObservation, TerrainVisibility, TerrainVisibilityObservation)
from lunascend.contracts.terrain import TerrainRequest, TerrainResult
from lunascend.ephemeris.kernels import KernelConfiguration, GeometryError, PROJECT_ROOT, FRAME, RADIUS_M
from lunascend.ephemeris.engine import validate_site
from lunascend.terrain.engine import analyze_terrain
from lunascend.terrain.errors import TerrainError
from .classify import classify, windows


def worker(request: ScenarioRequest, config: KernelConfiguration, mode: str, surface: float | None = None) -> dict:
    try:
        completed = subprocess.run([sys.executable, "-m", "lunascend.visibility._worker"],
            input=json.dumps({"request": request.model_dump(mode="json"), "kernel_dir": str(config.kernel_dir),
                "manifest_path": str(config.manifest_path), "mode": mode, "surface_elevation_m": surface}),
            capture_output=True, text=True, timeout=90, cwd=PROJECT_ROOT / "backend", check=False)
        result = json.loads(completed.stdout)
        if completed.returncode or "error" in result:
            error = result.get("error", {})
            raise GeometryError(error.get("code", "CALCULATION_FAILED"), error.get("message", "Terrain geometry worker failed."))
        return result
    except (OSError, ValueError, subprocess.TimeoutExpired) as exc:
        raise GeometryError("CALCULATION_FAILED", "Isolated terrain geometry worker is unavailable or exceeded its bounded runtime.") from exc


def analyze_visibility(request: ScenarioRequest, configuration: KernelConfiguration | None = None, *,
                       terrain_loader: Callable[[TerrainRequest], TerrainResult] | None = None) -> ScenarioResult:
    settings, options = request.settings, request.settings.terrain_options
    if (request.provider_mode != "scientific" or not options or settings.horizon_mode != "terrain"
        or settings.power_enabled or settings.communication_enabled or settings.sun_clearance_deg or settings.earth_clearance_deg):
        raise GeometryError("INVALID_REQUEST", "Terrain center visibility requires scientific mode, explicit terrain options, terrain horizon and zero additional clearance thresholds; engineering models remain disabled.")
    if options.coordinate_epoch_utc != request.start_utc:
        raise GeometryError("FRAME_MISMATCH", "Input DE440 coordinates must be declared at the analysis start epoch; the site then remains fixed in native DE421.")
    if request.site.surface_elevation_m is not None:
        raise GeometryError("INVALID_REQUEST", "Terrain visibility derives sphere-relative surface height from the DEM; supply null surface_elevation_m to avoid conflicting/double heights.")
    if ceil((request.end_utc-request.start_utc).total_seconds()/request.sample_step_s)+1 > 1001:
        raise GeometryError("RESOURCE_LIMIT", "Terrain visibility is limited to 1001 time samples.")
    # Validate the original frame/sphere without inventing an input height.
    validate_site(type(request.site)(**{**request.site.model_dump(), "surface_elevation_m": 0.0}))
    config = configuration or KernelConfiguration.from_environment()
    anchor = worker(request, config, "anchor")
    terrain_request = TerrainRequest(dataset_id=options.dataset_id, site_id=request.site.site_id,
        latitude_deg=anchor["latitude_deg"], longitude_deg=anchor["longitude_deg"], reference_frame="MOON_ME_DE421",
        observer_height_m=request.site.observer_height_m, azimuth_samples=options.azimuth_samples,
        max_search_radius_m=options.max_search_radius_m, radial_step_m=options.radial_step_m)
    terrain = (terrain_loader or analyze_terrain)(terrain_request)  # Bounded reuse may be supplied for an unchanged observer.
    resolved = worker(request, config, "observations", terrain.surface_elevation_m)
    rows = tuple(TerrainVisibilityObservation(time_utc=row["time_utc"],
        sun=classify(terrain.horizon, **row["sun"]), earth=classify(terrain.horizon, **row["earth"])) for row in resolved["native"])
    ids = tuple(p["id"] for p in resolved["provenance"]) + ("terrain-dem", "visibility-model", "visibility-frame")
    intervals, transitions = windows(rows, ids)
    assumptions = (*terrain.horizon.assumptions,
        "Body centers only; no apparent disk, refraction, illumination fraction, radio link or engineering feasibility.",
        "Circular linear horizon between adjacent known rays; missing endpoints are never interpolated.",
        "Known partial maxima may establish modeled obstruction, but positive partial-coverage clearance remains indeterminate.",
        "Coordinates are DE440/ME421 at the start epoch; observer is fixed in DEM-native DE421 thereafter with exact per-epoch rotations.",
        "Approximate sampled intervals and linear transition estimates retain their full temporal brackets, not second-level accuracy.")
    visibility = TerrainVisibility(dataset_id=options.dataset_id, surface_elevation_m=terrain.surface_elevation_m,
        observer_height_m=request.site.observer_height_m, observer_radius_m=RADIUS_M+terrain.surface_elevation_m+request.site.observer_height_m,
        native_latitude_deg=anchor["latitude_deg"], native_longitude_deg=anchor["longitude_deg"],
        max_search_radius_m=options.max_search_radius_m, azimuth_step_deg=360/options.azimuth_samples,
        radial_step_m=options.radial_step_m, observations=rows, transitions=transitions,
        observer_geometry=tuple(resolved["observer_geometry"]), provenance_ids=ids, assumptions=assumptions)
    sources = tuple(DataProvenance.model_validate(p) for p in resolved["provenance"]) + terrain.provenance + (
        DataProvenance(id="visibility-frame", provider_name="NAIF SPICE", provider_mode="scientific",
            data_source="Exact DE421/DE440 seven-kernel frame bridge", calculation_method="Per-epoch pxform; isolated child pool; shared ephemeris observation functions",
            reference_frame=FRAME, sha256=resolved["frame_kernel_fingerprint"], assumptions=tuple(f"{r['filename']} SHA256 {r['sha256']}" for r in anchor["kernels"])),
        DataProvenance(id="visibility-model", provider_name="TerrainCenterVisibility", provider_mode="scientific",
            data_source=options.dataset_id, terrain_dataset=options.dataset_id, calculation_method="center elevation minus circular-linear sampled terrain horizon; qualified intervals",
            source_version="terrain-center-visibility-v1", reference_frame="MOON_ME_DE421", assumptions=assumptions))
    identity = sha256((request.model_dump_json()+"".join(p.sha256 or "" for p in sources)+"terrain-center-visibility-v1").encode()).hexdigest()[:32]
    return ScenarioResult(request=request, scenario_id=identity, provider_mode="scientific", model_version="terrain-center-visibility-v1",
        status="partial", observations=tuple(EphemerisObservation.model_validate(r) for r in resolved["observations"]),
        horizon=terrain.horizon, terrain_visibility=visibility, visibility_windows=intervals, provenance=sources,
        warnings=("TERRAIN CENTER MODEL ONLY: conditional clearance is not globally confirmed visibility.",
            "Finite radius, unresolved azimuth/range features and unpropagated DEM uncertainty limit every result.",
            "Intervals/crossings are approximate sampled estimates; independent terrain-visibility validation remains outstanding."))
