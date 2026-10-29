# Windows setup, privacy and recovery

## Current status

Step 1 contains documentation and ignore rules only. There is no backend, frontend, dependency lockfile, runtime service, dataset or executable application yet. Commands marked FUTURE are specifications for later milestones, not working startup instructions today. Workspace inspection found no existing project files or parent Git repository. No existing work was overwritten.

## Software and compatibility plan

Target Windows 11 x64 and PowerShell; verify the competition computer's architecture before locking binary packages. Install only Git for this documentation milestone. Later install from official sources:

| Tool | Recommended baseline and purpose |
| --- | --- |
| [Git for Windows](https://git-scm.com/downloads/win) | Supported Git 2.x; local history, private remote and recovery |
| [Python](https://www.python.org/downloads/windows/) | CPython 3.12.x x64 baseline; exact patch pinned in backend/.python-version in Step 2 after availability/import checks |
| [uv](https://docs.astral.sh/uv/getting-started/installation/) | Python environment/lock manager; record exact tested uv version in Step 2 |
| [Node.js](https://nodejs.org/en/download) | Node 24 LTS x64 baseline with bundled npm; exact patch/npm version pinned when frontend is created |
| [VS Code](https://code.visualstudio.com/download) | Optional editor; no editor-specific extension required to run the application |
| [7-Zip](https://www.7-zip.org/) | Optional for encrypted offline archives; use official Windows installer |

Use official installers, enable normal PATH options, then reopen PowerShell. uv may manage the pinned Python runtime later; do not mix unrelated system Python environments. Verify `git --version`, `uv --version`, `node --version`, `npm.cmd --version`; `uv run --locked python --version` becomes authoritative once the backend exists. A WindowsApps python.exe alias does not establish that Python is installed.

Compatibility rationale: [Vite](https://vite.dev/guide/) requires Node 20.19+ or 22.12+, and [Node 24 is an LTS line](https://nodejs.org/en/about/previous-releases). [Rasterio 1.4.4+](https://rasterio.readthedocs.io/en/stable/installation.html) requires Python >=3.10 but native drivers/wheels must be checked; [SpiceyPy](https://spiceypy.readthedocs.io/en/stable/installation.html) supports Windows. These establish a plausible baseline, not a tested complete dependency set. Exact package versions are deliberately deferred until installation is authorized in the relevant milestone. Check Python 3.12 Windows wheels for NumPy, SpiceyPy, Rasterio and PyProj and their imports; do not assume GDAL/PROJ are already installed. Avoid source builds and global QGIS/GDAL dependencies. Frontend selection must check React/React DOM, Router, Recharts, Tailwind/Vite and later React Three Fiber/Three peer compatibility.

## Dependency and environment policy — FUTURE

Step 2 introduces backend/pyproject.toml, uv.lock and .python-version. Commit all three, pin direct dependencies, lock transitives and record uv version. Use `uv sync --locked` for restore; lock updates are deliberate reviewed changes. [uv locking behavior](https://docs.astral.sh/uv/concepts/projects/sync/) supports checking that the manifest and lock agree. Add science/terrain dependencies only in their milestones as optional extras so mock installations remain small.

Step 5 introduces frontend/package.json, package-lock.json and .node-version, recording exact Node/npm versions in package metadata and this document. Restore with `npm.cmd ci`; do not hand-edit lockfiles. Dependency installation normally needs internet; a fully offline restore also needs previously prepared installers and package caches/wheels for the same platform. Installed mock operation itself must not need internet.

Backend root .env.example will document `LUNASCEND_PROVIDER=mock`, `LUNASCEND_DATA_DIR=./data` and explicit allowed frontend origin. Resolve relative data paths against the repository root, not the launching shell directory. The backend must explicitly load the root configuration; a .env file is not automatically read merely because it exists. Frontend .env.example will contain only a public `VITE_API_BASE_URL=http://127.0.0.1:8000`. All VITE-prefixed values are public. Never put credentials there. Initial local mode needs no credentials. Ignore real .env files; copy templates only after they exist.

### Local services and commands — FUTURE

Two terminals, starting in the repository root; service module names and scripts below must be implemented and confirmed at their milestones:

```powershell
# Step 2 onward, terminal A
Set-Location backend
uv sync --locked
uv run --locked uvicorn lunascend.api.main:app --host 127.0.0.1 --port 8000
```

```powershell
# Step 5 onward, terminal B
Set-Location frontend
npm.cmd ci
npm.cmd run dev -- --host 127.0.0.1 --port 5173
```

Backend http://127.0.0.1:8000; frontend http://127.0.0.1:5173. Stop each with Ctrl+C. Bind loopback by default and allow only the intended development origin. No database or other local service. Mock provider becomes functional in Step 4; Step 2 only supplies backend foundation.

Future tests: from backend, `uv run --locked pytest`; scientific extras will have documented names before use. From frontend, `npm.cmd run test -- --run` and `npm.cmd run build` (scripts to be added). Production Vite configuration must explicitly set `build.sourcemap: false`; inspect dist for maps, secrets and Python sources. `npm.cmd run preview -- --host 127.0.0.1` is a local preview, not a production hosting solution. Keep backend deployment separate, never copy it into frontend/public or dist. Browser JavaScript is inspectable even minified. Never delete original source after building. Hosting remains undecided and requires separate authorization.

## Local Git — usable now after initialization

Review locally before staging; no automatic commit is required:

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
4. At Step 1, reading these documents completes restoration; no application can run yet. At later steps copy environment templates, set local values and install via locked commands above. Restore source as well as builds so development can continue.
5. Select mock mode first and run tests/startup when those milestones exist. Disconnect networking after installation and verify mock UI and all mock routes still work without remote imagery/fonts.
6. Restore scientific data from permitted backup or official URLs in data/manifests. Verify SHA-256, coverage, frame/datum and versions. Missing data must produce explicit unavailable status; mock remains usable. See ARCHITECTURE.md acquisition procedure.
7. Run saved scientific reference tests only when their exact inputs are restored. Record results, OS/runtime versions, commit and dataset hashes. A successful clone alone is not a successful migration test.
8. Open the cloned source folder for the next development session, read AGENTS.md and request only the next approved milestone. Rehearse this on another Windows machine before the team's stated November 14–15, 2026 event dates (dates not independently confirmed here).

## Step 1 verification boundary

Documentation/source references and local Git hygiene can be checked now. Lock resolution, imports, application tests, production builds, encryption/restore drills, scientific validation and fresh-PC execution are planned and must not be claimed as completed. .gitignore is preventive, not a secret scanner; inspect all tracked and staged files before commits and pushes.
