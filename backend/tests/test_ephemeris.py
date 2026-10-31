"""Scientific regression tests never use a live network service."""

import asyncio
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
from math import pi
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

spice = pytest.importorskip("spiceypy", reason="Install the locked science extra for SPICE tests")

from lunascend.contracts import LunarSite, ScenarioRequest, ScenarioResult
from lunascend.ephemeris import kernels as kernel_module
from lunascend.ephemeris.engine import (
    FRAME, REALIZATION, SURFACE, analyze_geometry, normalize_angles, observe,
    observe_with_provenance, sample_times, utc_to_et, validate_site,
)
from lunascend.ephemeris.kernels import GeometryError, KernelConfiguration, MANIFEST_PATH
from lunascend.ephemeris.manage import download
from lunascend.ephemeris.validation import compare_references, validation_sites, wrapped_difference
from lunascend.main import create_app
from lunascend.providers.scientific import ScientificAnalysisProvider


@pytest.fixture
def scientific_site():
    return validation_sites()[0]


@pytest.fixture
def scientific_request(scientific_site):
    return ScenarioRequest(site=scientific_site, provider_mode="scientific", sample_step_s=43200,
                           start_utc="2026-11-14T00:00:00Z", end_utc="2026-11-15T00:00:00Z")


@pytest.fixture
def configuration():
    config = KernelConfiguration.from_environment()
    if not all((config.kernel_dir / row["filename"]).exists() for row in config.manifest()["kernels"]):
        pytest.skip("Restore the documented NAIF kernels to run kernel integration tests")
    config.verify()  # Corrupt existing files are failures, not skips.
    return config


def test_exact_frame_and_height_requirements(scientific_site):
    validate_site(scientific_site)
    values = scientific_site.model_dump()
    for field, value in (("frame_id", "IAU_MOON"), ("frame_realization", "unspecified"),
                         ("latitude_type", "planetographic"), ("reference_radius_m", 1738000)):
        modified = scientific_site.model_dump()
        modified["coordinate_reference"][field] = value
        with pytest.raises(GeometryError) as caught:
            validate_site(LunarSite(**modified))
        assert caught.value.error.code == "FRAME_MISMATCH"
    values["surface_elevation_m"] = None
    with pytest.raises(GeometryError):
        validate_site(LunarSite(**values))


@pytest.mark.parametrize("az,expected", [(-pi / 2, 270), (0, 0), (2 * pi, 0), (3 * pi, 180)])
def test_azimuth_normalization(az, expected):
    assert normalize_angles(az, 0, -89)[0] == pytest.approx(expected)


@pytest.mark.parametrize("latitude,elevation", [(90, 0), (-90, 0), (1, pi / 2), (1, -pi / 2)])
def test_undefined_azimuth_is_null(latitude, elevation):
    azimuth, result = normalize_angles(1, elevation, latitude)
    assert azimuth is None
    assert -90 <= result <= 90


@pytest.mark.parametrize("az,elevation", [(float("nan"), 0), (0, float("inf")), (0, pi)])
def test_invalid_numerical_output_is_not_clipped_into_a_measurement(az, elevation):
    with pytest.raises(GeometryError):
        normalize_angles(az, elevation, 0)


def test_wrapped_comparison_handles_north_seam():
    assert wrapped_difference(359.999, .001) == pytest.approx(.002)


def test_missing_kernel_is_structured(tmp_path, scientific_request):
    result = asyncio.run(ScientificAnalysisProvider(KernelConfiguration(tmp_path)).analyze(scientific_request))
    assert result.status == "unavailable"
    assert result.errors[0].code == "MISSING_DATA"
    assert result.observations is None
    assert result.errors[0].details["filename"] == "naif0012.tls"


def test_checksum_mismatch_is_not_used(tmp_path):
    (tmp_path / "naif0012.tls").write_text("damaged", encoding="utf-8")
    with pytest.raises(GeometryError) as caught:
        KernelConfiguration(tmp_path).verify()
    assert caught.value.error.details["reason"] == "checksum_mismatch"


