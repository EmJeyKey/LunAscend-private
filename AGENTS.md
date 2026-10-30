# LunAscend contributor instructions

LunAscend — Lunar Mission Resilience Navigator is a lunar landing-site decision-support project for a four-person electrical-engineering team. It is an educational engineering prototype, not flight-qualified mission software.

## Scope and workflow

- Read ARCHITECTURE.md, SETUP.md and DEVELOPMENT_ROADMAP.md before changes. Inspect existing work and preserve it.
- Implement only the milestone the user requests. Stop after each milestone, report actual checks and remaining limitations, and await review. Do not advance automatically.
- Step 2 provides backend contracts, provider dispatch and an unavailable-analysis API. No mock generator, datasets or scientific calculations exist yet.
- Keep changes focused; avoid speculative infrastructure, databases, Docker, unnecessary dependencies and repeated installation.
- Update documentation when contracts, assumptions, dependencies or commands change.

## Architecture and coding

- Python owns ephemeris, terrain, visibility, power, communication and resilience calculations. React only presents provider results and manages interaction.
- MockAnalysisProvider and ScientificAnalysisProvider implement the same versioned contract. Never silently substitute mock outputs for failed scientific calculations.
- Prefer small typed Python functions, explicit inputs, dependency injection at provider boundaries and deterministic tests. Use snake_case in Python and JSON; camelCase in TypeScript internals, PascalCase for components/types.
- Use strict TypeScript and typed Python public interfaces. Validate requests at the API boundary; reject non-finite numbers, invalid ranges and excessive workloads.
- Keep domain modules independent of FastAPI, React and filesystem layout. Put dataset access behind adapters. Use SI units except documented degrees and Wh; encode units in field names.
- Use pytest for backend/domain tests; Vitest for frontend utilities/components. Add API, contract and scientific-reference checks at their relevant milestones.
- Backend uses Python 3.12.16, uv 0.13.6 and a src layout. From backend run `uv sync --frozen`, `uv run --frozen pytest -q` and `uv run --frozen uvicorn lunascend.main:app --host 127.0.0.1 --port 8000`. Use `uv lock --check` to detect manifest drift; frozen restore does not update/check the lock.
- Public Pydantic contracts live in contracts/common.py and contracts/models.py. Reject extra fields and non-finite numbers, require coordinate metadata and timezone-aware timestamps. Provider mode is required per request. Missing products use null; known empty collections use empty arrays.
- Contract models are frozen and use tuples for sequence fields. Construct/revalidate changed models; Pydantic model_copy(update=...) bypasses validation. Keep providers async and independent of FastAPI.
- Step 2.5 adds frontend/ using React, strict TypeScript, Vite, Tailwind, React Router and Lucide icons. From frontend use `npm.cmd ci`, `npm.cmd run dev`, `npm.cmd run typecheck`, `npm.cmd test`, `npm.cmd run build` and `npm.cmd run preview`. Tested runtime target: Node 24.21.0 / npm 11.19.0.
- Frontend preview state and synthetic input locations are separate from scientific contracts. Do not submit preview locations as validated lunar sites. Artwork is SVG pixel geometry, not a DEM or georeferenced map. Never draw fabricated scientific curves to fill empty states.
- Frontend only checks GET /health and GET /api/v1/info through /backend proxy. Keep the backend unchanged for this preview. The UI remains usable when disconnected. Frontend API types mirror consumed backend responses; generate full scientific types when real analysis is connected.
- Keep UI pages, components, state, API client, types, styles and preview data separate. Bundle fonts/assets locally; do not require a CDN or credentials. Source maps remain disabled for production.
- Step 2.6 visual conventions: compact mission toolbars, structured scientific plots and smaller numerical readouts. Use monospaced coordinates/timestamps/units, explicit axes and technical missing-data labels. Preserve plot dimensions when data is unavailable; never add decorative scientific curves or promotional empty-state copy. Preview/unavailable states remain distinct from any future validated result.
- Step 2 duration fields are derived nominal UTC civil seconds, not leap-second-aware scientific durations. Reject leap-second timestamp strings; resolve physical elapsed-time semantics before scientific calculations in Step 3.

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
