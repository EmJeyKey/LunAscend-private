"""Synthetic contract inputs, not surveyed lunar locations or predictions."""

import pytest


@pytest.fixture
def site_data():
    return {
        "site_id": "contract-test", "name": "Synthetic contract location",
        "latitude_deg": -89.0, "longitude_deg": 10.0,
        "coordinate_reference": {
            "latitude_type": "planetocentric", "frame_id": "TEST_FRAME",
            "frame_realization": "synthetic-only",
            "reference_surface": "unspecified synthetic test surface",
        },
    }


@pytest.fixture
def request_data(site_data):
    return {
        "site": site_data, "provider_mode": "scientific",
        "start_utc": "2026-11-14T00:00:00Z", "end_utc": "2026-11-15T00:00:00Z",
        "sample_step_s": 3600.0,
    }
