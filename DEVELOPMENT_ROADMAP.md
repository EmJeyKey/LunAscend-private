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
| 5 — React Dashboard Foundation | React/TS/Vite, Tailwind, Router, locked npm dependencies, typed API client and dashboard; navigation placeholders only where honest | Type/build/component checks, loading/error/unknown states, mock label, responsive keyboard-accessible UI |
| 6 — Scientific Charts and Synchronized Time Controls | Recharts elevation/horizon charts, visibility timelines, shared UTC time selection | Synchronization and units tests; wrap/unknown segments and endpoint behavior |
| 7 — Multi-Site and Multi-Date Comparison | Bounded scenario selection, aligned metrics, coverage and transparent trade-offs | Equal-duration comparisons, baseline identity, incompatible model/provider handling |
| 8 — LOLA Terrain Integration and Horizon Analysis | Verified minimal DEM coverage, Rasterio/PyProj, lunar polar projection, curvature-aware horizon rays | Synthetic terrain tests, real product datum/driver checks, coverage and horizon-resolution convergence |
| 9 — Power, Battery, and Communication Engineering Models | Panel incidence, explicit load/storage efficiencies, energy deficits and Earth clearance windows | Energy conservation/bounds and known blackout tests; estimates and link limitations disclosed |
| 10 — Mission Delay and Resilience Analysis | Recompute shifted dates, compare sites and constraints, alternatives | Zero-delay identity, explicit constraints, unknown handling and no unexplained scoring |
| 11 — Focused Interactive 3D Terrain Viewer | Three.js/React Three Fiber only now; local terrain, Sun/Earth vectors and time coordination | Peer compatibility, coordinate alignment, modest-device performance, accessibility fallback |
| 12 — Reliability and Sensitivity Analysis | Location/date/margin/terrain sensitivity using supported uncertainty metadata | Reproducible perturbations, source-backed error interpretation and borderline reporting |
| 13 — End-to-End Validation, Deployment, and Competition-PC Migration | Consolidated validation, production build, encrypted restore drill, fresh Windows rehearsal; hosting recommendation | Recorded clean-PC and disconnected mock tests, science regressions, provenance/rights review and actual submission-rule check; deployment only with separate explicit authorization |

## Delivery priorities

Preserve essential site/date selection, validated geometry, terrain visibility and rapid comparisons before advanced engineering or 3D polish. The numbered sequence is the requested plan; schedule pressure may justify a team-approved scope revision, never silent skipping of validation. Do not treat future link budgets or multi-objective ranking as required first implementations. Keep hosting undecided until needs, cost and privacy are known.

## Current handoff

Step 4 supplies the deterministic, explicitly labeled mock provider alongside the preserved scientific provider. Steps 2.5 and 2.6 retain the frontend preview ahead of the originally planned Step 5. Stop after Step 4 for review. The next requested milestone will connect scientific and mock observations to the existing charts, refining the original Step 5/6 scope; no integration is authorized by this handoff. Terrain, windows and engineering calculations remain deferred.
