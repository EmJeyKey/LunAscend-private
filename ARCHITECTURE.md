# LunAscend architecture — Step 13 unified mission workflow

Step 13 keeps one shared React mission and expandable technical view. Analysis
owns the comprehensive record and deterministic Python requirement assessment.
The coverage adapter verifies actual installed DEM pixels; it never substitutes
Site01 outside support. A two-entry, source-verified environment cache composes
hardware changes with existing equations. Production mock selection is disabled;
old generators remain test-only. See docs/STEP_13_UNIFIED_WORKFLOW_AND_NASA_COVERAGE.md.

Step 12.1 extends manifest-backed site/dataset selection, not scientific equations.
The unified registry references six native Apollo points, thirteen source-pixel
polar study markers, the distinct original Site01 observer and dated Artemis
references. Each new polar point selects its own hash-pinned 325 m DEM window.
Existing exact frame conversion, finite horizons and engineering services are reused.
Catalog date edits reconcile the same native point before requests; version/abort
guards preserve stale-result protection in MissionContext and ComparisonStore.
Apollo terrain remains unavailable pending exact registration; see
docs/STEP_12_1_APOLLO_AND_RIDGE_SCIENTIFIC_DATA.md.

Step 12 adds isolated display/data adapters for exact-frame Apollo positions and
small hash-pinned NASA long-term polar windows. The environment/screening APIs do
not feed averages into ephemeris, terrain visibility, power or DTE calculations.
Python evaluates explicit screening constraints; React displays classifications,
evidence and source metadata. Optional resilience Sun-clearance/slope requirements
preserve unknown evidence and existing engineering equations. See docs/STEP_12.md.

The numerical-display follow-up maps retained result fields to shared visible readouts
and preserves structured API failures. Full Analysis is an explicit frontend option
bundle for the existing analyze endpoint; no scientific/API contract is changed.
Comparison transfer validates the complete current result against its request before
reuse. See docs/NUMERICAL_DATA_DISPLAY.md for the field audit and executed API/DOM checks.

## Step 11.7 shared human-friendly presentation

One session-level React presentation context switches Simple/Advanced detail without
changing mission inputs, scientific results or selected UTC. Central mappings consume
returned terrain/DTE classifications and exact timestamps; plots consume backend W/Wh
values, preserving nulls and uncertainty. Source disclosures read the existing local
registry/imagery catalog. Original scientific/engineering components remain expandable.
No backend calculation, contract, imagery adapter or dependency changed. See
docs/STEP_11_7_USER_EXPERIENCE.md for behavior, checks and unverified responsive limits.

## Step 11.6 source-backed cartographic imagery

An isolated standard-library imagery adapter serves three verified NASA Moon Trek
WMTS products through a bounded allowlisted tile/cache API. Frozen coordinate-anchor
contracts reuse the existing exact isolated DE440/DE421 bridge; no scientific engine
or result contract is changed. The 2D map uses the source lunar geographic / spherical
polar grid; progressive Three.js tile patches provide an optical context shell. The
source metadata does not establish an exact dynamical realization or local image-to-DEM
tie. Scientific markers retain their frame, photo placement is qualified, cartographic
picks require separate scientific confirmation, and local terrain draping is withheld.
Source masks, delivered resolution, finite coverage and acquisition shadows remain
explicit. Images never enter ephemeris, horizon, visibility or engineering calculations.
Cached/bundled photographs and the original DEM viewer support service failure; science
remains local. See docs/STEP_11_6_ORIGINAL_NASA_MAPS.md for limits and executed evidence.
The following Step 11 description records that earlier milestone's reference-only state.

Status: Step 6 adds independent scientific scenario comparison to the existing Step 5 integration and Step 5.5 design. The validated Step 3 engine and Step 4 mock generator are preserved. Challenge title and November 14–15 competition dates come from the team brief; official event details and submission rules still require team verification.

## Step 11 official resources and provenance presentation

