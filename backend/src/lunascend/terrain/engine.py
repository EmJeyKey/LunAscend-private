"""Finite-radius sampled horizons. Never declares the global horizon complete."""
from hashlib import sha256
import json
import numpy as np
from lunascend.contracts import DataProvenance, HorizonProfile
from lunascend.contracts.terrain import TerrainRequest, TerrainResult
from .dem import DatasetConfiguration, LunarDEM, TerrainError
from .frames import frame_rotation
from .geometry import RADIUS_M, apparent_elevation, local_basis, ray_units, unit_lonlat

METHOD = "spherical-ray-bilinear-v1"


def analyze_terrain(request: TerrainRequest, configuration: DatasetConfiguration | None = None) -> TerrainResult:
    config = configuration or DatasetConfiguration.selected(request.dataset_id)
    if config.manifest["dataset_id"] != request.dataset_id:
        raise TerrainError("MISSING_DATA", "Selected dataset identity does not match the configured manifest.")
    config.verify()
    rotation, transform = frame_rotation(request)
    up, _, _ = local_basis(request.latitude_deg, request.longitude_deg)
    observer_lon, observer_lat = unit_lonlat(rotation @ up)
    azimuths = np.arange(request.azimuth_samples, dtype=float) * 360 / request.azimuth_samples
    # Include a 1 m near-field sample and the radius endpoint exactly once.
    distances = np.unique(np.r_[1.0, np.arange(request.radial_step_m, request.max_search_radius_m, request.radial_step_m), request.max_search_radius_m])
    vectors = ray_units(request.latitude_deg, request.longitude_deg, azimuths, distances)
    native_vectors = vectors @ rotation.T
    lon, lat = unit_lonlat(native_vectors)
    with LunarDEM(config) as dem:
        surface = dem.elevation(float(observer_lon), float(observer_lat))
        if request.radial_step_m > config.manifest["pixel_resolution_m"]:
            raise TerrainError("INVALID_REQUEST", "Radial step must not exceed the selected DEM pixel spacing.")
        window = dem.window_for(np.r_[lon.ravel(), observer_lon], np.r_[lat.ravel(), observer_lat])
        heights, inside, valid = window.sample(lon, lat)
        if np.any(np.isfinite(heights) & (RADIUS_M + heights <= 0)) or RADIUS_M + surface + request.observer_height_m <= 0:
            raise TerrainError("INVALID_REQUEST", "Terrain or observer has a non-positive lunar radius.")
        angles = apparent_elevation(distances, heights, surface, request.observer_height_m)
        elevations, defining_distances, sampled_distances, coverage, fractions, first_missing = [], [], [], [], [], []
        for i in range(request.azimuth_samples):
            known = np.flatnonzero(valid[i])
            if known.size:
                j = int(known[np.argmax(angles[i, known])])
                elevations.append(float(angles[i, j])); defining_distances.append(float(distances[j]))
                sampled_distances.append(float(distances[known[-1]]))
            else:
                elevations.append(None); defining_distances.append(None); sampled_distances.append(0.0)
            boundary = not inside[i].all()
            gaps = np.any(inside[i] & ~valid[i])
            coverage.append("boundary_and_nodata" if boundary and gaps else "boundary" if boundary else "nodata" if gaps else "sampled_radius")
            missing = np.flatnonzero(~valid[i])
            first_missing.append(float(distances[missing[0]]) if missing.size else None)
            fractions.append(float(valid[i].mean()))
        assumptions = (
            "Finite sampled maxima are model lower bounds, not global horizon certificates or unobstructed directions.",
            "Spherical 1737400 m reference; local tangent ENU; great-circle search distances on that sphere.",
            "Bilinear heights require four known pixel-center neighbors; missing terrain is never zero.",
            "Terrain below 1 m range, between radial/azimuth samples, and beyond the search radius is unresolved.",
            "DEM spacing is not effective resolution or angular accuracy; uncertainty layers are not propagated.",
        )
        profile = HorizonProfile(site_id=request.site_id, reference_frame=request.reference_frame,
            status="partial", provenance_ids=("terrain-dem",), assumptions=assumptions,
            azimuth_deg=tuple(azimuths), elevation_deg=tuple(elevations), terrain_source=config.manifest["dataset_id"],
            spatial_resolution_m=config.manifest["pixel_resolution_m"], obstruction_distance_m=tuple(defining_distances),
            sampled_distance_m=tuple(sampled_distances), first_missing_distance_m=tuple(first_missing),
            ray_coverage=tuple(coverage), valid_sample_fraction=tuple(fractions),
            observer_height_m=request.observer_height_m, surface_elevation_m=surface, reference_radius_m=RADIUS_M,
            max_search_radius_m=request.max_search_radius_m, radial_step_m=request.radial_step_m,
            azimuth_step_deg=360.0 / request.azimuth_samples, global_horizon_complete=False)
    warnings = ["PARTIAL GLOBAL COVERAGE: no terrain outside the finite search radius was evaluated.",
                "No Sun/Earth visibility windows, illumination durations or engineering feasibility are calculated."]
    if any(value != "sampled_radius" for value in coverage):
        warnings.append("Some rays encounter a dataset boundary or nodata; reported known maxima can miss higher obstructions.")
    if config.manifest.get("source_kind") == "synthetic":
        warnings.append("SYNTHETIC TEST TERRAIN: not NASA elevation data.")
    mode = "mock" if config.manifest.get("source_kind") == "synthetic" else "scientific"
    provenance = [DataProvenance(id="terrain-dem", provider_name="LunarTerrainEngine", provider_mode=mode,
        data_source=config.manifest["name"], source_version=config.manifest["product_version"],
        calculation_method=METHOD, reference_frame="MOON_ME_DE421", terrain_dataset=config.manifest["dataset_id"],
        source_url=config.manifest["source_url"], sha256=config.manifest["sha256"],
        validation_status="mock" if mode == "mock" else "unvalidated",
        assumptions=(*assumptions, config.manifest.get("uncertainty", "Synthetic analytical test terrain."), config.manifest.get("citation", "Synthetic analytical test fixture.")))]
    if request.reference_frame != "MOON_ME_DE421":
        provenance.append(DataProvenance(id="terrain-frame-bridge", provider_name="NAIF SPICE", provider_mode="scientific",
            data_source="DE421 and DE440 lunar orientation kernels", calculation_method=transform["method"],
            reference_frame=request.reference_frame, source_url="https://naif.jpl.nasa.gov/pub/naif/generic_kernels/fk/satellites/moon_de440_250416.tf",
            sha256=sha256(json.dumps(transform, sort_keys=True).encode()).hexdigest(),
            assumptions=("Conversion uses the explicitly supplied epoch; no frame alias or identity approximation.",)))
        profile = HorizonProfile(**{**profile.model_dump(), "provenance_ids": ("terrain-dem", "terrain-frame-bridge")})
    return TerrainResult(request=request, horizon=profile, surface_elevation_m=surface,
        dataset_observer_latitude_deg=float(observer_lat), dataset_observer_longitude_deg=float(observer_lon),
        frame_transform=transform, provenance=tuple(provenance), warnings=tuple(warnings),
        sampling_details={"radial_samples_per_ray": len(distances), "minimum_distance_m": float(distances[0]),
            "window_width_pixels": int(window.window.width), "window_height_pixels": int(window.window.height),
            "raster_array_bytes": int(window.values.nbytes), "interpolation": "bilinear, four finite neighbors"})
