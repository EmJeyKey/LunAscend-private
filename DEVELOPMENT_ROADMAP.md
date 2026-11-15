# LunAscend milestone roadmap

Every step requires user review before the next. Step 1 creates a specification, not an application. Future steps below are not authorized by completion of Step 1.

| Step | Scope | Acceptance evidence / review gate |
| --- | --- | --- |
| 1 — Scientific Architecture and Portable Foundation | Architecture, contracts specification, conventions, privacy, migration, backups, ignore rules and local Git | Review five root files and local repository state; no application/dependencies/data or publication |
| 2 — Project Setup, Scientific Data Contracts, and Backend Foundation — IMPLEMENTED AND VERIFIED | Python 3.12.16 / uv 0.13.6; pyproject/uv lock; Pydantic schemas, async provider protocol, health/info/analyze API and safe errors | Frozen install, 67 passing tests, actual Uvicorn startup and HTTP checks; unavailable analysis explicit for both modes; other-PC restore not yet tested |
| 2.5 — React Frontend and First Visual Preview — IMPLEMENTED AND VERIFIED | Six routes, shared mission controls, illustrative terrain, unavailable readouts, scenario snapshots and backend status | Node/npm dependencies installed; TypeScript, 17 frontend tests and production build pass; 67 backend tests preserved; local recovery snapshot before Step 2.6 |
| 2.6 — Scientific UI Refinement and Frontend Verification — IMPLEMENTED AND VERIFIED | Compact workbench presentation, monospaced readouts, explicit units, technical chart/status labels; existing controls and backend preserved | TypeScript, 17 frontend tests and production build; browser navigation/controls/disconnected-state checks, desktop/mobile inspection; no new scientific calculations |
| 3 — First Validated Sun/Earth Geometry Prototype — IMPLEMENTED AND VERIFIED | Matched DE440/ME421 kernels, UTC/ET/TAI, geometric azimuth/elevation series and scientific API provider | 101 backend tests; 36 executed Horizons comparison rows across three sites; fixed criteria, raw references and results saved; frontend checks retained; no global accuracy or terrain-validity claim |
| 4 — Deterministic Mock Scientific Data Provider — IMPLEMENTED AND VERIFIED | Versioned arbitrary display curves, polar missing azimuth and explicit mock/scientific isolation | 115 backend tests pass; 81 pass without science (science module skipped); deterministic results, endpoint sampling, mock provenance and retained scientific reference tests |
| 5 — Scientific Frontend Integration and Authorized Brand Refinement — IMPLEMENTED | Existing Dashboard/Analysis now share actual scientific/mock observations, sample selection, provenance and errors; original logo/local typography and atlas layout retained | TypeScript/build, 37 frontend tests, 115 backend tests, scientific/mock/error browser checks, desktop/mobile and six routes; no terrain/engineering claims |
| 5.5 — Premium Branding and Scientific Lunar Explorer — IMPLEMENTED | Large explicitly schematic lunar viewport, responsive Dashboard/Explorer workspaces, local font hierarchy and retained scientific controls | See docs/STEP_5_5.md for frontend checks, actual browser verification and local recovery point |
| 6 - Multi-Site and Multi-Date Scientific Scenario Comparison - IMPLEMENTED | Up to three independent scenarios, baseline differences, elapsed-time charts, request deduplication, provenance and geometric-only summaries | TypeScript/build, frontend/backend regression tests and desktop/mobile scientific/mock browser checks; see docs/STEP_6.md |
| 7 - NASA LOLA Terrain Integration and Local Horizon Analysis - IMPLEMENTED | Pinned Site01 DEM, verified lunar metadata/projection, epoch-specific DE421/DE440 bridge, finite spherical terrain horizons and bounded API | 148 backend tests including 33 terrain tests; 64 frontend tests/build; saved ingestion/convergence/frame/API evidence; no external horizon-accuracy claim |
| 7.5 - Terrain-aware Sun/Earth center visibility - IMPLEMENTED | Exact per-epoch observer reconciliation, circular masked terrain clearance, conditional sampled intervals, Analysis/comparison integration | 168 backend / 76 frontend tests, real NASA report and live API checks; independently unvalidated, browser QA blocked; see docs/STEP_7_5.md |
| 8 - Solar Power, Battery and Conditional DTE Engineering - IMPLEMENTED | Explicit PV/hardware assumptions, conservative/optimistic energy accounting, reserve/unmet-load tracking, margin-qualified DTE and Analysis/comparison outputs | 195 backend / 91 frontend tests, TypeScript/build, real SPICE/LOLA and saved replay evidence, live API/browser verification; see docs/STEP_8.md |
| 9 — Mission Resilience and Landing-Delay Analysis — IMPLEMENTED | Exact fixed-site date recomputation, bounded site/date grid, explicit engineering requirements, unknown-aware alternatives and comparison transfer | 222 backend / 104 frontend tests, TypeScript/build, real SPICE/LOLA six-candidate evidence and desktop/mobile browser verification; see docs/STEP_9.md |
| 10 — Georeferenced 3D Lunar Globe and Local Terrain — IMPLEMENTED | Lazy Three.js context globe, real bounded Site01 mesh, native polar map, original DEM inspection and returned Sun/Earth time coordination | 239 backend / 117 frontend tests, TypeScript/build, real NASA surface agreement, live WebGL/time/fallback/missing-data and responsive checks; see docs/STEP_10.md for measured performance and verification limits |
| 11 — Official Resources and Scientific Provenance — IMPLEMENTED | Explicit roles for QuickMap, Moon Trek, Horizons and CSA; retained SPICE/LOLA manifests, saved comparison evidence and offline catalog | 34 existing SPICE / 6 registry checks, 121 frontend tests, TypeScript/build and desktop/narrow browser checks; see docs/OFFICIAL_RESOURCES.md |
| 11.5 — Ground-level Surface View and Scientific Horizon — IMPLEMENTED | Original-DEM observer, true-scale surface camera, native horizon profile, returned body cues and retained georeferenced views; optical imagery remains uninstalled | 245 backend / 129 frontend tests, TypeScript/build, fresh zero-residual Site01 horizon reproduction and actual surface/time/fallback/browser checks; see docs/STEP_11_5_LUNAR_REALISM.md |
| 11.6 — Authentic NASA Photographic Maps — IMPLEMENTED WITH REGISTRATION LIMIT | Genuine WAC/NAC multi-resolution 2D maps and context globe, bounded cache and qualified shared coordinate anchor; original local LOLA terrain and Surface View retained | 266 full backend regression passes plus final targeted imagery/source checks, 145 frontend tests, TypeScript/build, real tile/API/browser evidence. Local photographic DEM draping remains incomplete pending verified registration; see docs/STEP_11_6_ORIGINAL_NASA_MAPS.md |
| 11.7 — Human-Friendly UX and Data Transparency — IMPLEMENTED; RESPONSIVE QA INCOMPLETE | Shared Simple/Advanced presentation, returned-sample conditions, backend W/Wh plots, clear comparisons/delays, source explanations and glossary | 165 frontend passes before final wording correction; final focused UX/TypeScript/build checks, fresh exact Site01 regression and six-route desktop browser review. Narrow-screen override ineffective; see docs/STEP_11_7_USER_EXPERIENCE.md |
| 12 — Apollo Exploration, NASA Screening and Bounded Opportunity Finder — IMPLEMENTED WITH COVERAGE LIMITS | Exact-frame Apollo pins, live surface coordinates, native NASA polar windows and explicit constraint screening; existing bounded mission search | 281 backend / 182 frontend tests, TypeScript/build, current Site01/Apollo API checks and real browser/narrow-screen interaction; see docs/STEP_12.md. No global coverage, slope/hazard certification or new deployment authorization |

