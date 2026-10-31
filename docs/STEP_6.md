# Step 6 - Multi-site and multi-date scientific scenario comparison

## A. Implementation

The existing comparison preview now manages up to three independent scenarios, each with its own UI identifier/name, site, coordinates, UTC start, duration, sampling, provider, sphere-relative elevation, observer height and frame confirmation. Users can add, remove, duplicate, rename, edit, choose a baseline, run individually, retry failures and run comparison. The implementation reuses the existing validated request builder, API transport, response parser, backend endpoint and full ScenarioResult. No ephemeris calculation is duplicated in TypeScript.

Before changes, the working tree was clean at `98343c5`, tag `step-5.5-lunar-atlas`. Read the contributor, architecture, setup and roadmap documents and inspected frontend state, controls, charts, API client and backend contracts. Baseline TypeScript, 37 frontend tests and production build passed.

## B. Major files

- `frontend/src/state/ComparisonStore.ts`: bounded shared scenario state, baseline, request lifecycle, deduplication and result reuse.
- `frontend/src/state/MissionContext.tsx`: owns that store across routes, reuses Explorer saves and opens completed scenarios in the existing Analysis view without another request.
- `frontend/src/lib/comparison.ts`: sampled summaries, approximate fractions, compatibility checks, numerical differences and elapsed-to-UTC alignment.
- `frontend/src/components/ComparisonScenarioPanel.tsx`: independent editor, source/status, controls and per-scenario provenance.
- `frontend/src/components/ComparisonMetrics.tsx`: compact metrics, coverage and baseline differences.
- `frontend/src/components/ComparisonCharts.tsx`: aligned native SVG charts and synchronized elapsed cursor.
- `frontend/src/pages/Comparison.tsx`: comparison workspace and persistent mixed/mock limitations.
- `frontend/src/pages/SiteExplorer.tsx`, `Dashboard.tsx`: existing save action retains full settings; Dashboard snapshots follow the actual comparison baseline.
- `frontend/src/components/AppShell.tsx`, `ui.tsx`: truthful comparison-wide source labels, baseline context and explanatory copy.
- `frontend/src/styles/index.css`: responsive open-section comparison layout; corrected existing primary-button hover contrast.
- `frontend/src/test/comparison.test.tsx`: 27 focused tests, alongside all 37 retained frontend tests.
- Root AGENTS, ARCHITECTURE, SETUP and DEVELOPMENT_ROADMAP; this report.

## C. Workflow and state

Start with two configurable scenarios or add the current site/date from Dashboard/Explorer. Configure independent inputs, select Scientific SPICE or Mock Demonstration explicitly, then Run comparison. Scientific mode still requires explicit sphere-relative elevation and confirmation of MOON_ME_DE440_ME421 / DE440/ME421 / 1,737,400 m sphere. No coordinate conversion is performed. Duplicate a baseline, change its UTC date and rerun to compare a landing delay.

Explorer's existing Add to comparison action uses the same store and snapshots coordinates, UTC interval, provider, heights, sampling and confirmation. Configurations and completed results survive ordinary route navigation. A page reload clears all transient state; no database, localStorage or separate persistence mechanism was introduced. Open detailed analysis transfers a completed scenario into the existing shared Analysis context and chart, without an API call.

## D. Metrics and assumptions

For both Sun and Earth: starting elevation if a returned sample exists exactly at the requested start, minimum/maximum known sampled elevation, estimated fraction of covered interval time with body center above the ideal 0-degree geometric horizon, and known interval coverage. Unknown values remain unavailable. Sampled extrema are not continuous extrema.

Above-horizon estimates join adjacent known angular samples linearly and split the segment at its estimated zero crossing. Only intervals with both endpoints known contribute. Missing pairs and unsampled start/end portions are excluded; coverage is shown separately. The fraction denominator is covered time, never silently the entire requested interval. Values are rounded to whole percentages, not presented as exact durations. UTC civil timestamp differences at browser millisecond resolution are used; scientific requests crossing leap insertions remain rejected by the unchanged backend. Coarse sampling can miss actual behavior between samples.

Deltas are alternative minus baseline, in degrees or percentage points. Positive does not mean better. Provider, model and coordinate/observation frame compatibility are required. Fraction deltas additionally require full interval coverage and equal duration/sample step. Mixed-provider comparisons display a prominent warning and withhold cross-provider deltas. Summaries and interpolated fractions inherit the source limitations; the existing finite reference comparisons do not newly validate them.

## E. Visualization

Side-by-side scientific plots share an elapsed-hours axis and cursor on desktop and stack on narrower displays. Each chart identifies its scenario, provider, own starting UTC, target UTC and nearest returned-sample UTC. Gold Sun and dashed cyan Earth conventions and the ideal 0-degree horizon remain explicit. Null measurements break curves; shorter scenario intervals are not extrapolated. The readout selects actual samples rather than interpolated angles. Pointer chart clicks and the keyboard range control share the elapsed target.

