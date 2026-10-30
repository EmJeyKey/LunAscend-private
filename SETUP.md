# Windows setup, privacy and recovery

## Current status

Step 2 implements a local FastAPI backend, twelve scientific contracts, provider abstraction, unavailable-analysis behavior and tests. Step 2.5 adds a six-page React frontend preview. Python dependencies are locked in backend/uv.lock; frontend dependencies are locked in frontend/package-lock.json. No mock scientific generator, scientific calculations or NASA datasets exist yet. Commands marked FUTURE remain planned. Earlier milestones are preserved as local commits and recovery tags.

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
