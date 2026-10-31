# Step 4 deterministic mock provider

Implemented 2026-10-31. The generator is for display development and software tests only: **MOCK / NOT LUNAR PREDICTIONS**. No NASA data or lunar physics produces its values.

`providers/mock.py` implements the existing async AnalysisProvider and ScenarioRequest/ScenarioResult contracts. `mock-curves-v1` uses absolute nominal UTC civil seconds since 2000-01-01, arbitrary sine elevations (45 and 15 degree amplitudes) and modulo-360 azimuth ramps. Latitude/longitude shift these curves; heights and input frame labels do not transform coordinates. Overlapping requests give the same values at shared epochs. A SHA-256-derived ID includes the version and normalized entire request. No random generator, current clock, optional science packages, network service or runtime fixture is used.

Sampling starts at start_utc, advances by sample_step_s, and includes end_utc once with a shorter final interval when necessary. Fractional interior offsets truncate to microseconds; existing request bounds and a decimal-arithmetic 10001-sample guard apply. This illustrative clock uses nominal UTC civil seconds, not physical leap-second duration; the real scientific provider retains its separate SPICE/TAI behavior unchanged. Leap-second strings remain rejected by the common timestamp contract.

Observations have status illustrative; every metric (including unavailable polar azimuth) has validation mock and resolved synthetic provenance. The output frame is MOCK_DEMONSTRATION_FRAME, not the supplied scientific frame. Exact poles return null azimuth with reasons and partial scenario status. Elevation curves never reach zenith/nadir. Other measurements are available only as synthetic display values; no missing data is replaced by a scientific claim.

Terrain, visibility windows, power, communication and resilience are null. Enabling terrain/power/communication returns deterministic failed/INVALID_REQUEST (HTTP 422), rather than invented products. Clearance settings are not modeled. Scientific mode uses only ScientificAnalysisProvider; resource or calculation failures never call mock.

## API example

POST `/api/v1/scenarios/analyze` with [the complete request](../backend/examples/mock-request.json). It explicitly selects mock at a synthetic site (-89,10), from 2026-11-14T00:00:00Z through 00:10:00Z, step 240 seconds. The executed response is HTTP 200 with four observations at 00:00, 00:04, 00:08 and 00:10 UTC. The following excerpt shows the first observation; first_observation is a documentation shorthand for observations[0], not an API field:

```json
{
  "provider_mode": "mock",
  "model_version": "mock-curves-v1",
  "status": "complete",
  "warnings": [
    "MOCK / NOT LUNAR PREDICTIONS: synthetic demonstration data for software testing only.",
    "Terrain, visibility windows, power, communication and resilience are not modeled."
  ],
  "first_observation": {
    "status": "illustrative",
    "provenance_ids": [
      "mock-generator"
    ],
    "assumptions": [
      "MOCK / NOT LUNAR PREDICTIONS: synthetic demonstration data for software testing only."
    ],
    "time_utc": "2026-11-14T00:00:00Z",
    "reference_frame": "MOCK_DEMONSTRATION_FRAME",
    "correction_mode": "NONE",
    "sun_azimuth_deg": {
      "value": 10.0,
      "status": "available",
      "reason": null,
      "provenance_ids": [
        "mock-generator"
      ],
      "validation": "mock",
      "validation_report_id": null
    },
    "sun_elevation_deg": {
      "value": -9.356026086799169,
      "status": "available",
      "reason": null,
      "provenance_ids": [
        "mock-generator"
      ],
      "validation": "mock",
      "validation_report_id": null
    },
    "earth_azimuth_deg": {
      "value": 214.0,
      "status": "available",
      "reason": null,
      "provenance_ids": [
        "mock-generator"
      ],
      "validation": "mock",
      "validation_report_id": null
    },
    "earth_elevation_deg": {
      "value": -14.265847744427303,
      "status": "available",
      "reason": null,
      "provenance_ids": [
        "mock-generator"
      ],
      "validation": "mock",
      "validation_report_id": null
    }
  }
}
```

## Verification

On 2026-10-31, all 115 backend tests passed with science installed and verified kernels, including the unchanged scientific API and 36-row Horizons comparison test. The new mock module contributes 15 test cases. A separate base environment without SpiceyPy passed 81 tests, with the optional science test module explicitly skipped. Tests cover repeatable entire results, schema/angle validity, fractional/end-point sampling, UTC offsets, overlapping intervals, polar nulls, unsupported engineering errors, missing kernels, guarded scientific imports, explicit dispatch and a trap preventing scientific errors from invoking mock. The only warning is the existing Starlette HTTPX compatibility deprecation.

The committed example was executed through FastAPI TestClient and returned HTTP 200 with four schema-valid observations. Offline dependency lock check passed. Git diff confirmed no changes to scientific source/provider/tests, kernels/manifest, saved Step 3 evidence, public contracts, dependency files or frontend. No scientific validation report was rewritten. Frontend checks were not rerun because no frontend change or rebuild was requested.

For Windows commands see [SETUP.md](../SETUP.md). Base backend installation is sufficient; no dependency/lock change or scientific kernel download is required. Frontend and public contracts are unchanged; chart integration awaits the next instruction. Another-PC restoration remains untested.
