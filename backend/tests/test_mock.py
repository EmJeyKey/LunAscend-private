"""Mock software behavior and provider isolation, not scientific accuracy tests."""

import asyncio
import builtins
from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient
import pytest

from lunascend.contracts import ScenarioRequest, ScenarioResult
from lunascend.main import create_app
from lunascend.providers import get_provider
from lunascend.providers.mock import MOCK_FRAME, MockAnalysisProvider, sample_times
from lunascend.providers.scientific import ScientificAnalysisProvider


@pytest.fixture
def mock_request(request_data):
    return ScenarioRequest(**(request_data | {"provider_mode": "mock", "sample_step_s": 43200.0}))


def analyze(request):
    return asyncio.run(MockAnalysisProvider().analyze(request))


def test_mock_contract_repeatability_and_labels(mock_request):
    result = analyze(mock_request)
    assert result == analyze(mock_request)
    assert ScenarioResult.model_validate_json(result.model_dump_json()) == result
    assert result.status == "complete" and len(result.observations) == 3
    assert result.provider_mode == result.request.provider_mode == "mock"
    assert "MOCK / NOT LUNAR PREDICTIONS" in result.warnings[0]
    source = result.provenance[0]
    assert source.provider_name == "MockAnalysisProvider"
    assert source.data_source == "Synthetic demonstration data"
    assert source.calculation_method.startswith("Deterministic mock generator")
    assert source.validation_status == "mock" and source.validation_report_id is None
    assert source.source_url is source.terrain_dataset is None
    for item in result.observations:
        assert item.status == "illustrative" and item.reference_frame == MOCK_FRAME
        assert item.provenance_ids == (source.id,)
        for name in ("sun_azimuth_deg", "earth_azimuth_deg", "sun_elevation_deg", "earth_elevation_deg"):
            metric = getattr(item, name)
            assert metric.validation == "mock" and metric.validation_report_id is None
            assert metric.provenance_ids == (source.id,)
            assert metric.status == "available"
            assert (0 <= metric.value < 360) if "azimuth" in name else (-90 <= metric.value <= 90)
    for field in ("horizon", "visibility_windows", "power", "communication", "resilience"):
        assert getattr(result, field) is None


@pytest.mark.parametrize("span,step,offsets", [(10, 4, [0, 4, 8, 10]), (10, 20, [0, 10]),
    (10, 5, [0, 5, 10]), (.01, .001, [index / 1000 for index in range(11)]),
    (1, .3333333, [0, .333333, .666666, .999999, 1])])
def test_mock_sampling_endpoints_and_fractional_steps(mock_request, span, step, offsets):
    values = mock_request.model_dump()
    values.update(end_utc=mock_request.start_utc + timedelta(seconds=span), sample_step_s=step)
    request = ScenarioRequest(**values)
    times = sample_times(request)
    assert [(t - request.start_utc).total_seconds() for t in times] == offsets
    assert times[0] == request.start_utc and times[-1] == request.end_utc
    assert len(set(times)) == len(times)


def test_mock_timezone_equivalence_and_overlapping_intervals(mock_request):
    values = mock_request.model_dump()
    values["start_utc"] = mock_request.start_utc.astimezone(timezone(timedelta(hours=2)))
    values["end_utc"] = mock_request.end_utc.astimezone(timezone(timedelta(hours=2)))
    assert analyze(ScenarioRequest(**values)) == analyze(mock_request)
    values["start_utc"] = mock_request.start_utc + timedelta(hours=12)
    assert analyze(ScenarioRequest(**values)).observations == analyze(mock_request).observations[1:]


@pytest.mark.parametrize("latitude", [-90, 90])
def test_mock_undefined_polar_azimuth(mock_request, latitude):
    values = mock_request.model_dump()
    values["site"]["latitude_deg"] = latitude
    result = analyze(ScenarioRequest(**values))
    assert result.status == "partial"
    for item in result.observations:
        assert item.status == "illustrative"
        assert item.sun_azimuth_deg.value is item.earth_azimuth_deg.value is None
        assert item.sun_azimuth_deg.validation == item.earth_azimuth_deg.validation == "mock"
        assert item.sun_azimuth_deg.reason and item.sun_elevation_deg.value is not None


def test_mock_uses_site_coordinates_and_absolute_epoch(mock_request):
    values = mock_request.model_dump()
    values["site"]["longitude_deg"] += 5
    assert analyze(ScenarioRequest(**values)).observations != analyze(mock_request).observations
    values = mock_request.model_dump()
    values["start_utc"] += timedelta(hours=1)
    values["end_utc"] += timedelta(hours=1)
    assert analyze(ScenarioRequest(**values)).observations[0].sun_elevation_deg != analyze(mock_request).observations[0].sun_elevation_deg


@pytest.mark.parametrize("setting", ["terrain_enabled", "power_enabled", "communication_enabled"])
def test_mock_rejects_unimplemented_engineering(mock_request, setting):
    values = mock_request.model_dump()
    values["settings"][setting] = True
    request = ScenarioRequest(**values)
    result = analyze(request)
    assert result == analyze(request)
    assert result.status == "failed" and result.errors[0].code == "INVALID_REQUEST"
    assert result.observations is result.power is result.communication is result.horizon is None
    with TestClient(create_app()) as client:
        response = client.post("/api/v1/scenarios/analyze", json=request.model_dump(mode="json"))
        assert response.status_code == 422


def test_mock_api_has_no_scientific_or_network_dependency(mock_request, monkeypatch, tmp_path):
    monkeypatch.setenv("LUNASCEND_KERNEL_DIR", str(tmp_path / "absent"))
    original_import = builtins.__import__

    def guarded_import(name, *args, **kwargs):
        if name.split(".")[0] in ("spiceypy", "numpy") or name.startswith("lunascend.ephemeris"):
            raise AssertionError(f"Mock must not import science: {name}")
        return original_import(name, *args, **kwargs)

    monkeypatch.setattr(builtins, "__import__", guarded_import)
    with TestClient(create_app()) as client:
        response = client.post("/api/v1/scenarios/analyze", json=mock_request.model_dump(mode="json"))
        assert response.status_code == 200
        assert ScenarioResult.model_validate(response.json()) == analyze(mock_request)


def test_explicit_selection_and_no_fallback(mock_request, monkeypatch, tmp_path):
    assert isinstance(get_provider("mock"), MockAnalysisProvider)
    assert isinstance(get_provider("scientific"), ScientificAnalysisProvider)
    values = mock_request.model_dump()
    values["provider_mode"] = "scientific"
    request = ScenarioRequest(**values)
    with pytest.raises(ValueError, match="selection mismatch"):
        asyncio.run(MockAnalysisProvider().analyze(request))
    monkeypatch.setenv("LUNASCEND_KERNEL_DIR", str(tmp_path / "absent"))

    async def forbidden_mock(*args):
        raise AssertionError("Scientific failures must not call mock")

    monkeypatch.setattr(MockAnalysisProvider, "analyze", forbidden_mock)
    with TestClient(create_app()) as client:
        response = client.post("/api/v1/scenarios/analyze", json=request.model_dump(mode="json"))
        assert response.status_code == 503
        result = ScenarioResult.model_validate(response.json())
        assert result.provider_mode == "scientific" and result.observations is None
        assert result.errors[0].code in ("MISSING_DATA", "PROVIDER_UNAVAILABLE")
        assert all(source.provider_mode == "scientific" and source.validation_status != "mock" for source in result.provenance)
