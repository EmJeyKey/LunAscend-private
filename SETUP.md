# Windows setup, privacy and recovery

## Current status

Step 10 adds a lazy Three.js 0.187.0 viewer (and matching 0.187.0 types), restored with the existing `npm.cmd ci` workflow. No new Python extra, service or global texture is required. Local terrain uses the same restored science/terrain environment, Site01 DEM and exact frame kernels as before. In Explorer, choose Load Site01 reference, confirm its coordinate epoch, and load Local terrain / South polar map. Open Analysis and run the existing scientific terrain request to enable the shared Sun/Earth timeline. The globe is context only; missing DEM/WebGL remains explicit, with a polar map/analysis fallback. From backend, `python -m lunascend.terrain.visualization_validation` reproduces the bounded real mesh and height comparison. See docs/STEP_10.md for limits, measured checks and local recovery tag `step-10-3d-lunar-terrain`. Stop before Step 11.

Step 9 completes Mission Resilience with no new dependencies or services. Use the existing locked science/terrain extras, kernels, Site01 DEM and local backend/frontend. Configure scientific terrain, power and DTE on Resilience, confirm coordinate metadata, choose a delay or bounded date/site grid and evaluate. Visible form drafts are used; dates are UTC. Unknown coverage cannot pass requirements. Add calculated alternatives to Comparison only if a slot is available. Search state clears on navigation; transferred scenarios use the existing in-memory store. From backend, reproduce the recorded six-candidate demonstration with `python -m lunascend.resilience.validation`. This performs actual science calculations and writes docs/validation/step-9-results.json; see docs/STEP_9.md for inputs, caps, evidence and limitations.

Step 7 adds the optional terrain backend, with no frontend redesign. From backend, use `uv sync --frozen --extra science --extra terrain`, restore/verify the original kernels, then `python -m lunascend.terrain.manage download` and `python -m lunascend.terrain.manage verify`. The 41 MB NASA DEM and two small additional frame kernels are hash-pinned and ignored; no credentials or system GDAL installation is needed with the verified Windows wheels. Native DE421 terrain can run with the terrain extra alone; cross-frame requests also require science and both kernel sets. See docs/TERRAIN_DATA.md for exact conventions, portable paths, API examples and restoration; docs/STEP_7.md records actual verification.


Step 6 adds scientific scenario comparison with no new setup requirements or dependencies. In Comparison, choose 2-3 scenarios, configure each provider/site/UTC interval independently, confirm scientific heights/frame where required, and run comparison. Duplicate a scenario to change its date. Explorer's Add to comparison preserves its current settings. Results and configurations persist through navigation in memory, not reload. See docs/STEP_6.md for sampling limits and executed checks.


Step 5.5 refines the existing lunar workbench without changing backend calculations or either dependency lockfile. Display, interface and technical fonts are Cormorant Garamond, IBM Plex Sans and IBM Plex Mono, all served locally with OFL notices and source hashes. The Dashboard settings start collapsed and open when an invalid required field needs attention. See docs/STEP_5_5.md for the latest verification.

Step 5 connects the existing website to scientific/mock observations and includes the requested logo/typography refinement. Earlier milestone descriptions below retain historical context. The backend, public contracts, scientific evidence and both dependency lockfiles remain unchanged. All fonts and the original logo are local repository assets; no runtime font CDN or new package is required.

## Integrated website (Step 5)

Use two PowerShell terminals from the restored project root. Backend: `Set-Location backend`, `uv sync --frozen --extra science`, verify/restore the pinned kernels as below, then `uv run --frozen --extra science uvicorn lunascend.main:app --host 127.0.0.1 --port 8000`. For mock-only operation omit the science extra; no kernels are needed. Frontend: `Set-Location frontend`, `npm.cmd ci`, then `npm.cmd run dev`. Open http://127.0.0.1:5173/. Existing VITE_API_BASE_URL / LUNASCEND_BACKEND_URL configuration and loopback defaults remain unchanged.