The user's Step 11 scope is official-resource integration and source transparency, superseding the earlier planned sensitivity milestone. A central source registry references the existing kernel/DEM manifests. A standard-library build adapter resolves these and verifies saved Step 3 source, response and residual identities before creating a small offline frontend catalog. It does not calculate science or alter result-level DataProvenance records. Scientific Methodology presents actual roles, attribution, product metadata, all saved residuals and finite validation scope. Explorer links to external image portals without importing tiles or asserting their registration. No runtime external service, new API, dependency or change to numerical engines/contracts is introduced. See docs/OFFICIAL_RESOURCES.md. Stop after Step 11; sensitivity studies remain deferred.

## Step 10 georeferenced visualization

The existing optional terrain adapter now serves bounded mesh and original-DEM inspection products through `/api/v1/terrain/mesh` and `/api/v1/terrain/inspect`. The manifest, reader and exact isolated DE440/DE421 bridge are reused. Retained original pixel centers become spherical body-fixed positions and a proper local east/up/minus-north rendering rotation; any missing original pixel invalidates the spanned decimated cell. Source height/datum, masks, finite bounds, resolution and bridge metadata remain explicit. These products do not replace scientific horizons or alter existing equations/contracts.

React's isolated lazy Three.js renderer presents a context sphere, finite NASA terrain and linked native polar window. MissionContext remains authoritative for site/results/sample index; exact returned per-epoch native directions and observer reconciliation drive overlays. Camera/time changes reuse static terrain. Exaggeration is a copied render transform only. Bounded two-entry mesh caching, on-demand frames, resource disposal and a useful 2D fallback preserve existing workflows. See docs/STEP_10.md for transforms, limits, real evidence and executed checks. No Step 11 work is included.

## Step 9 mission resilience and bounded opportunity evaluation

The versioned resilience/search endpoint composes existing scientific visibility and engineering functions. Explicit baseline hardware and duration are preserved across actual recalculated landing epochs. The isolated exact frame bridge keeps physical observers fixed in DEM-native DE421; a typed optional terrain-loader boundary permits same-observer profile reuse without changing visibility equations. Searches are sequential, limited to 12 candidates plus baseline, 3 sites, 30-day landing span/offset, 7-day missions and 169 samples. Per-search result/profile caches avoid stale resources across searches; cancellation drains in-flight work and stops between candidates.

Python evaluates explicit requirements with pass/fail/indeterminate evidence and numeric deltas. Unknown data cannot pass; optimistic assumptions receive conditional labels; there is no score or mission-safety claim. React validates returned products and presents existing controls, elapsed battery charts, actual UTC and provenance. Optional shared-control draft reporting prevents stale site/date/duration selection. Validated alternatives enter the existing three-scenario ComparisonStore without overwriting others. See docs/STEP_9.md for constraints, actual demonstrations, executed checks and limitations.

## Step 7.5 optional terrain-center visibility

Explicit scientific terrain scenarios use visibility/engine.py and isolated visibility/_worker.py. Input coordinates are DE440/ME421 at the start epoch; the observer is fixed in DEM-native DE421 thereafter. DEM height replaces null input surface height, then radial observer height is added once. Exact pxform rotations reconcile observer and directions at every timestamp while reusing the original ephemeris functions and one native terrain profile. Existing geometric-only execution remains unchanged. Circular-linear masked horizons yield center clearance and four qualified states; approximate sampled windows/linear crossing brackets never imply global visibility. Optional ScenarioResult.terrain_visibility and extended VisibilityWindow classifications preserve existing products. Analysis/comparison expose results and coverage without disk, power or link-budget claims. See docs/STEP_7_5.md for actual evidence, API example and limits.

## Step 7 optional lunar terrain pipeline