def test_invalid_manifest_is_rejected(tmp_path):
    manifest = tmp_path / "manifest.json"
    manifest.write_text("{}", encoding="utf-8")
    with pytest.raises(GeometryError):
        KernelConfiguration(tmp_path, manifest).manifest()


def test_missing_optional_library_is_structured(monkeypatch, tmp_path):
    def unavailable(name):
        raise ImportError("optional dependency absent")
    monkeypatch.setattr(kernel_module.importlib, "import_module", unavailable)
    with pytest.raises(GeometryError) as caught:
        with KernelConfiguration(tmp_path).loaded():
            pass
    assert caught.value.error.code == "PROVIDER_UNAVAILABLE"


@pytest.mark.kernels
def test_verified_kernels_and_actual_coverage(configuration):
    with configuration.loaded() as loaded:
        assert len(loaded.records) == 5
        assert all(len(record["sha256"]) == 64 for record in loaded.records)
        assert loaded.coverage_et
        assert loaded.spice.namfrm(FRAME) == 31009
        assert loaded.spice.frinfo(31008) == (301, 2, 31008)
    assert spice.ktotal("ALL") == 0


@pytest.mark.kernels
def test_existing_verified_kernels_do_not_redownload(configuration, monkeypatch):
    def no_network(*args, **kwargs):
        raise AssertionError("Verified kernels must not be downloaded again")
    monkeypatch.setattr("urllib.request.urlopen", no_network)
    download(configuration)


@pytest.mark.kernels
def test_utc_et_roundtrip_and_offset_normalization(configuration):
    with configuration.loaded() as loaded:
        utc = datetime(2026, 11, 14, 2, tzinfo=timezone(timedelta(hours=2)))
        et = utc_to_et(utc, loaded.spice)
        assert loaded.spice.et2utc(et, "ISOC", 6) == "2026-11-14T00:00:00.000000"
        with pytest.raises(GeometryError):
            utc_to_et(datetime(2026, 11, 14), loaded.spice)
        with pytest.raises(GeometryError):
            utc_to_et(datetime(1960, 1, 1, tzinfo=timezone.utc), loaded.spice)


@pytest.mark.kernels
def test_leap_second_conversion_and_explicit_interval_rejection(configuration, scientific_request):
    values = scientific_request.model_dump()
    values.update(start_utc="2016-12-31T23:59:59Z", end_utc="2017-01-01T00:00:00Z", sample_step_s=1)
    request = ScenarioRequest(**values)
    with configuration.loaded() as loaded:
        a, b = utc_to_et(request.start_utc, loaded.spice), utc_to_et(request.end_utc, loaded.spice)
        span_tai = loaded.spice.unitim(b, "ET", "TAI") - loaded.spice.unitim(a, "ET", "TAI")
        assert span_tai == pytest.approx(2, abs=1e-6)
        with pytest.raises(GeometryError) as caught:
            sample_times(request, loaded)
        assert caught.value.error.code == "UNSUPPORTED_TIME"


@pytest.mark.kernels
@pytest.mark.parametrize("seconds,step,expected", [(10, 5, 3), (10, 4, 4), (.01, .001, 11), (1, 2, 2)])
def test_sampling_boundaries(configuration, scientific_request, seconds, step, expected):
    values = scientific_request.model_dump()
    values.update(end_utc=scientific_request.start_utc + timedelta(seconds=seconds), sample_step_s=step)
    request = ScenarioRequest(**values)
    with configuration.loaded() as loaded:
        samples = sample_times(request, loaded)
    times = [row[0] for row in samples]
    assert len(times) == expected
    assert times[0] == request.start_utc and times[-1] == request.end_utc
    assert all(b > a for a, b in zip(times, times[1:]))


@pytest.mark.kernels
def test_outside_actual_coverage(configuration, scientific_request):
    values = scientific_request.model_dump()
    values.update(start_utc="2200-01-01T00:00:00Z", end_utc="2200-01-02T00:00:00Z")
    result = asyncio.run(ScientificAnalysisProvider(configuration).analyze(ScenarioRequest(**values)))
    assert result.errors[0].code == "OUTSIDE_COVERAGE"
    assert result.observations is None