Select Scientific SPICE or Mock Demonstration explicitly and click Run Analysis. For scientific use, enter coordinates in MOON_ME_DE440_ME421, an explicit height above the 1737400 m sphere, and confirm the frame. Unknown height is never silently zero. To reproduce the documented reference, enter latitude -89, longitude 42, height 0, observer height 0, UTC 2026-11-14T00:00, duration 24 hours and step 43200 s. Sun at the first sample displays 84.651 degrees azimuth and +1.650 degrees elevation. The synthetic reference observer is not a surveyed landing site.

The chart and time slider use returned samples; moving between Dashboard/Analysis reuses them. Input edits clear old results, errors preserve inputs, and scientific failures never switch to mock. Coordinates/heights collapse after success and reopen for editing/errors. An unavailable backend or missing kernels shows an error and no invented curves. The source selector and returned source labels remain distinct. Browser refresh clears transient state.

From frontend run `npm.cmd run typecheck`, `npm.cmd test`, `npm.cmd run build`; from backend run `uv run --frozen --extra science pytest -q -p no:cacheprovider`. Tested: 37 frontend tests, TypeScript/build and 115 backend tests, including unchanged scientific reference checks. Both lockfiles are preserved. Local font assets include their licenses and source hashes; restore them with the repository, not from the original computer. Fresh-PC and encrypted-backup rehearsals remain unperformed. See docs/STEP_5.md and docs/DESIGN_REFINEMENT.md for browser QA and assets.

Step 4 adds a deterministic, explicitly illustrative mock provider alongside the unchanged SPICE geometry provider. The six-page frontend retains its Step 2.6 preview; observation output is currently API-only. Python dependencies are locked in backend/uv.lock; frontend dependencies are locked in frontend/package-lock.json. No terrain or engineering calculation exists. Commands marked FUTURE remain planned. Earlier milestones are preserved as local commits and recovery tags. Historical setup sections below retain their milestone context; current Step 3/4 instructions supersede their earlier provider-availability statements.

## Offline mock backend (Step 4)

No new dependencies, kernels, credentials, fixtures or external services are required. After normal base installation, mock analysis works without SpiceyPy/NumPy. From backend run `uv sync --frozen`, `uv run --frozen pytest -q -p no:cacheprovider`, then `uv run --frozen uvicorn lunascend.main:app --host 127.0.0.1 --port 8000`. Use `--extra science` on sync/run when also retaining scientific capability as described below; base sync can remove optional packages.

In another PowerShell terminal at the project root:

```powershell
$body = Get-Content backend/examples/mock-request.json -Raw
Invoke-RestMethod http://127.0.0.1:8000/api/v1/scenarios/analyze -Method Post -ContentType 'application/json' -Body $body
```

Provider mode must explicitly be mock. The existing endpoint returns illustrative observations, mock validation and MOCK / NOT LUNAR PREDICTIONS warnings; it never claims actual lunar conditions. See [design and response excerpt](docs/STEP_4.md). The scientific mode retains its resource checks and structured errors, with no fallback. Mock sampling uses nominal UTC civil seconds, not leap-second-aware physical time. Existing frontend remains unchanged and does not consume observations yet. A fresh Windows computer still needs the pinned toolchain and source/lock restore; after dependencies are installed mock requests need no internet. Another-PC execution remains untested.

## Scientific backend quick start (Step 3)

Use Windows x64, Python 3.12.16 and uv 0.13.6 as installed below. The optional science extra pins SpiceyPy 8.3.0 and NumPy 2.5.4; Windows binary installation/imports were executed successfully, using CSPICE N0067. From the project root:

```powershell
Set-Location backend
uv sync --frozen --extra science
uv lock --check
uv run --frozen --extra science python -m lunascend.ephemeris.manage download
uv run --frozen --extra science python -m lunascend.ephemeris.manage verify
uv run --frozen --extra science pytest -q -p no:cacheprovider
uv run --frozen --extra science python -m lunascend.ephemeris.validation compare
uv run --frozen --extra science uvicorn lunascend.main:app --host 127.0.0.1 --port 8000
```

Keep `--extra science` on uv run commands; uv can otherwise sync away optional dependencies. With the existing project-local uv, use the ignored-tooling environment variables described below and substitute `..\.tools\uv.exe` for uv. A fresh PC needs only source, lockfiles, the manifest and the pinned toolchain; it does not need this computer's environments or paths.

