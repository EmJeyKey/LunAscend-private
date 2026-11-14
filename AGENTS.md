# LunAscend contributor instructions

LunAscend — Lunar Mission Resilience Navigator is a lunar landing-site decision-support project for a four-person electrical-engineering team. It is an educational engineering prototype, not flight-qualified mission software.

## Scope and workflow

- Read ARCHITECTURE.md, SETUP.md and DEVELOPMENT_ROADMAP.md before changes. Inspect existing work and preserve it.
- Implement only the milestone the user requests. Stop after each milestone, report actual checks and remaining limitations, and await review. Do not advance automatically.
- Step 7 authorizes the optional NASA LOLA terrain reader, exact frame bridge, bounded spherical horizon engine and terrain-only API. Preserve the SPICE/mock engines and Step 5.5/6 frontend. Stop after Step 7; visibility windows, power, communications and 3D remain unauthorized.
- Step 7.5 authorizes coverage-qualified terrain-center visibility and sampled operational intervals in the existing scenario API/Analysis/comparison UI. Preserve original geometry/terrain engines; use exact per-epoch frame reconciliation and DEM elevation plus observer height once. Stop after Step 7.5; no disk illumination, power, link budget or optimization.
- Step 9 adds bounded scientific landing-delay/opportunity evaluation and the existing Resilience/comparison workflow. Preserve hardware, exact native-site identity and unknown constraints; no automatic scoring or optimistic-survival guarantees. See docs/STEP_9.md.
- Step 10 authorizes the bounded georeferenced visualization adapter/API and isolated Three.js context globe/local LOLA viewer. Reuse the existing exact frame bridge and source DEM; retain nodata holes, finite coverage and original heights. Exaggeration/lighting are rendering only. Use returned per-epoch directions, one selected-site/time state, static geometry reuse and non-WebGL fallback. See docs/STEP_10.md. Stop after Step 10; sensitivity/uncertainty studies remain a separate milestone.
- Step 11 authorizes official-resource provenance and saved validation presentation, superseding the previously planned sensitivity scope. The source registry resolves existing manifests and verifies saved evidence; QuickMap/Moon Trek/CSA remain external references, Horizons remains a saved comparison source, and SPICE/LOLA remain numerical sources. Do not imply imagery integration, agency endorsement or new validation. See docs/OFFICIAL_RESOURCES.md. Stop after Step 11; sensitivity and later milestones require separate authorization.
- Step 11.5 adds DEM-grounded Surface View and a native scientific horizon profile. Reuse returned observer geometry and the existing horizon engine; Surface View locks true scale and suppresses obstructed/unknown sky centers. Optical imagery remains uninstalled pending verified registration. Preserve the scientific engines and all prior references; see docs/STEP_11_5_LUNAR_REALISM.md. Stop after Step 11.5.
- Keep changes focused; avoid speculative infrastructure, databases, Docker, unnecessary dependencies and repeated installation.
- Step 12 adds exact-frame Apollo pins, local-coordinate hover/picking, small hash-pinned NASA polar model windows and explicit hard-constraint screening. Reuse the existing frame bridge and bounded resilience search; keep long-term averages separate from mission dates. No Apollo terrain, unverified slope/hazards, invented Artemis polygons, global optimization or flight-safety claims. See docs/STEP_12.md. Stop after Step 12; deployment remains separately authorized.
- Update documentation when contracts, assumptions, dependencies or commands change.

- Step 12.1 extends native Apollo/polar site catalogs, bounded per-region DEM adapters, category markers and exact-epoch selection. Preserve original Site01 and all equations. Apollo DEM registration and pre-1972 UTC remain unsupported; use explicit unavailable states. See docs/STEP_12_1_APOLLO_AND_RIDGE_SCIENTIFIC_DATA.md. Stop after Step 12.1.

## Architecture and coding