Step 7 adds a standalone terrain-only API and preserves the existing geometry/mock provider behavior, frontend and Step 3 evidence. The optional terrain extra pins Rasterio/PyProj while retaining existing NumPy/SpiceyPy versions. data/manifests/lola-site01.json identifies the authentic NASA 5 m/pixel Site01 Connecting ridge DEM and metadata; large source data remains ignored. Native DEM coordinates are MOON_ME_DE421, planetocentric/east-positive, polar stereographic on a 1737400 m sphere; raw scaled values are sphere-relative meter heights. Raster CRS parameters, scale/offset, registration, nodata and hash are verified before bounded local reads and conservative four-neighbor bilinear sampling.

TerrainRequest requires an explicit supported reference frame. A DE440/ME421 observer additionally requires a UTC coordinate epoch. A one-shot isolated process computes the exact NAIF pxform rotation using separately pinned DE421 kernels plus the original kernel set; the original process-global SPICE pool, ephemeris source and kernel manifest are untouched. PyProj performs the lunar map projection only. Rays originate in the requested frame's local radial ENU and sample great circles, rotated into the DEM frame when needed. Exact spherical range/height geometry accounts for curvature and observer height without flat-Earth approximations.

POST /api/v1/terrain/horizon returns the existing HorizonProfile with backward-compatible optional distance/coverage fields, DEM surface elevation, transform/epoch/kernel identity, provenance and limitations. Every profile remains globally partial; requested sample coverage never certifies terrain outside the radius or between samples. First missing distance, furthest known sampled distance, valid fraction and boundary/nodata flags preserve gaps. A bounded local grid helper exports at most 4096 original cells with origin, spacing, WKT, vertical datum and null mask for future viewers. No terrain visualization or engineering calculation is added. Existing ScenarioResult.horizon stays null and its frontend parser is unchanged.

Requests are bounded to 500000 samples, 720 azimuths and local windows of 4500000 pixels. Optional dependency/data/kernel failures are explicit structured errors; synthetic fixtures cannot substitute for a missing registered NASA dataset. Saved real-data metadata, frame cases, finite profiles, sampling sensitivity and memory/timing evidence live in docs/validation/step-7-results.json, separately from unchanged Step 3 validation. See docs/TERRAIN_DATA.md and docs/STEP_7.md for reproduction and limitations. No independently matched external terrain-horizon accuracy comparison is claimed.

## Step 6 multi-site and multi-date geometric comparison

Step 6 supersedes the historical snapshot-only comparison descriptions below. ComparisonStore, owned by the existing MissionProvider, holds up to three site/date/options snapshots with independent analysis state and a baseline ID. Explorer saves use this same store, including provider, height and frame confirmation. Settings persist across route navigation in memory; reload clears them. The Dashboard preview follows the selected comparison baseline. There is no database or new browser persistence.

Each scenario uses the unchanged buildRequest/requestAnalysis boundary and existing POST endpoint. Canonical validated requests deduplicate active transports and reuse completed results while their keys remain among current scenarios (at most three cache entries). Display renaming and baseline selection do not recalculate. Input changes invalidate only the affected result; obsolete consumers detach and orphaned requests abort. Job identity/version checks ignore late responses even if cancellation is ignored. A failed row leaves successful rows intact and can be retried. Detailed analysis copies a completed scenario into the existing single-analysis context without another request.

lib/comparison.ts derives start and sampled extrema plus approximate above-0-degree fractions from returned angles. Adjacent known samples define linear segments, split analytically at the geometric horizon; missing intervals contribute neither numerator nor denominator. Coverage is displayed separately. These UTC-civil-time estimates are not exact durations, terrain-aware visibility, radio-link availability or power calculations. The SPICE engine still rejects leap-second crossings. Deltas are alternative minus baseline; mixed provider/model/frame/reference results have no numerical deltas. Fraction deltas additionally require full coverage, equal duration and equal sample step. All estimates inherit source limitations.

Aligned native SVG charts prioritize elapsed time since each scenario's own UTC epoch. They share the same elapsed axis and cursor; readouts select nearest returned samples and display both target and actual UTC. Null values break paths; shorter intervals are not extrapolated. Absolute-UTC overlays are deferred and disclosed. Each scenario retains full existing provenance, assumptions and warnings. No backend, contracts, kernels, saved scientific evidence, dependencies or lockfiles change. See docs/STEP_6.md for verification.

