# LunAscend milestone roadmap

Every step requires user review before the next. Step 1 creates a specification, not an application. Future steps below are not authorized by completion of Step 1.

| Step | Scope | Acceptance evidence / review gate |
| --- | --- | --- |
| 1 — Scientific Architecture and Portable Foundation | Architecture, contracts specification, conventions, privacy, migration, backups, ignore rules and local Git | Review five root files and local repository state; no application/dependencies/data or publication |
| 2 — Project Setup, Scientific Data Contracts, and Backend Foundation | Confirm Windows runtime/package versions; pyproject/uv lock; Pydantic schemas, provider protocol, settings, health/capabilities, API error handling | Locked clean install, imports, schema and API validation tests; unavailable analysis explicit until providers implemented |
| 3 — First Validated Sun/Earth Geometry Prototype | Minimal matched kernels, local observer frames, UTC/ET and geometry; saved Horizons references | Executed comparisons with inputs, residuals, tolerances and limitations; no terrain-validity claim |
| 4 — Deterministic Mock Scientific Data Provider | Versioned synthetic fixtures and provider covering ordinary, borderline and missing-data cases | Same contract, reproducibility, coherent intervals and visible mock provenance; offline operation |
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

Only Step 1 preparation is being delivered. Next authorized task should be Step 2: resolve and pin the minimal Windows-compatible Python environment, implement scientific contracts and provider interface, and establish FastAPI foundation with contract/API tests. Do not implement geometry, mock generation, frontend or scientific dataset downloads as part of Step 2.
