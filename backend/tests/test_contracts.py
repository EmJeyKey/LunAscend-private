from datetime import timedelta

import pytest
from pydantic import ValidationError

from lunascend.contracts import (
    AnalysisError, AnalysisSettings, CommunicationAnalysis, DataProvenance,
    EphemerisObservation, HorizonProfile, LunarSite, Metric, PowerAnalysis,
    ResilienceAnalysis, ScenarioRequest, ScenarioResult, VisibilityWindow,
)


def test_lunar_metadata_and_missing_elevation(site_data):
    site = LunarSite(**site_data)
    assert site.coordinate_reference.body == "MOON"
    assert site.coordinate_reference.latitude_type == "planetocentric"
    assert site.surface_elevation_m is None


@pytest.mark.parametrize("latitude", [-90, 90, 0])
def test_valid_latitude(site_data, latitude):
    assert LunarSite(**(site_data | {"latitude_deg": latitude})).latitude_deg == latitude


@pytest.mark.parametrize("latitude", [-90.001, 90.001, float("nan"), float("inf"), True])
def test_invalid_latitude(site_data, latitude):
    with pytest.raises(ValidationError):
        LunarSite(**(site_data | {"latitude_deg": latitude}))


@pytest.mark.parametrize("longitude,expected", [(-180, -180), (180, -180), (360, 0), (-181, 179), (720, 0)])
def test_longitude_wrap(site_data, longitude, expected):
    assert LunarSite(**(site_data | {"longitude_deg": longitude})).longitude_deg == expected


@pytest.mark.parametrize("value", [float("inf"), float("nan"), "east", True])
def test_invalid_longitude(site_data, value):
    with pytest.raises(ValidationError):
        LunarSite(**(site_data | {"longitude_deg": value}))


def test_required_reference_metadata(site_data):
    del site_data["coordinate_reference"]["frame_realization"]
    with pytest.raises(ValidationError):
        LunarSite(**site_data)


def test_earth_metadata_rejected(site_data):
    site_data["coordinate_reference"]["body"] = "EARTH"
    with pytest.raises(ValidationError):
        LunarSite(**site_data)


def test_utc_normalization(request_data):
    request_data["start_utc"] = "2026-11-14T02:00:00+02:00"
    request = ScenarioRequest(**request_data)
    assert request.start_utc.utcoffset() == timedelta(0)
    assert request.model_dump(mode="json")["start_utc"] == "2026-11-14T00:00:00Z"


@pytest.mark.parametrize("patch", [
    {"start_utc": "2026-11-14T00:00:00"},
    {"start_utc": 1794614400},
    {"end_utc": "2026-11-14T00:00:00Z"},
    {"end_utc": "2026-11-13T00:00:00Z"},
    {"start_utc": "2016-12-31T23:59:60Z"},
    {"sample_step_s": 0}, {"sample_step_s": -1},
    {"sample_step_s": float("nan")}, {"sample_step_s": True},
    {"sample_step_s": 0.0001}, {"sample_step_s": 1},
    {"end_utc": "2028-01-01T00:00:00Z"},
    {"provider_mode": "automatic"},
])
def test_invalid_requests(request_data, patch):
    with pytest.raises(ValidationError):
        ScenarioRequest(**(request_data | patch))


def test_sample_count_includes_extra_end_sample(request_data):
    # 10000.1 intervals require 10002 samples when the end is included.
    request_data.update(end_utc="2026-11-14T02:46:40.100000Z", sample_step_s=1)
    with pytest.raises(ValidationError):
        ScenarioRequest(**request_data)
    request_data["end_utc"] = "2026-11-14T02:46:40Z"
    ScenarioRequest(**request_data)


def test_explicit_provider_required(request_data):
    del request_data["provider_mode"]
    with pytest.raises(ValidationError):
        ScenarioRequest(**request_data)


def available(value, validation="unvalidated"):
    return {"value": value, "status": "available", "validation": validation}


def observation(**kwargs):
    return EphemerisObservation(time_utc="2026-11-14T00:00:00Z", reference_frame="TEST_FRAME", **kwargs)