The download command accesses only the five official NAIF URLs in [the manifest](data/manifests/spice-kernels.json), downloads approximately 46 MB into ignored data/kernels, verifies SHA-256 and atomically installs each file. Existing verified files are reused without network access. A hash mismatch fails clearly; move the damaged file aside deliberately before retrying. Do not disable TLS or replace manifest hashes just to accept a download. Verify checks all hashes, frame/radii and actual coverage with spkcov/pckcov. The current ET intersection is [-4734072000,4735368000] seconds from J2000, nominal UTC 1849-12-25T23:59:18.816175Z through 2150-01-21T23:58:50.815541Z. The engine additionally limits UTC to 1972 onward. LSK 0012 contains offsets through 2017-01-01; future UTC assumes that last offset. A later leap-second announcement requires a reviewed LSK update and repeated validation.

Default kernel paths resolve relative to the project root, regardless of shell working directory. Optionally set `$env:LUNASCEND_KERNEL_DIR = 'data/kernels'` or an absolute directory in the current process before startup; this affects the backend and CLI. No .env file is automatically read. Keep binaries outside Git. For offline restoration, copy all five exact manifest-matching files from a trusted backup into data/kernels, then run verify and tests. First-time Python/package installation still needs internet or a prepared compatible uv cache. A fresh Windows computer and encrypted backup recovery have not yet been rehearsed.

In a second terminal at the project root:

```powershell
Invoke-RestMethod http://127.0.0.1:8000/health
Invoke-RestMethod http://127.0.0.1:8000/api/v1/info
$body = Get-Content backend/examples/scientific-request.json -Raw
Invoke-RestMethod http://127.0.0.1:8000/api/v1/scenarios/analyze -Method Post -ContentType 'application/json' -Body $body
```

The example is a synthetic south-polar reference observer, not a surveyed landing site. Its response contains three real calculated epochs and six source records, with terrain and engineering products null. See [saved example output](docs/validation/step-3-example-result.json). Required metadata: planetocentric latitude, east-positive longitude, frame MOON_ME_DE440_ME421, realization DE440/ME421, reference_surface MOON_SPHERE_1737400_M, reference_radius_m 1737400 and explicit surface_elevation_m. Zero height is an explicit assumption, never a default for unknown elevation.

The existing base backend still runs without science: `uv sync --frozen`, followed by `uv run --frozen uvicorn lunascend.main:app --host 127.0.0.1 --port 8000`. Health/info and contracts work; scientific analysis returns structured HTTP 503 with PROVIDER_UNAVAILABLE. With science installed but a missing/corrupt kernel it returns MISSING_DATA. No data is fabricated and no mock fallback occurs. Base pytest runs skip the optional science test module when SpiceyPy is absent; with science installed but no kernels, kernel integration tests are explicitly skipped. Full scientific acceptance requires the extra and all verified kernels.

Troubleshooting: FRAME_MISMATCH means site frame/latitude/sphere metadata is incompatible; do not rename another frame to bypass it. INVALID_REQUEST can mean missing elevation or enabled terrain/engineering settings. OUTSIDE_COVERAGE means the whole interval does not fit a continuous measured coverage window. UNSUPPORTED_TIME covers pre-1972 UTC and intervals crossing leap-second insertions; leap-second strings are rejected by the unchanged datetime contract. Request limits remain 366 days/10001 samples/minimum 0.001 s. Unexpected SPICE errors return a safe CALCULATION_FAILED response, never raw internals. Pole/zenith azimuth is null with a reason, not zero.

Validation is reproducible offline with `validation compare` using the committed request/raw-response pairs in data/fixtures/horizons. The command writes docs/validation/step-3-results.json and exits nonzero when the predeclared criteria fail. To acquire references explicitly, run `uv run --frozen --extra science python -m lunascend.ephemeris.validation fetch`; verified saved pairs are reused. Archive the existing pairs before intentionally obtaining a different live reference release; never silently overwrite evidence. See [the predeclared plan](docs/validation/STEP_3_PLAN.md) and [results](docs/validation/STEP_3_RESULTS.md). Preserve the original plan and thresholds when updating evidence. Agreement is a finite cross-implementation comparison, not global physical accuracy. No solar-limb, terrain or radio feasibility claim follows.