## Step 12.1 � implemented with explicit data limits

Six Apollo and thirteen verified polar study markers share selection and numerical analysis. Small per-region native DEM windows and source-pixel quality samples are pinned. Date edits reconcile fixed native catalog points; original Site01 and prior engines remain intact. Apollo terrain ingestion and pre-1972 historical calculations remain unsupported. See docs/STEP_12_1_APOLLO_AND_RIDGE_SCIENTIFIC_DATA.md for per-site status, executed checks and recovery point. No later milestone is authorized.

## Step 13 - Unified mission workflow

One mission context and view, real site entry, linked Explorer/Analysis/comparison/delay
workflow, actual-pixel terrain selection, complete numerical report and deterministic
requirement assessment. Existing equations and datasets preserved. Researched global
terrain/thermal/geology products are not represented as installed. See
`docs/STEP_13_UNIFIED_WORKFLOW_AND_NASA_COVERAGE.md` for executed evidence,
limitations and final local recovery point. Stop after Step 13.

## Delivery priorities

Preserve essential site/date selection, validated geometry, terrain visibility and rapid comparisons before advanced engineering or 3D polish. The numbered sequence is the requested plan; schedule pressure may justify a team-approved scope revision, never silent skipping of validation. Do not treat future link budgets or multi-objective ranking as required first implementations. Keep hosting undecided until needs, cost and privacy are known.

## Current handoff

Step 12 supersedes the previously proposed Step 12 migration scope. Its three
phases add exploration and screening while retaining original scientific engines.
Apollo, NASA-layer and final opportunity checkpoints are local only. Stop after
this milestone; migration/deployment and any later work require authorization.

The authorized numerical-display follow-up exposes available backend values in both
presentation modes, adds explicit Full Analysis and preserves calculated comparison
snapshots. Two real Site01 dates and per-field/plot mappings were verified; see
docs/NUMERICAL_DATA_DISPLAY.md. This is a Step 11.7 integration correction, not a
new scientific milestone. Stop after this fix; no automatic later work or publication.

Step 11.7 simplifies all six routes around the same scientific results, retaining the
original technical displays, imagery and local terrain. Its source explanations read
the existing registry; no calculation or source identity changed. Desktop workflows
and fresh Site01 products were checked; narrow-screen visual acceptance remains
incomplete because the browser override did not apply. Step 11.6 was separately
checkpointed at ccbcfba; local photographic DEM draping remains withheld pending a
verified tie. See docs/STEP_11_7_USER_EXPERIENCE.md. Stop after Step 11.7; no later
milestone, push or deployment is authorized automatically.
