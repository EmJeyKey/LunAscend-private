"""Analytical terrain tests use explicitly synthetic rasters, never NASA substitutes."""
from copy import deepcopy
from hashlib import sha256
import json
from math import atan2, acos, cos, degrees, sin
from pathlib import Path
import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

np = pytest.importorskip("numpy")
rasterio = pytest.importorskip("rasterio", reason="Install terrain extra")
pytest.importorskip("pyproj", reason="Install terrain extra")
from rasterio.transform import from_origin
from lunascend.contracts import HorizonProfile
from lunascend.contracts.terrain import TerrainRequest
from lunascend.terrain.dem import DatasetConfiguration, LunarDEM, ROOT, TerrainError
from lunascend.terrain.engine import analyze_terrain
from lunascend.terrain.frames import frame_rotation
from lunascend.terrain.geometry import RADIUS_M, apparent_elevation, local_basis, ray_units, unit_lonlat
from lunascend.api.terrain import terrain_service_factory
from lunascend.main import create_app

PROJECTION = "+proj=stere +lat_0=-90 +lat_ts=-90 +lon_0=0 +R=1737400 +units=m +no_defs"


def synthetic(tmp_path, values=None, *, spacing=10.0, center_y=9000.0, scale=1.0, offset=0.0, nodata=float("nan")):
    values = np.zeros((401, 401), dtype="float32") if values is None else np.asarray(values, dtype="float32")
    height, width = values.shape
    transform = from_origin(-width * spacing / 2, center_y + height * spacing / 2, spacing, spacing)
    path = tmp_path / "synthetic.tif"
    with rasterio.open(path, "w", driver="GTiff", width=width, height=height, count=1,
                       dtype="float32", crs=PROJECTION, transform=transform, nodata=nodata) as ds:
        ds.write(values, 1); ds.scales = (scale,); ds.offsets = (offset,)
    meta = dict(dataset_id="synthetic-test", source_kind="synthetic", name="Synthetic analytical test grid",
        product_version="unit-test-v1", source_url="https://example.invalid/synthetic-test", bytes=path.stat().st_size,
        sha256=sha256(path.read_bytes()).hexdigest(), reference_frame="MOON_ME_DE421", units="m",
        projection=PROJECTION, reference_radius_m=RADIUS_M, vertical_reference="Height in meters above 1737400 m sphere",
        width=width, height=height, transform=list(transform)[:6], scale=scale, offset=offset,
        nodata="NaN" if np.isnan(nodata) else nodata, pixel_resolution_m=spacing)
    config = DatasetConfiguration(path, meta)
    with LunarDEM(config) as dem:
        lon, lat = dem.to_geo.transform(0.0, center_y if center_y else 10.)
    request = TerrainRequest(dataset_id="synthetic-test", latitude_deg=lat, longitude_deg=lon,
        reference_frame="MOON_ME_DE421", observer_height_m=0.0, azimuth_samples=4,
        max_search_radius_m=1000.0, radial_step_m=spacing)
    return config, request


def changed(request, **kwargs):
    return TerrainRequest(**{**request.model_dump(), **kwargs})


def test_smooth_sphere_finite_sample_limit(tmp_path):
    config, request = synthetic(tmp_path)
    result = analyze_terrain(request, config)
    # At surface, equal-radius terrain at angular distance delta has elevation -delta/2.
    assert result.horizon.elevation_deg == pytest.approx([-degrees(1 / RADIUS_M) / 2] * 4, abs=1e-12)
    assert result.horizon.obstruction_distance_m == (1.0,) * 4
    assert result.horizon.status == "partial"
    assert result.horizon.global_horizon_complete is False
    assert result.horizon.ray_coverage == ("sampled_radius",) * 4
    assert result.provenance[0].validation_status == "mock"
    assert "SYNTHETIC" in result.warnings[-1]