The frontend requires no changes or science packages: run its existing typecheck, tests and build commands below. It still consumes only health/info and labels scientific metrics unavailable. A connected backend can now have scientific capability, but the preview does not submit its unresolved site inputs.

## Frontend preview quick start (Step 2.5)

Required and recorded in frontend/.node-version and package.json: Node.js 24.21.0 x64 with npm 11.19.0. Install the matching [official Node.js distribution](https://nodejs.org/en/download), reopen PowerShell and verify versions. The repository does not rely on a global Vite/TypeScript installation. From the cloned/restored project root:

```powershell
node --version
npm.cmd --version
Set-Location frontend
npm.cmd ci
npm.cmd run dev
```

Open **http://127.0.0.1:5173/** in Chrome. The server binds loopback only and fails clearly if the selected port is occupied. Stop it with Ctrl+C. npm.cmd avoids PowerShell's npm.ps1 execution-policy issue; no permanent execution-policy change is needed. Paths with spaces work when quoted. Do not copy node_modules from the original PC; npm ci restores the committed dependency lock. Initial installation normally requires internet; cache/installers must be prepared separately for fully offline setup.

Frontend checks and local production preview, from frontend:

```powershell
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
npm.cmd run preview
```

Build performs a TypeScript check and writes only frontend/dist. Open **http://127.0.0.1:4173/** for local production preview. Source-map generation is explicitly false in vite.config.ts. Original source is retained. Neither dev nor preview publishes the project. node_modules, dist and TypeScript build metadata are ignored by Git. All required fonts, icons and artwork are bundled locally; the website can render without internet after installation.

To run both services, use two terminals starting at the project root. In terminal A, use the backend instructions below (`uv run --frozen uvicorn lunascend.main:app --host 127.0.0.1 --port 8000`). In terminal B run the frontend commands above. The existing project-local uv installation is also documented below.

The frontend works with the backend stopped and displays Backend disconnected. Start FastAPI and click the connection indicator to retry. A connected backend still has no scientific analysis capability in Step 2.5. The frontend only requests health and info; no scenario analysis is submitted.

Configuration is optional. Copy frontend/.env.example to frontend/.env.local only when changing defaults; restart Vite after edits. VITE_API_BASE_URL defaults to /backend, and both dev/preview proxy that path to LUNASCEND_BACKEND_URL (default http://127.0.0.1:8000). This avoids modifying backend CORS. An absolute cross-origin VITE_API_BASE_URL needs backend CORS support, which this milestone does not add; prefer the proxy. All VITE_* settings are public and must never contain secrets. No API keys or other services are required.

Selections, alternative scenarios, time cursor and delay controls change interface context only. Coordinates are synthetic examples or user inputs with unresolved scientific reference metadata. Artwork is not NASA topography or a georeferenced lunar map. Empty metrics are intentional; preview operation does not depend on NASA datasets. State resets when the browser reloads.

Fresh-PC restoration: restore source and both lockfiles via the private-repository/offline procedures below, install the pinned toolchains, run npm ci and the backend frozen sync, then run tests/build and open the preview. Another-PC execution and encrypted recovery still require a future rehearsal. BrowserRouter routes work in Vite dev/preview; any future static host must explicitly fall back to index.html for application routes.

## Frontend verification (Step 2.6)

Frontend verification update (2026-10-30, Step 2.6): the retained Step 2.5 installation passed TypeScript, all 17 frontend tests and the production build before the recovery snapshot. All 67 backend tests also passed with the existing TestClient deprecation warning. Refined controls and navigation were checked in the browser, including desktop and 390 px mobile layouts and backend-disconnected retry. No backend code or dependencies were changed. Open http://127.0.0.1:5173/analysis after `npm.cmd run dev` to inspect the refined scientific UI. Another-PC execution and scientific validation remain unperformed.

## Verified backend quick start (Step 2)

Tested on this Windows x64 computer with Python 3.12.16 and uv 0.13.6. Direct packages: FastAPI 0.162.0, Pydantic 2.14.2, Uvicorn 0.54.0, pytest 9.2.0 and HTTPX 0.28.1. Build backend: uv_build 0.13.6. Exact transitive artifacts/hashes are in uv.lock. No global Python packages are required. Scientific-library compatibility is still deferred.

On a fresh Windows PC install uv 0.13.6 using the [official versioned installer](https://docs.astral.sh/uv/getting-started/installation/):

```powershell
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/0.13.6/install.ps1 | iex"
# Reopen PowerShell if uv is not yet on PATH, then enter the cloned project root.
uv --version
Set-Location backend
uv python install 3.12.16
uv sync --frozen
uv lock --check
uv run --frozen python --version
uv run --frozen pytest -q
uv run --frozen uvicorn lunascend.main:app --host 127.0.0.1 --port 8000
```

`uv sync --frozen` restores the committed lock without modifying it; it does not check manifest drift, so `uv lock --check` is a separate verification. `uv sync --locked` is also supported and rejects a stale lock. Development/test dependencies install by default. Run from backend; the src-layout package is installed into backend/.venv. Python's exact patch is recorded in backend/.python-version. Stop the server with Ctrl+C.

This session used project-local ignored tooling rather than a PATH installation: uv is in .tools, its managed Python in .python, and cache in .uv-cache. To use that installation, run the following from the repository root, then substitute `..\.tools\uv.exe` for `uv` in commands after entering backend:

```powershell
$env:UV_PYTHON_INSTALL_DIR = Join-Path (Get-Location) '.python'
$env:UV_CACHE_DIR = Join-Path (Get-Location) '.uv-cache'
Set-Location backend
..\.tools\uv.exe sync --frozen
..\.tools\uv.exe run --frozen pytest -q
..\.tools\uv.exe run --frozen uvicorn lunascend.main:app --host 127.0.0.1 --port 8000
```

Those local tooling directories are not needed in Git or on the next PC; a normal uv installation recreates the environment using the same source/lock. Startup and contract validation need no internet once dependencies are installed. No .env file or secrets are required in Step 2. Provider selection is mandatory in the JSON request, not an environment default. Host/port are command-line settings. Dataset paths, optional origins/CORS and .env templates will be added only when needed.

In a second PowerShell terminal, from the repository root:

```powershell
Invoke-RestMethod http://127.0.0.1:8000/health
Invoke-RestMethod http://127.0.0.1:8000/api/v1/info
# Open http://127.0.0.1:8000/docs in a browser for interactive API documentation.
$body = Get-Content backend/examples/unavailable-request.json -Raw
try {
    Invoke-RestMethod http://127.0.0.1:8000/api/v1/scenarios/analyze -Method Post -ContentType 'application/json' -Body $body
} catch {
    $_.ErrorDetails.Message  # Expected HTTP 503 and structured unavailable result
}
```

The example contains synthetic input coordinates and unresolved frame metadata, not an actual surveyed landing site. Both mock and scientific modes return 503 without observations, horizons or engineering results. Invalid requests return 422. Info explicitly reports both analysis providers as not implemented. `/docs` and `/openapi.json` are available; interactive Swagger UI normally fetches its assets from a CDN.

Windows troubleshooting: reopen the shell after installation; use `Get-Command uv` to check PATH; avoid the WindowsApps Python alias by using uv-managed Python. Quote paths containing spaces. Do not activate .venv or change execution policy permanently; `uv run` selects the environment directly. If port 8000 is occupied, identify the existing process or use `--port 8001` and update health-check URLs. On download/TLS failure, retry from an allowed connection using the official uv Windows release archive, extract it and invoke uv.exe directly; do not disable certificate verification. If antivirus/file ownership blocks pytest's optional cache, `uv run --frozen pytest -q -p no:cacheprovider` runs the same tests without that cache.

Verification performed: locked dependency installation, 67 passing pytest checks, actual Uvicorn startup on 127.0.0.1:8000, live health/info/docs requests, valid-analysis 503 and invalid-analysis 422. A second empty virtual environment restored successfully with `uv sync --frozen --offline` using the populated cache; `uv lock --check --offline` and all 67 tests passed there too. This is same-computer restoration, not another-PC evidence. The test stack emits a Starlette warning that its HTTPX 0.28 compatibility path is deprecated in favor of HTTPX2; current tests pass with the pinned stack. Revisit the test client at a dependency-update milestone. A sandbox cache permission warning in the first run was avoided in the restore run with `-p no:cacheprovider`. No other-PC migration, encrypted restore or scientific validation has been executed.

## Software and compatibility plan

Target Windows 11 x64 and PowerShell; verify the competition computer's architecture before installing binary packages. Backend tools are installed in Step 2; frontend/editor/backup tools remain optional or future. Official sources:

| Tool | Recommended baseline and purpose |
| --- | --- |
| [Git for Windows](https://git-scm.com/downloads/win) | Supported Git 2.x; local history, private remote and recovery |
| [Python](https://www.python.org/downloads/windows/) | CPython 3.12.16 x64; backend/.python-version, managed installation via uv supported |
| [uv](https://docs.astral.sh/uv/getting-started/installation/) | Tested version 0.13.6; Python environment/lock manager |
| [Node.js](https://nodejs.org/en/download) | Node 24 LTS x64 baseline with bundled npm; exact patch/npm version pinned when frontend is created |
| [VS Code](https://code.visualstudio.com/download) | Optional editor; no editor-specific extension required to run the application |
| [7-Zip](https://www.7-zip.org/) | Optional for encrypted offline archives; use official Windows installer |

Use official installers, enable normal PATH options, then reopen PowerShell. uv may manage the pinned Python runtime later; do not mix unrelated system Python environments. Verify `git --version`, `uv --version`, `node --version`, `npm.cmd --version`; `uv run --locked python --version` becomes authoritative once the backend exists. A WindowsApps python.exe alias does not establish that Python is installed.

Compatibility rationale: [Vite](https://vite.dev/guide/) requires Node 20.19+ or 22.12+, and [Node 24 is an LTS line](https://nodejs.org/en/about/previous-releases). [Rasterio 1.4.4+](https://rasterio.readthedocs.io/en/stable/installation.html) requires Python >=3.10 but native drivers/wheels must be checked; [SpiceyPy](https://spiceypy.readthedocs.io/en/stable/installation.html) supports Windows. These establish a plausible baseline, not a tested complete dependency set. Exact package versions are deliberately deferred until installation is authorized in the relevant milestone. Check Python 3.12 Windows wheels for NumPy, SpiceyPy, Rasterio and PyProj and their imports; do not assume GDAL/PROJ are already installed. Avoid source builds and global QGIS/GDAL dependencies. Frontend selection must check React/React DOM, Router, Recharts, Tailwind/Vite and later React Three Fiber/Three peer compatibility.

## Dependency and environment policy

Step 2 includes backend/pyproject.toml, uv.lock and .python-version. All three belong in Git. Direct dependencies and build backend are pinned; transitive versions/artifact hashes are locked. Restore using the verified quick start above. [uv locking behavior](https://docs.astral.sh/uv/concepts/projects/sync/) distinguishes frozen restore from lock checks. Lock updates are deliberate reviewed changes. Add science/terrain dependencies only in their milestones as optional extras.

Step 2.5 introduces frontend/package.json, package-lock.json and .node-version ahead of the originally planned Step 5. Restore with `npm.cmd ci`; do not hand-edit lockfiles. Dependency installation normally needs internet; a fully offline restore also needs previously prepared installers and package caches/wheels for the same platform. Installed interface preview itself does not need internet.

Future backend .env.example may document `LUNASCEND_DATA_DIR=./data` and explicit allowed frontend origin. Provider mode remains explicit per request. Resolve relative data paths against the repository root, not the launching shell directory. The backend must explicitly load any future configuration; .env is not automatically read merely because it exists. Frontend .env.example will contain only a public `VITE_API_BASE_URL=http://127.0.0.1:8000`. All VITE-prefixed values are public. Never put credentials there. Ignore real .env files; copy templates only after they exist.

### Local services — backend and frontend

Start each terminal in the repository root:

```powershell
# Step 2 onward, terminal A
Set-Location backend
uv sync --locked
uv run --frozen uvicorn lunascend.main:app --host 127.0.0.1 --port 8000
```

```powershell
# Step 2.5 onward, terminal B
Set-Location frontend
npm.cmd ci
npm.cmd run dev -- --host 127.0.0.1 --port 5173
```

Backend http://127.0.0.1:8000; frontend http://127.0.0.1:5173. Stop each with Ctrl+C. Bind loopback by default and allow only the intended development origin. No database or other local service. Mock provider becomes functional in Step 4; Step 2 only supplies backend foundation.

Backend tests: from backend, `uv run --frozen pytest -q`. Scientific extras will have documented names before use. Frontend tests/build: from frontend, `npm.cmd test` and `npm.cmd run build`. Vite explicitly sets `build.sourcemap: false`; inspect dist for maps, secrets and Python sources. `npm.cmd run preview` is a local preview, not a production hosting solution. Keep backend deployment separate, never copy it into frontend/public or dist. Browser JavaScript is inspectable even minified. Never delete original source after building. Hosting remains undecided and requires separate authorization.

## Local Git — usable now after initialization

Step 1 baseline has been committed and tagged locally. The following illustrates that milestone's workflow; do not recreate the existing tag. Review before staging each later milestone:

```powershell
git status --short --untracked-files=all
git add AGENTS.md ARCHITECTURE.md SETUP.md DEVELOPMENT_ROADMAP.md .gitignore
git diff --cached --check
git diff --cached
git commit -m "docs: define LunAscend architecture and portable foundation"
git tag step-1-foundation
```

Configure name/email locally with `git config user.name` and `git config user.email` if Git requests them; choose your own identity and privacy-preserving email. Never fabricate a team identity. After each accepted milestone, stage only intended files, run relevant checks, inspect the diff and commit, e.g. `feat: add versioned analysis contracts` or `test: validate lunar geometry against saved references`.

Use `git log --oneline` to locate changes. On a clean tree, `git revert <commit-id>` creates an undo commit without rewriting shared history. Preserve uncommitted work first (reviewed commit or private backup). To recover an older milestone for further work, use `git switch -c recovery-step-1 step-1-foundation`. This requires that tag to have been created. Avoid destructive reset/clean commands. A Git bundle or remote contains committed history only.

## Private GitHub — authorization required, not executed

After explicit authorization, the team owner creates an EMPTY PRIVATE repository on GitHub (no generated README/license) and verifies its private badge/settings. Use Git Credential Manager or SSH; never embed a token in a URL. Then, substituting the actual owner:

```powershell
git remote add origin https://github.com/OWNER/lunascend.git
git remote -v
# Recheck visibility and staged/history content before authorized push
git push -u origin main
git push origin --tags
```

If a remote already exists, inspect it rather than replacing it. Creating a local repository does not create a private GitHub repository. Collaborator invitations, pushes, deployments and visibility changes each need explicit authorization. Do not add an open-source license or make source public by default. Verify final Space Apps submission/source-sharing rules with organizers before submission; any required publication is a separate team decision.

## Two independent backups

Backup A: authorized private GitHub, containing source, docs, tests, configuration templates, locks, small permitted fixtures and dataset manifests. Verify branch/tag availability after each authorized push. Check account access from the competition computer ahead of time; do not share passwords.

Backup B: encrypted offline archive on a separate removable drive. Once a reviewed milestone is committed, create a Git bundle with `git bundle create lunascend.bundle --all` and check it with `git bundle verify lunascend.bundle`. Bundle files are ignored. Inspect history for secrets first: deleting a secret from the latest version does not erase history; rotate any exposed credential and address history before sharing backups.

Prepare a temporary backup staging folder OUTSIDE the project containing the verified bundle, a reviewed source snapshot including any intended untracked work, documentation, manifests/locks, local nonsecret notes and permitted datasets/labels. Also include exact-version installers/package caches if fully offline recovery is needed. Exclude .env, credentials, SSH keys, tokens, browser profiles, node_modules, virtual environments, build outputs and unreviewed logs. Do not blindly archive the entire working folder or .git/config. Git bundles omit local config and uncommitted work, hence the reviewed snapshot.

In 7-Zip's GUI select the staging folder, choose 7z format, AES-256 encryption and Encrypt file names. Enter a strong passphrase interactively; never put it in a command, script or archive. Store it separately in the team's password manager, not on the USB drive. Use 7-Zip Test, then extract to a new temporary directory and verify the contents and bundle. Record archive SHA-256 using `Get-FileHash -Algorithm SHA256 <archive-path>` and keep the checksum separately. Remove the temporary plaintext staging copy after confirming the encrypted backup; do not delete the original project. Keep a second encrypted copy on separate media where feasible.

## Fresh-PC restore checklist

1. Install documented Git, pinned uv/Python and (once needed) Node/npm; optional editor and 7-Zip. Verify versions. No original machine paths or services may be required.
2. With authorized private repository access: `git clone https://github.com/OWNER/lunascend.git`, then `Set-Location lunascend`. Or decrypt the offline archive, verify checksum and bundle, and `git clone lunascend.bundle lunascend`. Inspect/add the authorized remote separately after a bundle restore.
3. Verify expected commit/tag with `git log -1` and `git status`. Restore reviewed uncommitted snapshot changes separately if any; avoid overwriting committed files blindly.
4. At Step 2, use the verified backend quick start above, including frozen restore, lock check, pytest, server startup and health/info checks. No environment template is needed yet. Restore source as well as builds so development can continue.
5. Both analysis modes are intentionally unavailable at Step 2. From Step 4 onward, select mock mode first; once a frontend exists, disconnect networking after installation and verify mock UI/routes work without remote imagery/fonts.
6. Restore scientific data from permitted backup or official URLs in data/manifests. Verify SHA-256, coverage, frame/datum and versions. Missing data must produce explicit unavailable status; mock remains usable. See ARCHITECTURE.md acquisition procedure.
7. Run saved scientific reference tests only when their exact inputs are restored. Record results, OS/runtime versions, commit and dataset hashes. A successful clone alone is not a successful migration test.
8. Open the cloned source folder for the next development session, read AGENTS.md and request only the next approved milestone. Rehearse this on another Windows machine before the team's stated November 14–15, 2026 event dates (dates not independently confirmed here).

## Step 1 verification boundary

Step 1 checked documentation/source references and local Git hygiene. Step 2 adds executed locked installation, backend/API tests and live server checks described above. Production frontend builds, encryption/restore drills, scientific validation and fresh-PC execution remain planned. .gitignore is preventive, not a secret scanner; inspect all tracked and staged files before commits and pushes.


Step 7.5 terrain-aware analysis uses the same science/terrain extras, manifests and restoration commands as Step 7. POST backend/examples/terrain-visibility-request.json to the existing /api/v1/scenarios/analyze endpoint. Set terrain_enabled, horizon_mode=terrain and explicit terrain_options; surface_elevation_m must be null for DEM-derived height, and coordinate_epoch_utc must equal start_utc. The Analysis page offers a Site01 example and explicit opt-in. Reproduce saved evidence from backend with `python -m lunascend.visibility.validation`. See docs/STEP_7_5.md; no additional dependencies or services.


## Step 8 optional engineering analysis

No additional dependencies or services. Restore the existing locked environment and SPICE/LOLA data using the commands above. In the Analysis or scenario settings, enable scientific terrain, then explicitly enable power/battery and/or DTE with hardware assumptions. The existing `/api/v1/scenarios/analyze` endpoint accepts `backend/examples/engineering-request.json`; requested engineering requires `power_options` and/or `communication_options`. Geometric-only and ordinary mock modes remain unchanged; mock engineering is rejected.

From `backend`, run the existing virtual environment's Python:

- `python -m lunascend.power.validation` reproduces the real SPICE/LOLA engineering example.
- `python -m lunascend.power.validation --saved-environment ../docs/validation/step-7.5-results.json` replays the saved environment without recalculating terrain/geometry.

Outputs are saved under `docs/validation/step-8-*.json`. Replay requires matching site, frame, observer height, interval and terrain settings. All hardware/irradiance inputs are assumptions; results are conditional estimates. See `docs/STEP_8.md` for units, energy accounting, DTE classifications and limitations. No Step 9 work or public deployment is included.
