# LunAscend architecture — Step 2

Status: backend foundation implemented, 2026-10-29. Scientific calculations, datasets and frontend remain planned and unvalidated. Challenge title and November 14–15 competition dates come from the team brief; official event details and submission rules still require team verification.

## Implemented backend foundation

`backend/src/lunascend/main.py` creates FastAPI and safe exception handlers. `api/routes.py` exposes `GET /health`, `GET /api/v1/info` and `POST /api/v1/scenarios/analyze`, plus standard `/docs` and `/openapi.json`. These replace the Step 1 proposed endpoint names below. Health describes process availability, not scientific readiness. Info reports zero implemented analysis providers and no scientific/mock calculation capability.

`contracts/common.py` defines boundary types, UTC normalization, finite numeric ranges, generic Metric and structured errors. `contracts/models.py` implements all twelve requested contracts plus coordinate metadata and scenario-comparison helper models. Models and generated OpenAPI are authoritative for current fields. The original contract table below remains a later scientific blueprint, not a claim that every proposed field exists now.

`providers/__init__.py` defines an async AnalysisProvider protocol and a minimal UnavailableProvider selected explicitly from request.provider_mode. Both mock and scientific modes return HTTP 503 with an unavailable ScenarioResult, structured error, request metadata and honest provenance. Scientific products are null. No default selection or fallback exists. Unexpected provider failures return a safe 500 error envelope; validation failures return 422 with structured errors and no raw request echo.

Step 2 simplifications: each EphemerisObservation groups Sun and Earth angle metrics at one UTC timestamp. HorizonProfile uses equal-length sorted azimuth/elevation arrays with null unknown sectors. VisibilityWindow duration_s is computed for output and cannot be supplied as input. Power/communication/resilience models define fields only; no engineering algorithm runs. Calculated and illustrative status are distinct; available illustrative metrics must retain mock validation. Validated/reference-compared metadata requires a report ID, but schema validation cannot verify the referenced report's scientific quality.

Request limits are 366 days, 10001 samples including both endpoints, and a minimum 0.001-second positive step. The planned schedule starts at start_utc, advances by step, and includes end_utc once even if the last interval is shorter; no samples are generated yet. Longitude is normalized from any finite numeric degrees to [-180,180). Planetographic metadata is representable, but no conversion is implemented or implied. Frame ID, realization and named reference surface are mandatory; a radius is optional until a real model is selected. Earth-body metadata is rejected.

Timezone-aware ISO timestamps are normalized to UTC and serialized with Z; naive timestamps, epoch-number input and leap-second strings are rejected. Step 2 interval validation and derived duration use nominal UTC civil seconds; they do not count leap seconds. This metadata behavior must be replaced or guarded for physical duration calculations in Step 3. No scientific elapsed-time accuracy is claimed.

Tests cover contracts, API behavior, explicit selection, unavailable values, safe failures and schema generation. They are software checks, not scientific validation. No future domain directories were created solely as placeholders. No environment variables, secrets or services beyond Uvicorn are required; provider choice lives in each request. Dataset paths and CORS configuration are deferred until needed.

## System design

A local monorepo contains a React/TypeScript client and Python/FastAPI service. HTTP JSON is the only application boundary. No database, Docker, cloud account or external service is required for local mock operation. Scientific reference services are used during validation, not on every request.

```text
React views -> typed API client -> FastAPI request validation
                                  -> AnalysisProvider
                                     | MockAnalysisProvider
                                     | ScientificAnalysisProvider
                                       ephemeris + terrain -> visibility
                                       visibility -> power + communication
                                       scenario metrics -> resilience
```

Long-term directory plan (Step 2 implements backend contracts, providers, API, main.py and tests in addition to root documents):