def test_missing_measurements_remain_null():
    result = observation()
    assert result.sun_elevation_deg.value is None
    assert result.sun_elevation_deg.status == "unavailable"


def test_valid_angles():
    result = observation(status="calculated", sun_azimuth_deg=available(0),
                         sun_elevation_deg=available(-90), earth_elevation_deg=available(90))
    assert result.sun_azimuth_deg.value == 0


@pytest.mark.parametrize("field,value", [
    ("sun_azimuth_deg", 360), ("earth_azimuth_deg", -1),
    ("sun_elevation_deg", 90.001), ("earth_elevation_deg", -90.001),
    ("sun_elevation_deg", float("nan")),
])
def test_invalid_angles(field, value):
    with pytest.raises(ValidationError):
        observation(status="calculated", **{field: available(value)})


def test_mock_and_calculated_are_distinct():
    mock = available(1, "mock")
    observation(status="illustrative", sun_elevation_deg=mock)
    with pytest.raises(ValidationError):
        observation(status="calculated", sun_elevation_deg=mock)
    with pytest.raises(ValidationError):
        observation(status="illustrative", sun_elevation_deg=available(1))


def test_metric_availability_and_validation():
    for payload in ({"value": 0}, {"status": "available"},
                    {"validation": "validated"}):
        with pytest.raises(ValidationError):
            Metric[float](**payload)
    with pytest.raises(ValidationError):
        observation(sun_elevation_deg=available(0))


@pytest.mark.parametrize("azimuth,elevation", [([0, 90], [1]), ([90, 0], [1, 2]), ([0, 0], [1, 2])])
def test_invalid_horizon_arrays(azimuth, elevation):
    with pytest.raises(ValidationError):
        HorizonProfile(site_id="test", reference_frame="TEST", status="illustrative",
                       azimuth_deg=azimuth, elevation_deg=elevation)


def test_unknown_horizon_sectors():
    profile = HorizonProfile(site_id="test", reference_frame="TEST",
                             azimuth_deg=[0, 90], elevation_deg=[None, None])
    assert profile.terrain_source is None
    assert profile.elevation_deg == (None, None)


def test_visibility_duration_derived_not_supplied():
    values = dict(target="earth", start_utc="2026-11-14T00:00:00Z",
                  end_utc="2026-11-14T00:01:00Z", classification="unknown")
    window = VisibilityWindow(**values)
    assert window.model_dump(mode="json")["duration_s"] == 60
    for patch in ({"duration_s": 100}, {"end_utc": values["start_utc"]},
                  {"classification": "visible"}):
        with pytest.raises(ValidationError):
            VisibilityWindow(**(values | patch))


def test_engineering_unknowns_and_battery_bounds():
    assert PowerAnalysis().solar_generation_w.value is None
    assert CommunicationAnalysis().windows is None
    assert CommunicationAnalysis().link_availability == "not_modeled"
    assert ResilienceAnalysis(baseline_scenario_id="baseline").alternatives is None
    with pytest.raises(ValidationError):
        PowerAnalysis(status="calculated", battery_capacity_wh=10, stored_energy_wh=available(11))
    with pytest.raises(ValidationError):
        PowerAnalysis(solar_generation_w=available(0))


def test_structured_error():
    error = AnalysisError(code="MISSING_DATA", message="Terrain missing", recoverable=True)
    assert error.model_dump()["details"] == {}
    assert error.recoverable is True


def test_mock_provenance_cannot_be_validated():
    with pytest.raises(ValidationError):
        DataProvenance(id="test", provider_name="test", provider_mode="mock",
                       data_source="synthetic", calculation_method="none", validation_status="validated")


def test_all_public_contract_schemas_generate():
    for model in (LunarSite, ScenarioRequest, EphemerisObservation, HorizonProfile,
                  VisibilityWindow, PowerAnalysis, CommunicationAnalysis, ResilienceAnalysis,
                  DataProvenance, AnalysisError, ScenarioResult, AnalysisSettings):
        assert model.model_json_schema()["title"]