Elapsed-time mode is prioritized, as permitted by the brief. Absolute-UTC overlays are deferred and that limitation appears in the UI. Different scenario dates are never labeled simultaneous. Mobile metrics scroll inside a labeled, keyboard-focusable region; the document itself does not overflow.

## F. Scientific integrity

The backend, providers, contracts, kernels, manifests, saved Horizons inputs/results and both lockfiles are unchanged. SPICE and mock dispatch remain explicit, with no fallback. Per-scenario calculation method, sources, hashes, frame, validation, assumptions and warnings are retained through the existing provenance component. Mock warnings remain visible in scenario panels, table/chart labels, workspace header/footer and provenance. Geometry is not relabeled terrain-aware illumination, Earth radio-link availability, power, battery feasibility or suitability. Those products remain unavailable.

## G. Verification executed

- Final TypeScript check passed (`npm.cmd run typecheck`).
- Final frontend tests: **64 passed**, three files (`npm.cmd test`). New tests cover bounded add/remove/duplicate/edit/baseline actions, Explorer-style snapshots, request/provider construction, successful and failed rows, retry, deduplication, unchanged-result reuse, late response protection, shared-consumer cancellation, numerical differences, null observations, crossing/coverage mathematics, elapsed/UTC alignment, provenance/mock labels and invalid duration drafts.
- Final production build passed: 2,132 modules; JS 349.69 kB / 108.76 kB gzip, CSS 59.69 kB / 13.31 kB gzip. Production source maps remain disabled.
- Existing backend suite: **115 passed**, including unchanged scientific reference and mock/API tests. One existing Starlette TestClient/httpx deprecation warning remains; dependencies were not changed to address it.
- Actual browser scientific comparison: two different sites on the same date returned 49 samples each. An alternative was moved to November 19; a baseline duplicate was independently moved to November 19, covering same-site/different-date and different-site/different-date workflows. All three returned independent SPICE results. Baseline switching changed deltas correctly.
- Browser partial failure: a pre-1972 alternative displayed UNSUPPORTED_TIME while the successful baseline and its chart remained available. Correcting the date and rerunning succeeded without provider substitution.
- Browser mock comparison: all three scenarios returned mock results. Mixed scientific/mock selection showed a prominent warning and withheld cross-provider deltas. Header/footer labels reflected comparison sources, independently of the single-analysis provider.
- Browser timeline/detail: Home/End moved the shared elapsed cursor; each chart displayed its own UTC. Opening detailed analysis loaded the chosen completed mock scenario with correct date and warning, and comparison state survived returning.
- Browser Explorer integration: after removing a scenario, selected Polar basin C in Explorer and saved it. Comparison retained the two completed rows and imported coordinates -89.6 / +15.8, date November 19 and mock provider into a third idle row; running comparison then returned a successful mock result for that imported row.
- Desktop inspected at a requested 1440 x 1000 viewport, mobile at requested 390 x 844. Mobile measured document and scroll width both 382 px; editors/charts stacked and metrics scrolled locally. Original logo, fonts, dark surfaces and gold dividers remain. Screenshots are saved under ignored `.tools/step-6-*`.
- Git diff checks passed after removing a trailing space. Scientific sources/evidence and dependency lockfiles have no diff. The official challenge URL returned HTTP 502 during reference access; challenge-page content was not verified and is not used as scientific evidence.

## H. Performance

The store retains only current scenario configurations and at most three request-keyed completed results. Canonical validated requests share an active transport, including duplicates. Completed unchanged results are reused; names and baseline choice do not recalculate. Relevant edits clear only the affected result. Removing/editing a row detaches it from a pending job; an orphaned job aborts. Job-identity and consumer-version guards reject stale completion even when transport ignores abort. Failures are independently retryable and successful rows remain intact. No queue, database, new cache dependency or new chart package is introduced.

## I. Portability

Existing `npm ci` and frozen uv setup remain sufficient. Assets/fonts remain local, paths relative, credentials unnecessary, and both package-lock.json and uv.lock unchanged. Mock mode retains its existing ability to run without scientific libraries/kernels. SPICE still requires the verified optional science environment and pinned kernels. A fresh Windows restore was not executed during this milestone.

## J. Git and recovery

Local recovery tag: `step-6-scenario-comparison`. Resolve the final commit with `git show --no-patch step-6-scenario-comparison`. The preceding Step 5.5 commit/tag remain available. No remote, push, visibility change, public repository, source sharing or deployment is performed. Staged files are reviewed for credential patterns before the final local commit.

## K. Remaining limitations

At most three scenarios, session memory only, elapsed-time mode only. No continuous-extrema guarantee, exact horizon duration, terrain-aware visibility, communication windows, electrical power, battery feasibility, resilience optimization or suitability score. Frame metadata must be confirmed explicitly; preview sites remain synthetic. Coarse/partial sampling and finite source validation remain visible limitations. Performance on another competition PC and a fresh-machine installation were not tested.

## L. Next milestone

**Step 7: LOLA Terrain Integration and Local Horizon Analysis.** The roadmap numbering follows the user's revised Step 6 brief. Step 7 is not started; it requires a separate user request.