- Python owns ephemeris, terrain, visibility, power, communication and resilience calculations. React only presents provider results and manages interaction.
- MockAnalysisProvider and ScientificAnalysisProvider implement the same versioned contract. Never silently substitute mock outputs for failed scientific calculations.
- Mock curves use mock-curves-v1, MOCK_DEMONSTRATION_FRAME, nominal UTC civil sampling and explicit MOCK / NOT LUNAR PREDICTIONS warnings. Keep all mock metrics/provenance labeled mock and observations illustrative, including unavailable polar azimuth. Do not import science libraries or external services into the mock generator. See docs/STEP_4.md.
- Prefer small typed Python functions, explicit inputs, dependency injection at provider boundaries and deterministic tests. Use snake_case in Python and JSON; camelCase in TypeScript internals, PascalCase for components/types.
- Use strict TypeScript and typed Python public interfaces. Validate requests at the API boundary; reject non-finite numbers, invalid ranges and excessive workloads.
- Keep domain modules independent of FastAPI, React and filesystem layout. Put dataset access behind adapters. Use SI units except documented degrees and Wh; encode units in field names.
- Use pytest for backend/domain tests; Vitest for frontend utilities/components. Add API, contract and scientific-reference checks at their relevant milestones.
- Backend uses Python 3.12.16, uv 0.13.6 and a src layout. From backend run `uv sync --frozen`, `uv run --frozen pytest -q` and `uv run --frozen uvicorn lunascend.main:app --host 127.0.0.1 --port 8000`. Use `uv lock --check` to detect manifest drift; frozen restore does not update/check the lock.
- Public Pydantic contracts live in contracts/common.py and contracts/models.py. Reject extra fields and non-finite numbers, require coordinate metadata and timezone-aware timestamps. Provider mode is required per request. Missing products use null; known empty collections use empty arrays.
- Contract models are frozen and use tuples for sequence fields. Construct/revalidate changed models; Pydantic model_copy(update=...) bypasses validation. Keep providers async and independent of FastAPI.
- Step 2.5 adds frontend/ using React, strict TypeScript, Vite, Tailwind, React Router and Lucide icons. From frontend use `npm.cmd ci`, `npm.cmd run dev`, `npm.cmd run typecheck`, `npm.cmd test`, `npm.cmd run build` and `npm.cmd run preview`. Tested runtime target: Node 24.21.0 / npm 11.19.0.
- Frontend selections remain separate from scientific contracts. Request construction requires explicit scientific frame confirmation and sphere-relative elevation; preview locations are not surveyed or validated sites. Artwork is SVG pixel geometry, not a DEM or georeferenced map. Never draw fabricated scientific curves to fill empty states.
- ComparisonStore owns at most three independent scenario snapshots/results and a bounded in-memory request cache. Identical active requests share one transport; edits/removal detach consumers and late responses cannot overwrite newer inputs. Comparison summaries are sampled statistics and explicitly approximate piecewise-linear geometric-horizon fractions, never terrain visibility or engineering feasibility.
- Frontend health/info and POST /api/v1/scenarios/analyze use the /backend proxy. The typed boundary mirrors consumed contract fields, validates response labels/angles/provenance and refuses incompatible payloads. MissionContext shares results/sample index across Dashboard and Analysis; editing inputs clears results and cancels pending requests with a version guard. No automatic provider fallback.
- Preserve the original user-supplied logo in public/brand without cropping/distortion. Marcellus headings, Manrope controls and IBM Plex Mono technical readouts load locally; licenses and pinned font source hashes live in public/fonts. Brand artwork and the symbolic lunar canvas never imply georeferenced terrain. Respect reduced motion and keep all six routes.
- Keep UI pages, components, state, API client, types, styles and preview data separate. Bundle fonts/assets locally; do not require a CDN or credentials. Source maps remain disabled for production.
- Step 2.6 visual conventions: compact mission toolbars, structured scientific plots and smaller numerical readouts. Use monospaced coordinates/timestamps/units, explicit axes and technical missing-data labels. Preserve plot dimensions when data is unavailable; never add decorative scientific curves or promotional empty-state copy. Preview/unavailable states remain distinct from any future validated result.
- Existing duration fields use nominal UTC civil seconds. Step 3 samples in TAI through SPICE, includes both endpoints once, and rejects intervals crossing leap-second insertions because datetime cannot encode :60. No visibility-window duration is calculated.
- Science extra pins SpiceyPy 8.3.0 and NumPy 2.5.4 (CSPICE N0067), tested on Windows x64. Use `uv sync --frozen --extra science`; use that extra on uv run commands too. Kernel CLI: `python -m lunascend.ephemeris.manage download` / `verify`; comparison: `python -m lunascend.ephemeris.validation compare`. See SETUP.md.
- Scientific sites require planetocentric latitude, east-positive longitude, MOON_ME_DE440_ME421, realization DE440/ME421, MOON_SPHERE_1737400_M radius 1737400 m and explicit elevation. Never silently reinterpret other lunar frames. The engine owns and serializes the process-global SPICE pool.
- Keep kernel binaries ignored. Manifest hashes and saved Horizons reference pairs are tracked. Preserve the predeclared validation plan; rerun comparison after engine changes. Only exact compared sites/epochs with matching engine hash, versions and kernel fingerprint receive reference_compared metadata; other outputs remain unvalidated.