@pytest.mark.parametrize("distance,height,observer", [(1000., 100., 2.), (50000., 500., 2.), (100., 0., 5.)])
def test_curved_angles_against_cartesian_analytical_solution(distance, height, observer):
    delta = distance / RADIUS_M
    expected = degrees(atan2((RADIUS_M + height) * cos(delta) - RADIUS_M - observer,
                             (RADIUS_M + height) * sin(delta)))
    actual = apparent_elevation(np.array([distance]), np.array([height]), 0., observer)[0]
    assert actual == pytest.approx(expected, abs=1e-9)
    if distance == 50000:
        flat = degrees(atan2(height - observer, distance))
        assert flat - actual > .8  # Curvature materially changes the result.


def test_raised_observer_matches_spherical_tangent_dip(tmp_path):
    config, request = synthetic(tmp_path, spacing=50.)
    request = changed(request, max_search_radius_m=10000., radial_step_m=50., observer_height_m=2.)
    result = analyze_terrain(request, config)
    dip = -degrees(acos(RADIUS_M / (RADIUS_M + 2.)))
    assert result.horizon.elevation_deg == pytest.approx([dip] * 4, abs=2e-5)
    assert all(value < 0 for value in result.horizon.elevation_deg)


def test_known_east_ridge_azimuth_and_observer_height(tmp_path):
    values = np.zeros((401, 401), dtype="float32")
    values[180:221, 300] = 100.0 # pixel-center X=1000 m east of observer
    config, request = synthetic(tmp_path, values)
    result = analyze_terrain(request, config)
    assert result.horizon.azimuth_deg[1] == 90
    assert result.horizon.elevation_deg[1] == pytest.approx(float(apparent_elevation(np.array([1000.]), np.array([100.]), 0., 0.)[0]), abs=.02)
    assert result.horizon.obstruction_distance_m[1] == pytest.approx(1000., abs=10)
    assert result.horizon.elevation_deg[1] > max(result.horizon.elevation_deg[i] for i in (0, 2, 3)) + 5
    high = analyze_terrain(changed(request, observer_height_m=5.), config)
    assert high.horizon.elevation_deg[1] < result.horizon.elevation_deg[1]


def test_crater_rim_and_azimuth_sampling(tmp_path):
    y, x = np.mgrid[-200:201, -200:201] * 10.
    radius = np.hypot(x, y)
    values = np.where(radius < 800, -100., np.where(radius < 850, 50., 0.))
    config, request = synthetic(tmp_path, values)
    a = analyze_terrain(request, config)
    b = analyze_terrain(changed(request, azimuth_samples=8), config)
    assert a.surface_elevation_m == pytest.approx(-100.)
    assert all(9.5 < v < 11 for v in a.horizon.elevation_deg)
    assert b.horizon.elevation_deg[::2] == pytest.approx(a.horizon.elevation_deg, abs=1e-10)


def test_nodata_gap_preserves_known_obstruction_lower_bound(tmp_path):
    values = np.zeros((401, 401), dtype="float32")
    values[190:211, 260] = np.nan
    values[190:211, 290] = 100.
    config, request = synthetic(tmp_path, values)
    result = analyze_terrain(request, config)
    assert result.horizon.ray_coverage[1] == "nodata"
    assert 0 < result.horizon.valid_sample_fraction[1] < 1
    assert result.horizon.first_missing_distance_m[1] is not None
    assert result.horizon.first_missing_distance_m[1] < result.horizon.sampled_distance_m[1]
    assert result.horizon.elevation_deg[1] > 5
    assert result.horizon.status == "partial"
    assert any("nodata" in w for w in result.warnings)


def test_boundary_and_unknown_rays(tmp_path):
    config, request = synthetic(tmp_path)
    result = analyze_terrain(changed(request, max_search_radius_m=3000.), config)
    assert "boundary" in result.horizon.ray_coverage
    assert any(v < 3000. for v in result.horizon.sampled_distance_m)
    # Outside observer is rejected, rather than sampled as zero elevation.
    with pytest.raises(TerrainError, match="outside DEM"):
        analyze_terrain(changed(request, latitude_deg=0.), config)