```text
LunAscend/
  AGENTS.md
  ARCHITECTURE.md
  SETUP.md
  DEVELOPMENT_ROADMAP.md
  .gitignore
  .env.example                       # later: nonsecret backend settings
  backend/
    pyproject.toml, uv.lock, .python-version
    src/lunascend/
      api/                           # HTTP routes, validation, settings
      contracts/                     # canonical Pydantic boundary schemas
      providers/                     # protocol, mock, scientific
      ephemeris/, terrain/, visibility/
      power/, communication/, resilience/
      data/                          # loaders and manifest validation
    tests/unit/, tests/api/, tests/reference/
  frontend/
    package.json, package-lock.json, .node-version
    .env.example, vite.config.ts
    src/api/, src/types/, src/pages/, src/components/
    src/styles/, src/test/
  data/
    manifests/                       # tracked metadata and hashes
    fixtures/                        # small permitted synthetic/reference inputs
    raw/, processed/, kernels/       # ignored, restored separately
  docs/validation/                    # methods, recorded results, tolerances
  scripts/                            # later: explicit setup/data checks
```

Keep large computations bounded by time span, sample count, site count and terrain extent. Begin with a single local service process; SPICE's kernel pool is process-global, so initialize one immutable kernel set and serialize access until concurrency is tested. No job queue yet. Cache only when needed, keyed by normalized request, provider version, models and dataset hashes.

## Module boundaries

| Module | Input → responsibility → output |
| --- | --- |
| Ephemeris | Site, times, kernels → UTC/ET conversion, lunar frame transforms and libration, observer-relative Sun/Earth vectors → azimuth/elevation/range and angular radius |
| Terrain | Site, observer height, labeled DEM → projection, local sampling, body curvature and directional ray horizons → horizon profile with coverage and provenance |
| Visibility | Observations, horizon, clearance and disk policy → classify samples, refine crossings, integrate known intervals → solar/Earth/joint windows and longest gaps |
| Power | Solar geometry, visibility, panel normal, load and battery settings → incidence and energy balance → generation, battery history, unmet load |
| Communication | Earth geometry/visibility and minimum clearance → line-of-sight windows → duration and longest blackout; link budget deferred |
| Resilience | Explicit scenarios and constraints → date/site/delay comparisons → metric deltas, constraint outcomes, transparent trade-offs; no default weighted score |
| Visualization | Provider results → six coordinated pages, charts, map and eventual local 3D terrain; no scientific computation inside components |

## Scientific conventions

- Surface coordinates are planetocentric latitude in degrees, north positive [-90,90], and east-positive longitude normalized to [-180,180). Document conversions from planetodetic inputs. Exact poles require a declared reference meridian for local north or an explicit unsupported-coordinate error in the first prototype.
- Use a Moon-centered body-fixed mean-Earth/polar-axis realization consistent with the selected DEM. Store the exact SPICE frame name/ID and kernel realization, not only `MOON_ME`. Principal-axis and mean-Earth frames are not interchangeable; do not substitute `IAU_MOON` without documenting and quantifying the difference. Step 3 selects a matched planetary SPK, lunar binary PCK, FK, constants PCK and leap-second kernel, including coverage and hashes.
- Cartesian frame is right-handed: +Z north pole, +X prime meridian on equator, +Y completes the triad. Local ENU uses radial up for the declared spherical reference; an eventual ellipsoidal normal is a different explicit model. Azimuth is clockwise from local north [0,360); elevation is above the local tangent plane [-90,90]. Azimuth at zenith/nadir may be null.
- Site elevation is meters above a named reference surface with declared radius/axes. Observer height is meters above local ground. A missing site elevation cannot silently become zero. Synthetic tests may explicitly use a configured sphere; real datasets must supply their own datum/radius and scale/offset. SPICE km are converted at the adapter boundary; API distances are meters.
- External timestamps are ISO 8601 UTC with `Z`; reject naive dates. Internal ephemeris time is SPICE ET (TDB seconds relative to J2000). Duration calculations use a monotonic scientific time scale, not naive UTC subtraction across leap seconds. Leap-second parsing/support is a Step 3 gate; unsupported input must error explicitly.
- Prototype geometry is geometric (`NONE`) with no lunar atmospheric refraction. Apparent geometry/light-time/stellar aberration are separately named options only after validation. Record target center (Sun 10, Earth 399), observer, correction mode and frame in results. Horizons comparisons must match these choices or document residual model differences.
- Geometric tangent horizon is 0 degrees; a curved surface viewed from height can have horizon dip. Terrain horizons are elevations relative to the local tangent, with explicit search extent and far-field coverage. Missing cells or truncated rays yield unknown sectors; a flat zero horizon is only an explicitly labeled approximation.
- Initial visibility uses body-center clearance `elevation - horizon - margin > 0`. Equality is borderline. Preserve body angular radius so future any-disk/full-disk rules can use upper/lower limbs. Center approximation is not a fractional solar-disk illumination model. Earth-disk visibility does not imply a particular ground station is visible.
- Samples include both requested endpoints; intervals are half-open [start,end). Refine bracketed transitions later; preserve brackets and resolution. Do not claim sub-sample precision without refinement or ignore events between coarse samples. Upcoming transition outside the analysis range is unknown, not never.
- Visibility is visible/obstructed/borderline/unknown. Joint states are sunlight-only/Earth-only/both/neither/unknown; incomplete inputs cannot become neither. Durations and longest gaps report coverage and endpoint censoring. Percentages use a declared denominator and unknown duration is reported separately.
- No invented uncertainty bounds. User-specified clearance is an operational margin, not measured error. Preserve source error metadata, effective resolution and sensitivity results separately.

