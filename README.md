<div align="center">

# 🌕 LunAscend

### Explore the Moon. Understand the risks. Plan with confidence.

**What if the next breakthrough in lunar exploration began somewhere that has never launched a Moon mission?**

An interactive, science-grounded platform for exploring lunar sites, evaluating mission conditions, comparing opportunities, and understanding how a delayed landing changes a mission.

[**Explore the live website**](https://lunascend.vercel.app/) · [**Scientific methodology**](docs/OFFICIAL_RESOURCES.md) · [**Get started**](#getting-started) · [**Contribute**](#contributing)

Built for **NASA Space Apps Challenge 2026** by a team of electrical engineering students in Lebanon.

</div>

---

## Why LunAscend?

A promising lunar landing site is not defined by coordinates alone. Illumination changes with time; surrounding terrain can obstruct the Sun or Earth; limited solar generation affects battery survival; and a landing delay can change the entire operational picture.

**LunAscend connects these considerations in one exploratory mission-planning workspace.** It helps users ask not just *where could we land?* but *what could we expect there, at that time, under our mission assumptions?*

The platform is designed to make lunar exploration approachable to students and curious visitors while retaining more detailed scientific information for technical users.

## Explore the platform

- **Lunar Site Explorer:** Explore a 3D Moon, original lunar imagery, south-polar maps, and supported local terrain. Inspect site references with explicit coordinate and data limitations.
- **Sun & Earth Analysis:** Calculate time-dependent Sun/Earth geometry using SPICE; examine local horizon effects and terrain-aware center visibility where verified data are available.
- **Power & Battery Analysis:** Explore solar generation, consumption, state of charge, energy shortfalls, and conditional survival scenarios under user-specified assumptions.
- **Communications Assessment:** Examine Earth visibility and conditional direct-to-Earth feasibility with supported geometric/engineering constraints. **This is not a complete validated RF link-budget or network-availability guarantee.**
- **Scenario Comparison:** Compare alternative locations, dates, numerical results, and assumptions side by side.
- **Mission Resilience:** Recalculate conditions after landing delays and evaluate bounded alternatives against explicit requirements.
- **Opportunity Screening:** Explore candidate sites and intervals while preserving *pass*, *fail*, and *indeterminate* results when coverage is incomplete.
- **Scientific Methodology:** See data sources, assumptions, reference frames, validation evidence, and known limitations.

The interface offers **Simple** and **Advanced** presentations of the same results, without replacing scientific computations with simplified estimates.

## Scientific foundations

LunAscend incorporates several distinct sources and techniques:

| Component | Source / approach | Purpose |
| --- | --- | --- |
| Sun and Earth geometry | NASA/JPL NAIF SPICE kernels via SpiceyPy | Time-dependent body directions and observing geometry |
| Reference validation | JPL Horizons comparison evidence | Bounded cross-checks of calculated geometry |
| Lunar elevations and horizons | NASA LOLA-based local digital elevation models | Terrain inspection and local horizon analysis where supported |
| Lunar imagery | NASA Moon Trek WAC/NAC products | Visual/cartographic context, subject to registration limits |
| Lunar site references | Manifest-backed polar-site and Apollo catalogs | Exploration and coordinate-aware site selection |
| Power and battery | Explicit photovoltaic, load and storage assumptions | Conditional energy accounting |
| Mission requirements | Deterministic backend assessments | Transparent classification instead of unqualified rankings |

**Scientific integrity matters:** visual imagery is not silently treated as a measured terrain model; synthetic demonstrations are labeled; missing elevation or coverage is not replaced by invented measurements; and an optimistic power outcome is not a guarantee of mission survival.

## Technology

| Layer | Stack |
| --- | --- |
| Frontend | React, TypeScript, Vite, Tailwind CSS |
| 3D visualization | Three.js |
| Backend/API | Python, FastAPI, Pydantic |
| Lunar geometry | SpiceyPy / NAIF SPICE |
| Testing | Pytest and frontend automated tests |
| Dependency management | `uv.lock` and `package-lock.json` |

### Repository structure

```text
LunAscend-private/
├── backend/              # FastAPI services, scientific and engineering models
├── frontend/             # React application and 3D/map interfaces
├── data/                 # Manifests, fixtures and bundled reference windows
├── docs/                 # Methodology, validation, milestones and limitations
├── scripts/              # Dataset preparation and verification utilities
├── ARCHITECTURE.md       # System architecture and scientific boundaries
├── DEVELOPMENT_ROADMAP.md
└── SETUP.md              # Detailed reproducible setup and recovery
```

## Getting started

The documented development environment uses **Windows x64**, **Python 3.12.16**, **uv 0.13.6**, **Node.js 24.21.0**, and **npm 11.19.0**. Other environments have not been established as equivalent by the repository's documented verification.

### 1. Clone

```bash
git clone https://github.com/EmJeyKey/LunAscend-private.git
cd LunAscend-private
```

### 2. Start the backend

From the repository root, in a PowerShell terminal:

```powershell
Set-Location backend
uv sync --frozen --extra science --extra terrain
uv run --frozen --extra science --extra terrain python -m lunascend.ephemeris.manage download
uv run --frozen --extra science --extra terrain python -m lunascend.ephemeris.manage verify
uv run --frozen --extra science --extra terrain python -m lunascend.terrain.manage download
uv run --frozen --extra science --extra terrain python -m lunascend.terrain.manage verify
uv run --frozen --extra science --extra terrain uvicorn lunascend.main:app --host 127.0.0.1 --port 8000
```

The science/terrain datasets are verified and may require downloads. Some additional bundled polar windows are included; supported terrain coverage varies by location. See [SETUP.md](SETUP.md) and [TERRAIN_DATA.md](docs/TERRAIN_DATA.md) for exact prerequisites, dataset restoration, hash checks, and troubleshooting. For a minimal API-only launch, see the base backend instructions in `SETUP.md`.

### 3. Start the frontend

In a **second PowerShell terminal**, from the repository root:

```powershell
Set-Location frontend
npm.cmd ci
npm.cmd run dev
```

Open **http://127.0.0.1:5173/**. The development frontend proxies backend requests to **http://127.0.0.1:8000/** by default.

FastAPI's local documentation is available at **http://127.0.0.1:8000/docs**.

### 4. Run checks

```powershell
# From frontend/
npm.cmd run typecheck
npm.cmd test
npm.cmd run build

# From backend/
uv run --frozen --extra science --extra terrain pytest -q -p no:cacheprovider
```

Scientific integration checks require the correct verified kernels and supporting data; unavailable optional resources may result in explicitly skipped tests or structured errors rather than fabricated outputs.

## How to use LunAscend

1. **Choose a lunar location:** select a supported catalog entry or enter a site with explicit coordinates and reference metadata.
2. **Set a UTC interval and mission assumptions:** define the date, duration, observation settings and, where relevant, hardware configuration.
3. **Run analysis:** inspect the calculated Sun/Earth geometry, available terrain visibility, energy and conditional communications results.
4. **Compare scenarios:** evaluate alternative dates or sites using the same stated requirements.
5. **Test a delay:** use Mission Resilience to see which conditions change and where evidence is incomplete.
6. **Inspect methodology:** review provenance, coordinate frames, source coverage, numerical assumptions and limitations before drawing conclusions.

## Limitations and responsible use

**LunAscend is an educational, exploratory decision-support prototype—not certified flight software or an operational landing-site approval system.**

- Terrain and imagery coverage are **not global**. Local DEMs support specific verified areas; absence of coverage means *unknown*, not safe.
- Photographic image-to-DEM registration and draping have documented limits. Apollo terrain ingestion is not generally enabled.
- Visibility of Earth's center does **not** alone prove reliable RF communications. Full validated link budgets, actual ground-station scheduling, atmospheric effects, and relay-network guarantees are outside the verified claims of this release.
- Power results depend on assumed hardware, loads, environmental approximations and selected scenarios. Battery survivability is conditional, not guaranteed.
- Search is bounded and transparent; it is not exhaustive global landing-site optimization or certification of slopes/hazards.
- SPICE/Horizons comparisons and local test results validate specific cases, not every lunar position, epoch or physical effect.

Read [ARCHITECTURE.md](ARCHITECTURE.md), [DEVELOPMENT_ROADMAP.md](DEVELOPMENT_ROADMAP.md), and the technical reports in [`docs/`](docs/) for the complete scientific scope.

## Vision

We want anyone—regardless of age or technical background—to be able to explore the Moon, understand the decisions behind a mission, and take part in the curiosity that drives exploration.

**Future direction:** an immersive VR lunar experience that could make verified lunar landscapes more accessible to classrooms and the public. VR is a vision for future development, **not a released feature**.

## Contributing

Contributions are welcome, especially around scientific validation, accessibility, documentation, data provenance, software quality and visual exploration.

1. Open an issue describing the proposed change or scientific question.
2. Fork the repository and create a focused branch.
3. Include tests and document assumptions, units, coordinate frames and sources for scientific changes.
4. Open a pull request describing what changed and how you verified it.

Please do not present approximations, synthetic outputs, or unavailable source coverage as real measured lunar conditions.

## Open-source license

**A license has not been specified here.** Publishing code publicly does not automatically grant permission to reuse, modify or redistribute it. The maintainers should add a repository-root `LICENSE` file with a license chosen and approved by the team before describing the project as freely reusable open-source software. Third-party data, images, kernels and fonts can have separate terms; review their attribution and redistribution requirements in the source documentation.

## Team and acknowledgments

Created for the **NASA Space Apps Challenge 2026** by a team of electrical engineering students in **Lebanon**.

We acknowledge the scientific resources and tools of NASA, JPL, NAIF, the Lunar Reconnaissance Orbiter mission and other cited data providers. Their contributions provide essential underlying science and reference data; this project is **not an official NASA/JPL mission-planning product** and does not imply agency endorsement.

---

<div align="center">

**LunAscend — the Moon is for everyone.**

[Live platform](https://lunascend.vercel.app/) · [Source code](https://github.com/EmJeyKey/LunAscend-private)

</div>