## Step 5 live frontend and lunar atlas identity

Step 5 supersedes historical preview-only descriptions below. The existing React shell/routes remain; native SVG charts now consume real API observations. types/analysis.ts mirrors consumed request/result fields; lib/analysis.ts validates UI selections and constructs the existing ScenarioRequest, including explicit provider mode and fixed scientific metadata only after user confirmation of frame and explicit elevation. api/analysis.ts checks returned identity, finite angular bounds, chronological UTC samples, metric/provider labels and resolved provenance before accepting a result. Failed/unavailable responses remain structured errors and never invoke another provider.

MissionContext owns a cancellable/versioned request runner, options, current result and returned-sample index shared across pages. Editing controls invalidates old data immediately. The date control is read as a UTC wall-clock value through FormData, retaining seconds/milliseconds; browser-local time conversion is not used. The slider selects actual returned samples without requests or interpolation. SVG curves break at null values, show separate Sun/Earth styles and a 0-degree ideal geometric horizon; responsive axis labels, pointer inspection and position cards share data. Source identity and validation scope are displayed separately. Unimplemented terrain/engineering products remain null/unavailable. No backend algorithms, contracts or saved scientific evidence changed.

Step 5.5 retains the complete, unchanged original logo as a small, feathered navigation image; the repeated Dashboard logo was removed following visual review. Local Marcellus display typography, Manrope interface text and IBM Plex Mono numerical text establish the shared hierarchy. public/fonts contains SIL OFL notices and SHA-256/source records for the added fonts. The Explorer uses filtered synthetic input locations, an illustrative canvas and coordinate details; no coordinate-to-image mapping is implied. Comparison and resilience layouts remain previews for future engineering work. See docs/STEP_5.md and docs/DESIGN_REFINEMENT.md for executed checks, scope and remaining limitations.

## Step 5.5 visual workbench

The Dashboard prioritizes a large lunar viewport with adjacent controls and returned Sun/Earth readouts on wide screens; smaller layouts stack these sections above the UTC chart. Explorer groups filtering and custom coordinates beside the viewport and selected-site context. Its comparison action reuses existing in-memory configuration snapshots only. Globe/surface presentation and grid/contour toggles affect original SVG artwork, not scientific geometry. The globe has no mapped hemisphere, coordinate registration or calculated lighting. Scientific positions remain in angular readouts and the synchronized chart. Compact Dashboard settings open on invalid fields; the existing UTC FormData handling and provider boundary remain intact. All six routes, explicit unavailable states and scientific documentation are retained. See docs/STEP_5_5.md for the executed verification and remaining scope.

## Step 4 deterministic mock provider

`providers/mock.py` implements the existing async AnalysisProvider interface using only the standard library and existing contracts. Explicit provider selection dispatches to mock or scientific without fallback. Info reports both implementations, mock availability true, and scientific availability according to its verified resources. Routes, request/result contracts, SPICE source, kernels and saved Step 3 evidence are preserved.

The versioned generator uses arbitrary smooth sine/azimuth curves seeded by absolute UTC civil time and site latitude/longitude. It has no lunar physics, coordinate transformation, external service or random state. Repeated identical requests produce identical entire results, including a content-derived scenario ID. Samples include start/end once, with a short final interval; fractional interior offsets truncate to microseconds. Unlike SPICE sampling, this deliberately illustrative schedule uses nominal UTC civil seconds and does not count leap insertions. No physical elapsed-time claim is made.

Observations use `status=illustrative`, metrics/provenance use `mock`, and the output frame is `MOCK_DEMONSTRATION_FRAME`, regardless of input frame labels. Every result warns MOCK / NOT LUNAR PREDICTIONS. Exact poles have null azimuth with a reason and partial scenario status; available elevations remain illustrative. Heights and clearance settings are not modeled. Terrain/engineering enable flags return structured INVALID_REQUEST rather than fabricated outputs. Horizon, visibility windows, power, communication and resilience remain null. See [Step 4 design and API example](docs/STEP_4.md). The historical Step 3 statement that mock is unavailable is superseded by this section. No frontend files change.