def test_near_pole_longitude_wrapping_and_basis(tmp_path):
    config, request = synthetic(tmp_path, center_y=0.)
    request = changed(request, latitude_deg=-89.999, longitude_deg=35.)
    result = analyze_terrain(request, config)
    assert np.isfinite(result.horizon.elevation_deg).all()
    alias = changed(request, longitude_deg=395.)
    assert alias.longitude_deg == 35.
    assert analyze_terrain(alias, config).horizon == result.horizon
    up, east, north = local_basis(-89.999, 35.)
    assert np.dot(up, north) == pytest.approx(0., abs=1e-12)
    assert np.dot(east, north) == pytest.approx(0., abs=1e-12)
    units = ray_units(-89.999, 35., np.array([0., 90.]), np.array([100.]))[:, 0]
    assert np.dot(units[0] - up, north) > 0
    assert np.dot(units[1] - up, east) > 0


def test_projection_against_independent_stereographic_formula_and_inverse(tmp_path):
    config, _ = synthetic(tmp_path)
    with LunarDEM(config) as dem:
        for lon, lat in [(0., -89.), (90., -89.9), (180., -89.99), (-135., -89.5)]:
            x, y = dem.to_map.transform(lon, lat)
            rho = 2 * RADIUS_M * np.tan(np.pi / 4 + np.deg2rad(lat) / 2)
            assert (x, y) == pytest.approx((rho * np.sin(np.deg2rad(lon)), rho * np.cos(np.deg2rad(lon))), abs=1e-7)
            backlon, backlat = dem.to_geo.transform(x, y)
            assert backlat == pytest.approx(lat, abs=1e-9)
            assert (backlon - lon + 180) % 360 - 180 == pytest.approx(0., abs=1e-10)


def test_scale_offset_pixel_centers_grid_and_mask(tmp_path):
    values = np.full((21, 21), 100., dtype="float32"); values[3, 3] = -32768.
    config, request = synthetic(tmp_path, values, scale=.5, offset=10., nodata=-32768.)
    with LunarDEM(config) as dem:
        assert dem.elevation(request.longitude_deg, request.latitude_deg) == pytest.approx(60.)
        lon, lat = dem.to_geo.transform(np.array([-30., 30.]), np.array([8970., 9030.]))
        grid = dem.window_for(lon, lat).grid()
        assert grid.pixel_spacing_y_m == -10.
        assert all(v == 60. for row in grid.heights_m for v in row if v is not None)
        lon, lat = dem.to_geo.transform(*dem.dataset.xy(3, 3))
        with pytest.raises(TerrainError, match="no valid"):
            dem.elevation(lon, lat)


@pytest.mark.parametrize("key,value", [("units", "km"), ("reference_frame", "IAU_MOON"), ("offset", 10.), ("projection", "EPSG:3857")])
def test_rejects_unverified_metadata(tmp_path, key, value):
    config, _ = synthetic(tmp_path)
    meta = deepcopy(config.manifest); meta[key] = value
    with pytest.raises(TerrainError, match="metadata|CRS|convention"):
        LunarDEM(DatasetConfiguration(config.path, meta))


def test_checksums_missing_datasets_and_window_limits(tmp_path):
    config, request = synthetic(tmp_path)
    corrupt = deepcopy(config.manifest); corrupt["sha256"] = "0" * 64
    with pytest.raises(TerrainError, match="checksum"):
        DatasetConfiguration(config.path, corrupt).verify()
    with pytest.raises(TerrainError, match="missing"):
        DatasetConfiguration(tmp_path / "missing.tif", config.manifest).verify()
    with pytest.raises(TerrainError, match="Unknown"):
        DatasetConfiguration.selected("synthetic-not-registered")
    with LunarDEM(config) as dem:
        lon, lat = dem.to_geo.transform(np.array([-1900., 1900.]), np.array([7100., 10900.]))
        with pytest.raises(TerrainError, match="4096"):
            dem.window_for(lon, lat).grid()
    with pytest.raises(TerrainError, match="Radial step"):
        analyze_terrain(changed(request, radial_step_m=20.), config)