@pytest.mark.kernels
def test_complete_time_series_contract_and_determinism(configuration, scientific_request):
    first = analyze_geometry(scientific_request, configuration)
    second = analyze_geometry(scientific_request, configuration)
    assert first == second
    assert len(first.observations) == 3
    assert first.status == "complete"
    assert first.horizon is first.visibility_windows is first.power is first.communication is first.resilience is None
    assert all(item.status == "calculated" for item in first.observations)
    assert ScenarioResult.model_validate_json(first.model_dump_json()) == first
    ids = {item.id for item in first.provenance}
    for observation in first.observations:
        assert set(observation.provenance_ids) <= ids
        for name in ("sun_azimuth_deg", "earth_azimuth_deg"):
            assert 0 <= getattr(observation, name).value < 360
        for name in ("sun_elevation_deg", "earth_elevation_deg"):
            assert -90 <= getattr(observation, name).value <= 90


@pytest.mark.kernels
@pytest.mark.parametrize("latitude", [-90, 90])
def test_exact_poles_keep_elevation_without_arbitrary_azimuth(configuration, scientific_site, latitude):
    values = scientific_site.model_dump()
    values["latitude_deg"] = latitude
    result = observe(LunarSite(**values), datetime(2026, 11, 14, tzinfo=timezone.utc), configuration)
    assert result.status == "partial"
    assert result.sun_azimuth_deg.value is result.earth_azimuth_deg.value is None
    assert result.sun_elevation_deg.value is not None
    assert result.earth_elevation_deg.value is not None


@pytest.mark.kernels
def test_single_epoch_resolves_sources(configuration, scientific_site):
    observation, sources = observe_with_provenance(scientific_site, datetime(2026, 11, 14, tzinfo=timezone.utc), configuration)
    assert set(observation.provenance_ids) == {source.id for source in sources}
    assert all(source.provider_mode == "scientific" and source.sha256 for source in sources)


@pytest.mark.kernels
def test_unmatched_epochs_do_not_claim_reference_comparison(configuration, scientific_site):
    result = observe(scientific_site, datetime(2026, 11, 16, tzinfo=timezone.utc), configuration)
    assert result.sun_elevation_deg.validation == "unvalidated"
    assert result.sun_elevation_deg.validation_report_id is None


@pytest.mark.kernels
def test_serialized_spice_access_is_deterministic(configuration, scientific_request):
    with ThreadPoolExecutor(max_workers=2) as executor:
        results = list(executor.map(lambda _: analyze_geometry(scientific_request, configuration), range(2)))
    assert results[0] == results[1]
    assert spice.ktotal("ALL") == 0


@pytest.mark.kernels
def test_scientific_api_success_and_invalid_frame(configuration, scientific_request, monkeypatch):
    monkeypatch.setenv("LUNASCEND_KERNEL_DIR", str(configuration.kernel_dir))
    with TestClient(create_app()) as client:
        info = client.get("/api/v1/info").json()
        assert info["scientific_calculations_available"] is True
        response = client.post("/api/v1/scenarios/analyze", json=scientific_request.model_dump(mode="json"))
        assert response.status_code == 200
        assert len(response.json()["observations"]) == 3
        values = scientific_request.model_dump(mode="json")
        values["site"]["coordinate_reference"]["frame_id"] = "IAU_MOON"
        response = client.post("/api/v1/scenarios/analyze", json=values)
        assert response.status_code == 422
        assert response.json()["errors"][0]["code"] == "FRAME_MISMATCH"


@pytest.mark.kernels
def test_saved_horizons_comparisons_pass_fixed_criteria(configuration):
    report = compare_references(configuration, write_report=False)
    assert report["overall_passed"]
    assert report["summary"]["geometric"]["comparisons"] == 18
    assert report["summary"]["apparent"]["comparisons"] == 18