## Step 3 scientific geometry

`ephemeris/kernels.py` verifies the pinned manifest and every file hash, loads the kernel set once per analysis, checks actual SPK/PCK coverage and serializes access to SPICE's process-global pool. This module owns that pool; other code must not load or clear it independently. `manage.py` provides explicit download/verify commands. Requests never download data. Missing optional libraries or missing/corrupt kernels produce structured unavailable responses, without fallback.

`ephemeris/engine.py` calculates Sun and Earth center directions with NAIF azlcpo ELLIPSOID and correction NONE. Positions use planetocentric latitude, east-positive longitude, a 1737400 m sphere and explicit surface elevation plus observer height. SI input heights are converted to km for SPICE georec. The exact frame is MOON_ME_DE440_ME421 (31009), a fixed ME421 alignment of the DE440 principal-axis orientation MOON_PA_DE440 (31008). The matched FK/binary PCK supply that transformation; IAU_MOON is never selected. On the sphere, geodetic and planetocentric latitudes coincide. The horizon is the plane perpendicular to the radial normal, without terrain or atmospheric refraction. Azimuth is clockwise from local north in [0,360); elevation is positive upward in [-90,90]. Exact poles use spkcpo and normal projection for elevation, with null azimuth; numerical zenith/nadir also have null azimuth. These yield partial observations, not fabricated angles.

Aware timestamps normalize to UTC. SPICE str2et converts UTC to ET/TDB; unitim supplies uniform TAI sampling. Both interval endpoints appear once, with a shorter final interval when needed; output timestamps have microsecond precision. Existing request limits remain 366 days, 10001 samples and a 0.001 s minimum step. UTC before 1972 and intervals crossing leap-second insertions are explicitly rejected. The effective upper bound is the measured kernel intersection, currently 2150-01-21T23:58:50.815541Z. Future UTC conversion assumes no new leap seconds beyond LSK 0012; this is an assumption, not a prediction.

`ScientificAnalysisProvider` runs the engine in a worker thread and returns the existing ScenarioResult/EphemerisObservation/Metric contracts. `/api/v1/info` reports implementation separately from current verified resource availability. Analysis returns 200 with observations, 503 for unavailable resources, 422 for unsupported frame/time/workload inputs and 500 for safe calculation failures. Terrain, windows, power, communication and resilience remain null; enabling unsupported analysis settings is rejected. The mock provider remains unavailable.

Provenance includes every kernel version, official URL and SHA-256, the kernel-set fingerprint, method, frame and software versions. Public calculations use NONE only. Validation additionally uses CN+S as an internal diagnostic against Horizons apparent AIRLESS AZ/EL. No apparent-mode extension was added to the public contract. Only exact saved comparison cases matching engine hash, kernel fingerprint and SpiceyPy version are reference_compared; other sites/epochs remain unvalidated. The report ID identifies a local evidence artifact, not a global accuracy certification.

See [predeclared criteria](docs/validation/STEP_3_PLAN.md), [executed results and limitations](docs/validation/STEP_3_RESULTS.md), [numerical report](docs/validation/step-3-results.json) and [kernel manifest](data/manifests/spice-kernels.json). Saved Horizons geometric vectors share the NAIF frame rotation during projection; the complementary direct apparent comparison checks the observer orientation independently. Both systems share JPL ephemeris heritage. These finite comparisons do not establish independent physical truth or terrain/mission suitability.

Frontend integration is deferred: its synthetic site state has unresolved frame metadata, and it does not yet consume ScenarioResult. Connecting it properly requires a dedicated contract/state integration. No frontend code or charts changed in Step 3. Historical sections below describe their named milestones; the Step 3 behavior above supersedes earlier unavailable-science statements.

## Step 2.5 frontend preview