def test_optional_horizon_contract_is_backward_compatible():
    legacy = HorizonProfile(site_id="legacy", reference_frame="MOON_ME_DE421", status="partial", azimuth_deg=(0., 90.), elevation_deg=(0., None))
    assert legacy.ray_coverage == ()
    with pytest.raises(ValidationError, match="match azimuth"):
        HorizonProfile(**{**legacy.model_dump(), "ray_coverage": ("nodata",)})
    with pytest.raises(ValidationError, match="partial"):
        HorizonProfile(**{**legacy.model_dump(), "status": "calculated", "global_horizon_complete": False})


@pytest.mark.parametrize("patch", [{"azimuth_samples": 721}, {"observer_height_m": -1.}, {"latitude_deg": 90.},
    {"reference_frame": "IAU_MOON"}, {"radial_step_m": 0.}, {"max_search_radius_m": 50001.},
    {"azimuth_samples": 720, "radial_step_m": 1., "max_search_radius_m": 50000.},
    {"reference_frame": "MOON_ME_DE440_ME421"}, {"latitude_deg": float("nan")},
    {"reference_frame": "MOON_ME_DE440_ME421", "coordinate_epoch_utc": "1970-01-01T00:00:00Z"}])
def test_api_bounds(tmp_path, patch):
    _, request = synthetic(tmp_path)
    with pytest.raises(ValidationError): changed(request, **patch)


def test_api_provenance_determinism_and_structured_errors(tmp_path):
    config, request = synthetic(tmp_path)
    app = create_app()
    app.dependency_overrides[terrain_service_factory] = lambda: lambda r: analyze_terrain(r, config)
    client = TestClient(app)
    a = client.post("/api/v1/terrain/horizon", json=request.model_dump(mode="json"))
    b = client.post("/api/v1/terrain/horizon", json=request.model_dump(mode="json"))
    assert a.status_code == 200
    assert a.json() == b.json()
    assert a.json()["horizon"]["global_horizon_complete"] is False
    assert a.json()["provenance"][0]["sha256"] == config.manifest["sha256"]
    assert a.json()["provenance"][0]["validation_status"] == "mock"
    bad = {**request.model_dump(mode="json"), "latitude_deg": 91.}
    assert client.post("/api/v1/terrain/horizon", json=bad).status_code == 422
    app.dependency_overrides[terrain_service_factory] = lambda: lambda r: (_ for _ in ()).throw(TerrainError("MISSING_DATA", "Missing pinned dataset"))
    response = client.post("/api/v1/terrain/horizon", json=request.model_dump(mode="json"))
    assert response.status_code == 503
    assert response.json()["errors"][0]["code"] == "MISSING_DATA"
    app.dependency_overrides[terrain_service_factory] = lambda: lambda r: (_ for _ in ()).throw(ImportError())
    response = client.post("/api/v1/terrain/horizon", json=request.model_dump(mode="json"))
    assert response.status_code == 503
    assert response.json()["errors"][0]["code"] == "PROVIDER_UNAVAILABLE"


def test_unknown_dataset_api_does_not_substitute_synthetic_terrain(tmp_path):
    _, request = synthetic(tmp_path)
    client = TestClient(create_app())
    response = client.post("/api/v1/terrain/horizon", json=request.model_dump(mode="json"))
    assert response.status_code == 503
    assert response.json()["errors"][0]["code"] == "MISSING_DATA"