## Scientific contract blueprint (Step 1 target; see implemented scope above)

Canonical boundary schemas will live in Python contracts and produce OpenAPI/JSON Schema. Generate or check TypeScript types against those schemas in Step 5; never maintain two independent scientific definitions. JSON uses snake_case, finite numbers, explicit unit suffixes and null for unavailable values. Required keys remain present; empty arrays mean no items only when status is available.

Shared `Metric<T>`: `value: T | null`, `status: available | unavailable | not_requested | partial`, `reason: string | null`, `provenance_ids: string[]`, `validation: mock | unvalidated | reference_compared | validated`, `validation_report_id: string | null`. Validated requires a scoped executed report; it is not a global certification.

| Contract | Required specification fields |
| --- | --- |
| LunarSite | site_id, name, latitude_deg, longitude_deg, coordinate_type, frame_id, reference_surface (id, radius_m or axes_m), surface_elevation_m nullable, observer_height_m, provenance_ids |
| ScenarioRequest | schema_version, request_id, site, start_utc, end_utc, sample_step_s, provider_mode (mock/scientific), geometry options, horizon_mode (terrain/geometric_approximation), disk_policy, sun_clearance_deg, earth_clearance_deg, optional power_config; positive time step, end > start, bounded sample count |
| ScenarioResult | schema_version, scenario_id, normalized_request, provider_mode, model_version, status (complete/partial/failed), observations, horizon, solar_windows, earth_windows, joint_windows, duration_metrics, power, communication, resilience, provenance[], errors[], warnings[], generated_at_utc |
| EphemerisObservation | time_utc, target (sun/earth), azimuth_deg Metric, elevation_deg Metric, distance_m Metric, angular_radius_deg Metric, frame_id, correction_mode |
| HorizonProfile | site_id, frame_id, observer_height_m, method, azimuth_step_deg, max_range_m, samples[{azimuth_deg, elevation_deg Metric, coverage}], terrain_dataset_ids; sorted azimuths and circular interpolation across 360/0 |
| VisibilityWindow | start_utc, end_utc, target (sun/earth/joint), state, start_bracket_utc/end_bracket_utc nullable, resolution_s, start_censored, end_censored, policy, provenance_ids |
| PowerAnalysis | status, assumptions, samples[{time_utc, generated_w, load_w, battery_wh, state_of_charge, unmet_load_w}], unmet_energy_wh Metric, minimum_battery_wh Metric, feasible Metric; unknown geometry propagates |
| CommunicationAnalysis | earth_windows, known_duration_s Metric, unknown_duration_s, visible_duration_s Metric, longest_blackout_s Metric, blackout_censored, minimum_clearance_deg, link_budget_status (not_modeled initially) |
| ResilienceAnalysis | baseline_scenario_id, alternatives[{scenario_id, delay_s, metric_deltas, constraints[{name, threshold, outcome:pass/fail/unknown}], explanations}], ranking_method nullable; comparisons require compatible scope/model |
| DataProvenance | id, provider_mode, source_url, product_id, version, retrieved_at_utc nullable, sha256 nullable, relative_path nullable, license_or_usage_note, citation, coverage, frame, datum, resolution, processing_steps, model_version, validation_report_id nullable |
| AnalysisError | code, safe_message, field nullable, module, retryable, details (nonsecret); codes include INVALID_REQUEST, MISSING_DATA, OUTSIDE_COVERAGE, FRAME_MISMATCH, UNSUPPORTED_TIME, RESOURCE_LIMIT, CALCULATION_FAILED |