`frontend/` is a private npm package with React, TypeScript, Vite, Tailwind CSS, React Router, Lucide icons and a bundled Manrope font. It has six routes: dashboard, site explorer, Sun/Earth analysis, scenario comparison, mission resilience and methodology. Reusable shell, cards, map illustration, chart empty states and controls live in components/; pages/ compose them. React context keeps site, UTC start, duration and up to two alternative snapshots in temporary browser memory. State resets on reload; no database or browser storage is used.

`src/data/preview.ts` contains synthetic input locations. `src/data/illustration.ts` contains only original SVG artwork geometry in pixels. The image is not georeferenced and uses no NASA terrain. Layer toggles change artwork visibility only. `lib/time.ts` performs UI date formatting/shifting, not ephemeris or scientific duration calculations. The analysis time cursor and landing-delay control change displayed timestamps only. All scientific metrics, curves, windows and engineering estimates remain unavailable. Recharts is unnecessary for empty chart scaffolding and is not installed.

`src/types/api.ts` mirrors only the existing consumed Health and ApplicationInfo responses. Runtime response checks reject incompatible payloads. `src/api/client.ts` uses a five-second bounded check of GET /health and GET /api/v1/info; it never submits a scientific analysis. The hook cancels stale checks and offers explicit retry. Connection status does not establish scientific readiness. Both Vite dev and local build preview proxy /backend to the configurable local FastAPI service, so no backend CORS/code changes are required. VITE_API_BASE_URL is public; LUNASCEND_BACKEND_URL configures the Vite proxy. A future deployment will need an explicit equivalent proxy or narrowly scoped CORS configuration; no deployment exists here.

The UI labels its preview state on every route and labels synthetic locations/artwork. No frontend mock scientific provider is implemented. All fonts, icons and illustrations are local; after installation, disconnected operation needs no external service. Production source maps are explicitly disabled. The preview advances only the visual foundation originally planned for Step 5; scientific milestones retain their numbers and review gates.

## Step 2.6 UI refinement

The existing frontend is retained with a 220–230 px desktop sidebar, compact mission controls and technical readout typography. Sun/Earth analysis keeps the original axes and time structure, with explicit degree/UTC labels and a small unavailable-data overlay instead of a decorative empty state. Legend swatches use solid/dashed/dotted styles as well as color. Visibility rows state Solar visibility and Direct-to-Earth line of sight; unknown intervals are not plotted as measured availability.

Coordinates, dates, units and numerical fields use available local monospace fonts. Other-page changes are limited to terminology and shared presentation. The preview badge and unavailable-data badges remain explicit; no validated-data badge is activated without scientific results. No dependencies, routes, providers or backend contracts changed. Navigation now retains keyboard focus without scrolling the top status bar out of view.

Verification on 2026-10-30: the Step 2.5 baseline passed TypeScript, 17 frontend tests, production build and 67 backend tests before recovery commit 5bb9d81. The refinement was checked in the browser at desktop and 390 px mobile widths, including six-route navigation, UTC/site/period controls, cursor, scenario snapshots, coordinates, map-layer toggle, delay/reset and disconnected-backend retry. These are UI/software checks, not scientific validation.

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

## Sun/Earth availability integration repair

The existing analyze API adds optional typed `availability` metadata describing returned products and omissions; it does not alter numerical engines. Both explicit terrain-enabled UI actions preflight actual installed coverage; geometry-only remains explicit, and only Full Analysis enables all engineering options. Geometric center elevations and terrain classifications remain separate. See docs/SUN_EARTH_DATA_AUDIT.md for executed five-location evidence and limitations.

## Final pre-recording presentation

The same mission results now feed four beginner cards and expandable professional
sections. Complete analysis preflights installed coverage and requests supported
engineering products. Per-product engineering failures preserve independent
returned results with explicit module errors; the frontend requires that partial
error evidence before accepting an absent requested product. No equations changed.
See docs/FINAL_DEMO_READINESS.md for executed browser evidence and recording limits.