def test_grid_nodata_mask_and_window_memory_guard(tmp_path, monkeypatch):
    from lunascend.terrain import dem as module
    values = np.zeros((21, 21), dtype="float32"); values[10, 10] = np.nan
    config, _ = synthetic(tmp_path, values)
    with LunarDEM(config) as dem:
        lon, lat = dem.to_geo.transform(np.array([-60., 60.]), np.array([8940., 9060.]))
        grid = dem.window_for(lon, lat).grid()
        assert sum(sum(row) for row in grid.nodata_mask) == 1
        assert sum(v is None for row in grid.heights_m for v in row) == 1
        monkeypatch.setattr(module, "MAX_WINDOW_PIXELS", 100)
        with pytest.raises(TerrainError, match="pixels"):
            dem.window_for(lon, lat)


@pytest.mark.kernels
def test_epoch_frame_bridge_and_original_spice_pool_isolation():
    pytest.importorskip("spiceypy")
    from lunascend.ephemeris.kernels import KernelConfiguration
    from lunascend.ephemeris.engine import analyze_geometry
    from lunascend.contracts import ScenarioRequest
    try:
        KernelConfiguration.from_environment().verify()
        if not (ROOT / "data/kernels/moon_pa_de421_1900-2050.bpc").exists(): pytest.skip("Restore terrain frame kernels")
    except Exception: pytest.skip("Restore original kernels")
    request = TerrainRequest(dataset_id="unused", latitude_deg=-89.5, longitude_deg=42.,
        reference_frame="MOON_ME_DE440_ME421", coordinate_epoch_utc="2026-11-14T00:00:00Z")
    matrix, info = frame_rotation(request)
    assert matrix @ matrix.T == pytest.approx(np.eye(3), abs=1e-12)
    vector = local_basis(-89.5, 42.)[0]
    assert matrix.T @ (matrix @ vector) == pytest.approx(vector, abs=1e-12)
    angle = np.arccos(np.clip((np.trace(matrix) - 1) / 2, -1, 1))
    assert 0 < angle < 3.071e-7  # NAIF's documented 2000-2040 maximum, not identity.
    assert len(info["kernels"]) == 7
    api_request = ScenarioRequest.model_validate_json((ROOT / "backend/examples/scientific-request.json").read_text())
    before = analyze_geometry(api_request, KernelConfiguration.from_environment())
    frame_rotation(request)
    after = analyze_geometry(api_request, KernelConfiguration.from_environment())
    assert before.observations == after.observations


@pytest.mark.kernels
def test_real_dataset_metadata_and_local_horizon_when_restored():
    config = DatasetConfiguration.selected("lola-site01-5m-v2020")
    if not config.path.exists(): pytest.skip("Restore NASA Site01 DEM")
    with LunarDEM(config) as dem:
        x, y = dem.dataset.xy(1600, 1600)
        assert (x, y) == (-10997.5, -12002.5)
        lon, lat = dem.to_geo.transform(x, y)
        raw = float(dem.dataset.read(1, window=rasterio.windows.Window(1600, 1600, 1, 1))[0, 0])
        assert dem.elevation(lon, lat) == pytest.approx(raw, abs=1e-8)
    request = TerrainRequest(dataset_id=config.manifest["dataset_id"], latitude_deg=lat, longitude_deg=lon,
        reference_frame="MOON_ME_DE421", observer_height_m=2., azimuth_samples=36, max_search_radius_m=1000., radial_step_m=5.)
    result = analyze_terrain(request)
    assert len(result.horizon.elevation_deg) == 36
    assert set(result.horizon.ray_coverage) == {"sampled_radius"}
    assert result.provenance[0].validation_status == "unvalidated" # Ingestion is not external accuracy validation.
    response = TestClient(create_app()).post("/api/v1/terrain/horizon", json=request.model_dump(mode="json"))
    assert response.status_code == 200
    assert response.json()["surface_elevation_m"] == pytest.approx(raw, abs=1e-8)
    assert response.json()["provenance"][0]["provider_mode"] == "scientific"