- Terrain uses the pinned Site01 5 m GeoTIFF in MOON_ME_DE421 and heights above the 1737400 m sphere. Raster metadata, masks and hashes are mandatory. DE440/ME421 requests require an explicit epoch and the isolated exact-name NAIF frame bridge; never alias the frames or load terrain kernels into the existing process-global ephemeris pool.
- All terrain horizons remain globally partial. Known sampled angles are model lower bounds; boundary/nodata, first missing/furthest known distance, observer height and finite radius must remain visible. No inference of unobstructed directions or visibility windows. Keep terrain libraries optional, reads/workloads bounded and synthetic fixtures explicitly synthetic. See docs/TERRAIN_DATA.md.

## Scientific integrity

- Follow the frame, coordinate, time, height, angular-size and interval conventions in ARCHITECTURE.md. Never mix frame realizations or Earth CRS defaults with lunar data.
- Label synthetic outputs visibly as MOCK / NOT LUNAR PREDICTIONS, including exports. Preserve provenance and validation state at metric level.
- Missing data is unknown, not zero, darkness, obstruction or a successful result. Do not invent terrain, uncertainty, measurements, accuracy, test results or validation evidence.
- Scientific validation requires executed comparisons, saved reference inputs/outputs and documented tolerances. Horizons agreement is a cross-implementation check, not fully independent ephemeris evidence.
- Geometric Earth visibility does not establish a radio link. Battery predictions are conditional engineering estimates. Do not add unexplained suitability scores.

## Privacy and portability

- Local Git is allowed. Ask for explicit authorization before remote repository creation, pushing, collaborator access, deployment or visibility changes. Remote repositories must be PRIVATE; never publish automatically.
- No credentials in code, tracked files, frontend environment variables, logs or examples. Inspect staged content before committing. Ignore rules do not protect files already tracked.
- Keep backend source out of frontend public assets/builds. Disable production frontend source maps explicitly. Minified JavaScript remains inspectable. Preserve original source after builds.
- Use project-relative paths and environment configuration. Never commit machine-specific paths or local environments. Do not rely on an original-PC-only service or installation.
- Python: pyproject.toml + committed uv.lock and exact Python/tool versions when introduced. Restore with uv sync --locked. Frontend: committed package-lock.json, exact Node/npm versions and npm ci. Lock changes require relevant verification.
- Defer scientific dependencies until their milestone. Confirm Windows x64 wheels and imports before accepting versions; do not silently require a compiler or change package manager.
- Keep large datasets outside Git with versioned manifests, checksums, provenance and restoration instructions. Keep small permitted test fixtures in Git.
- Maintain private GitHub and encrypted offline backup instructions. Check competition submission/source-sharing rules before submission; privacy does not override those rules.

## Reporting

Distinguish implemented, executed, planned and blocked work. Report tests only when actually run. Never claim repository privacy without verifying the remote. Stop at the milestone boundary.