Power configuration includes area_m2, efficiency [0,1], panel_normal_enu (unit vector), load_w, capacity_wh, initial_state_of_charge [0,1], charge/discharge efficiencies (0,1], and a documented solar-flux model. Future time-varying loads are an extension. Generation estimate is incident flux × area × efficiency × max(0, normal dot Sun direction) × modeled illumination factor. Integrate charging/discharging with timestep in hours, cap storage, report curtailed energy and unmet load separately; clipping must not hide an energy deficit. Thermal, dust, degradation and spacecraft losses remain stated omissions until modeled.

### Provider and API behavior

`AnalysisProvider.analyze(request) -> ScenarioResult` is the common Python protocol. Mock outputs are deterministic from normalized input plus a versioned seed/fixture, independent of wall clock; generation timestamp is metadata only. They remain internally consistent but are never calibrated lunar predictions. Scientific mode can return partial results (e.g. geometry available, terrain unavailable). Failures never silently change provider.

Proposed endpoints: `GET /api/v1/health`, `GET /api/v1/capabilities`, `GET /api/v1/sites`, `POST /api/v1/analysis`. Use 422 for invalid inputs, 503 for unavailable required resources, and safe 500 errors; valid partial analyses are 200 with per-metric states. Capabilities reports supported modes and dataset availability. Comparison initially orchestrates bounded analysis requests; no persistence service.

Mock mode requires no NASA data or network, only the installed local application. Its status must appear on every page, chart, comparison and export. An offline scientific failure offers an explicit user-selected mock run, never relabels the original request. Mixed-provider comparisons are blocked by default.

## User interface plan

| Route | Purpose |
| --- | --- |
| / | Mission dashboard: site/date, elevations, visibility, upcoming changes and operational state |
| /sites | Lunar site explorer: predefined/custom coordinates, polar map, terrain coverage |
| /analysis | Sun/Earth curves, horizon and sky diagrams, timelines and one synchronized UTC slider |
| /compare | Site/date comparison with aligned durations, coverage, assumptions and trade-offs |
| /resilience | Landing delay, energy balance and communication interruption comparison |
| /methodology | Sources, methods, assumptions, executed validation and limitations |

Use deep navy, charcoal panels, white text, cyan Earth and gold Sun accents. Add text/pattern status cues, keyboard support, readable contrast, units, responsive layouts and reduced-motion support. Use lunar south-polar stereographic coordinates with explicit lunar radius/projection parameters selected from product labels, never Earth Web Mercator. 3D is a later focused local terrain view with disclosed vertical exaggeration, not an entire-Moon simulation.

## Scientific data integration plan

Official entry points checked on 2026-10-29; no datasets downloaded. Product selection remains future work.

| Source | Expected formats and integration |
| --- | --- |
| [NAIF generic kernels](https://naif.jpl.nasa.gov/pub/naif/generic_kernels/) and [lunar frame files](https://naif.jpl.nasa.gov/pub/naif/generic_kernels/fk/satellites/) | SPK .bsp, binary PCK .bpc, text PCK .tpc, FK .tf, LSK .tls and relative-path metakernel. Select mutually compatible models and coverage in Step 3, retaining original comments. |
| [JPL Horizons manual](https://ssd.jpl.nasa.gov/horizons/manual.html) | Save exact queries and raw text/JSON responses plus parsed reference tables. Match lunar observer coordinates, units, time and correction settings; reference acquisition is an explicit validation operation. |
| [PDS LOLA archive](https://pds-geosciences.wustl.edu/missions/lro/lola.htm) | Gridded elevation products with PDS labels, commonly IMG plus LBL; GeoTIFF where offered. Preserve scale/offset, no-data, projection, datum and product documentation; verify Rasterio driver support on chosen files. |
| [PGDA south-pole products](https://pgda.gsfc.nasa.gov/products/90) | Product-specific terrain, error/effective-resolution and illumination/Earth-visibility reference products. Read release documentation; expected raster/table formats vary. Match observer height and temporal extent before comparison. |
| [Moon Trek](https://trek.nasa.gov/moon/) and [LROC](https://www.lroc.asu.edu/) | Context imagery/maps, PDS imagery and map-projected products where available. Inspect each product's projection and service/export terms. Imagery is not an elevation raster. |

Later acquisition procedure: select a product/version and minimum geographic/time coverage; record exact URL, attribution, usage terms and expected size in a tracked manifest; download explicitly into ignored directories; verify publisher checksum when supplied and record SHA-256; retain labels; verify coverage/datum and perform any documented conversion into processed data. Do not fetch arbitrary latest files during startup. Restore using the manifest and hash, or a permitted backup copy. Never fabricate a checksum before downloading.

Rights are product-specific: retain NAIF acknowledgements, PDS citations and PGDA publication credits; review LROC imagery/service terms and third-party notices before redistribution or offline backup. [NASA media guidance](https://www.nasa.gov/nasa-brand-center/images-and-media/) does not grant blanket rights to every linked product or NASA branding. Record unresolved permissions and omit restricted data from shared backups until resolved. No public source license is assigned in Step 1.

## Testing and validation plan

| Area | Required evidence before acceptance |
| --- | --- |
| Ephemeris | Saved Horizons cases across dates/sites including near-horizon cases; match frame, datum, target, corrections and times. Compare vectors as well as wrapped angles; avoid unstable azimuth near zenith. Publish residuals, sample size and justified tolerances before labeling validated. |
| Time/coordinates | UTC↔ET round trips, leap-second boundaries, longitude wrap, cardinal ENU directions, pole behavior and known frame transforms |
| Terrain | Synthetic flat sphere, ridge, crater and no-data sectors; analytic horizon/observer-height cases, curvature, azimuth seam and increasing search extent convergence |
| Visibility | Known crossing times, equality/borderline, always visible/hidden, unknown gaps, endpoint censoring, disjoint/overlap windows and timestep refinement |
| Power/battery | Zero/normal/grazing incidence, night discharge, full/empty battery, efficiency losses, conservation with curtailed/unmet energy, irregular final timestep and unknown intervals |
| Communication/resilience | Clearance monotonicity, exact blackout intervals, all joint states, zero-delay identity, shifted-date recomputation, equal-duration comparisons and unknown constraints |
| API/providers | Schema parity, deterministic mock outputs, invalid input, resource limits, missing datasets, safe errors, no mock fallback and provenance propagation |
| Frontend | Vitest utilities/components; mocked API errors, persistent mock badges, null handling, UTC labels, synchronized selection and keyboard navigation |
| Migration/end-to-end | Clean Windows restore using locks, no original paths, disconnected mock run after install, scientific hashes and regression run, production build inspection |

Unit tests alone are not scientific validation. Horizons and SPICE may share underlying JPL ephemerides. PGDA reference agreement also depends on terrain, epoch, observer height and disk policy. Set tolerances from a documented error budget and resolution, not from whichever residual happens to pass. No comparisons have been executed in Step 1.

## Risks and unresolved decisions

Step 2 confirms the minimal Windows x64 backend stack and tool pins; heavy scientific dependencies remain untested. Step 3 must choose matched kernels, frame realization, reference surface, Horizons comparison configuration and physical time support. Step 8 must resolve DEM datum/frame registration, actual driver coverage, missing far-field terrain, ray resolution and product permissions. Thin polar visibility windows may be missed by coarse sampling; numerical convergence needs measurement. Disk treatment and observer height can materially alter outcomes. Scientific uncertainty is not equivalent to UI precision. Step 13 must verify event/submission rules, privacy-compatible hosting and migration; no hosting is selected or authorized now.
