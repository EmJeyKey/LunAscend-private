# Step 9 — Mission resilience and bounded landing opportunities

## Implementation and scientific boundaries

Step 9 composes the existing SPICE/LOLA visibility and Step 8 PV, battery and conditional DTE models. It does not duplicate their equations, change scientific reference cases, introduce dependencies, or implement a 3D viewer. The original logo, local Marcellus/Manrope/IBM Plex Mono fonts and palette are preserved.

`POST /api/v1/resilience/search` accepts an explicit scientific baseline, a finite UTC landing-date grid, up to two additional sites, and mission constraints. Both engineering models must be enabled with explicit configuration. Mock opportunity requests are rejected; ordinary mock scenario analysis remains unchanged. Successful candidates retain complete ScenarioResult products and provenance. Failed candidates retain intended site/date, error descriptions, null metrics and indeterminate requirements; other rows continue.

The Mission Resilience page now provides original mission controls, +1/+3/+5/+7-day presets, signed custom hour/day shifts, explicit alternative UTC, restore-original, recalculation, opportunity search, filtering, transparent sorting, requirement evidence, metric differences, elapsed battery plots, actual UTC intervals, DTE classifications and scientific details. An optional draft callback from the existing controls ensures currently visible site/date/duration inputs are used before Run Analysis. Date inputs use input events so UTC edits persist through rerenders. Shared analysis behavior is retained.

Calculated opportunities can enter the existing ComparisonStore with their results, epoch-specific coordinates, observer height, duration, provider, hardware and terrain settings. Its three-scenario limit remains enforced; nothing is overwritten. Search state is temporary page state; leaving/reloading the page clears it. Transferred scenarios persist through navigation in the existing store.

## Algorithm, reference frames and reuse

1. Validate the baseline, dates, workload and explicit hardware. Calculate the original once.
2. Enumerate each allowed site and the inclusive regular landing-date grid. A latest date off the grid is not appended.
3. Preserve duration, sampling, observer height, terrain options and all hardware assumptions.
4. Candidate coordinates are declared in DE440/ME421 at the original landing epoch. Reuse the exact isolated NAIF bridge: if R(t) rotates DE440 into DEM-native DE421, u_native = R(t0) u_original and u_candidate(t) = R(t)^T u_native. Never merely relabel coordinates with a new epoch.
5. Recalculate time-dependent ephemeris at each candidate's actual epochs. Reuse a static terrain profile only for matching native observer/configuration and native position separation below 1 micrometer (floating-point reconciliation tolerance, not terrain accuracy). Height comes from the DEM and observer height is added once.
6. Reuse unchanged visibility classification and engineering functions; evaluate explicit requirements and alternative-minus-original numerical differences in Python.
7. Return completed, failed and insufficient-evidence counts, performance, cache reuse, errors and limitations. No weighted score, Pareto optimizer or global optimum is asserted.

There are at most **12 candidates plus the baseline**, **3 sites**, **30 days** of landing-date span and offset from the baseline, **7-day** mission intervals and **169 samples**. Existing terrain-ray workload limits still apply. One search runs at a time; a second active search receives RESOURCE_LIMIT. No database or background job system is introduced.

Request SHA-256 identities are stable for normalized contracts. Identical requests reuse immutable calculated results **within that search**. Profile caches are also scoped to the search, bounded by its sites; they are deliberately discarded between searches so changed datasets/kernels are reverified. Cross-search result persistence is not implemented. Work runs outside the event loop. Disconnects stop between candidates; an already running bridge/calculation drains safely before releasing the serial lock. The UI aborts transport and uses version guards on edits, cancellation and unmount.

## Requirements and classification

Each requirement returns its identifier, threshold, actual value or null, units, pass/fail/indeterminate, explanation, resolved provenance IDs and limitations.

- Maximum unmet demand / Wh; minimum battery SOC / percent.
- Explicit conservative-model pass; optionally test optimistic assumptions when conservative pass is not required. Without the pass requirement, users may explicitly allow nonzero unmet demand through their threshold. Such a result is never described as survival.
- Minimum Earth-center clearance requirement / degrees. DTE durations must have been calculated using at least that margin; a weaker baseline configuration fails this requirement and must be edited explicitly.
- Maximum sample-supported DTE interruption / seconds and minimum conditional access / seconds. Unknown communication intervals cannot pass. A known interruption exceeding a limit can establish a failure despite additional unknown time.
- Required mission duration / seconds, allowed site IDs and optional maximum spherical distance / meters. The date grid supplies earliest/latest landing constraints. Spherical distance uses the common native lunar frame and 1737400 m reference sphere, not an Earth CRS.

Unmet-demand threshold checks use the existing battery engine's **1e-8 Wh arithmetic tolerance**, explicitly disclosed. Other thresholds have no invented physical tolerance. Unknown values are never filled with zero.

Overall classifications: **meets_tested_requirements**, **conditionally_promising** (optimistic assumptions), **fails_modeled_requirement**, or **insufficient_evidence**. A known failure takes precedence over unknown requirements; unknown required metrics prevent a pass. Passing requirements does not establish safety or a working RF link. Sorts are individual metrics with unavailable rows/metrics last; users can filter classifications. No automatic suitability ranking is supplied.

## Executed NASA-derived demonstration

Full inputs, outputs, provenance, source hashes, constraint evidence and errors are in `validation/step-9-results.json`. These are new calculations using installed pinned SPICE and Site01 LOLA resources, not fabricated alternatives or new independent physical validation.

Original: **2026-11-14 00:00 UTC**, 24 hours; alternative: **2026-11-15 00:00 UTC**, 24 hours. Original DE440 coordinates are latitude **-89.46315760953222**, longitude **-137.50097847854008**. The observer remains fixed in native DE421 across dates. Observer height 2 m; 360 rays, 2500 m radius, 5 m radial step, 3600 s temporal sampling. Nearby candidate latitude adds 0.001 degree at the original epoch; a deliberately unsupported candidate uses -89 degrees / +42 degrees.

Hardware assumptions: 2 m² panel, efficiency 0.25, ideal Sun tracking, nominal 1361 W/m², system efficiency 0.9, derating 1; load 50 W, heater 0; battery 500 Wh, initial SOC 100%, reserve 10%, charge/discharge efficiencies 0.95; Earth clearance requirement 1 degree. Hardware is identical across dates and sites.

| Quantity | Original | One-day delay | Alternative minus original |
| --- | ---: | ---: | ---: |
| Initial geometric Sun elevation / deg | 1.501602765 | 1.389871591 | -0.111731173 |
| Initial geometric Earth elevation / deg | -5.036238915 | -3.931761317 | +1.104477597 |
| Conservative solar generation / Wh | 0 | 0 | 0 |
| Optimistic solar generation / Wh | 14698.8 | 14698.8 | 0 |
| Demand / Wh | 1200 | 1200 | 0 |
| Conservative minimum/final battery / Wh | 50 / 50 | 50 / 50 | 0 |
| Conservative minimum SOC / % | 10 | 10 | 0 |
| Conservative unmet demand / Wh | 772.5 | 772.5 | 0 |
| Optimistic minimum/final battery / Wh | 500 / 500 | 500 / 500 | 0 |
| Optimistic minimum SOC / % | 100 | 100 | 0 |
| Optimistic unmet demand / Wh | 0 | 0 | 0 |
| Conditional DTE access / h | 0 | 0 | 0 |
| Longest sample-supported DTE interruption / h | 24 | 24 | 0 |
| Unknown DTE sampled time / h | 0 | 0 | 0 |

Sun remains conditionally clear and Earth modeled obstructed in the supported sample intervals. Ideal tracking plus unchanged conditional illumination produces equal optimistic generation despite changed geometry; equality is an actual result, not evidence that dates were shifted without recalculation. Full finite-radius ray coverage is not globally complete terrain coverage.

Six site/date candidates were evaluated: **four calculated and failed the default modeled requirements; two outside the DEM were insufficient evidence**. No favorable alternative was found. Defaults require conservative pass, zero unmet demand, at least 10% SOC, 1-degree configured DTE margin, at most 3600 s interruption and at least 3600 s conditional access. The report records actual runtime/cache counts; they are machine-specific, not performance guarantees. Parent/native/child total memory was not measured in this milestone.

## Files and architecture

New backend files: `contracts/resilience.py`, `api/resilience.py`, `resilience/{__init__,constraints,service,site,validation}.py`, and `tests/test_resilience.py`. `main.py` registers the route. The only change to the existing visibility calculation is a typed optional terrain-loader boundary; its default path and equations are preserved. Ephemeris, terrain, power and communications engines, original providers/contracts, kernel/DEM manifests and both dependency locks are unchanged.

New frontend files: `types/resilience.ts`, `api/resilience.ts`, `lib/resilience.ts`, and `test/resilience.test.tsx`. Targeted edits complete `pages/Resilience.tsx`, expose optional shared-control drafts, reuse BatteryPlot with elapsed labels, add validated results to ComparisonStore, style this page and update the stale sidebar limitation text. `.gitattributes` stabilizes new scientific source hashes. Documentation: this report, architecture, setup, contributor notes and roadmap.

## Verification and recovery

Previous implementation session: **222 backend tests passed**, including the unchanged SPICE, LOLA and engineering regression cases and 27 resilience checks. **104 frontend tests passed**, including 13 resilience checks. Standalone TypeScript checks and the production build passed. The saved six-candidate real-data search took **30.6015562 s**, with one identical-result reuse and two static-profile reuses. A separate 12-candidate browser search completed eight calculations and four outside-DEM failures. These are historical executed results, not newly repeated suites.

Finishing session: reviewed existing source/contracts, cancellation/version guards, exact site-frame handling, thresholds, error paths, comparison transfer and all changed files. The saved report's source hashes still match the final calculation source. No backend/frontend implementation change was needed. Full test suites, TypeScript and the production build were deliberately **not rerun** because the finishing changes are documentation only. Git whitespace checks and source/build/privacy inspections were executed; no credential-pattern findings, production source maps or Python source in the frontend build were found. The existing Starlette/httpx TestClient deprecation warning remains historical; no unresolved test failure was found.

Current browser verification used the actual application through the local proxy. Both development servers had stopped after interruption; the initial request showed Failed to fetch. Starting the existing local FastAPI/Vite servers resolved it. One focused two-candidate search then completed in **12.30 s** as displayed by the UI: one supported delayed calculation and one deliberately outside the DEM. This did not repeat the six- or twelve-candidate searches.

For that focused check, the visible baseline draft was **2026-11-14 01:00 UTC**, duration **12 h**, with the same Site01/2 m observer and ideal-tracking hardware assumptions listed above; the alternative was **2026-11-15 01:00 UTC**. Verified +1-day preset, custom UTC editing, persistence of both date edits after other controls changed, actual recalculated geometry, **600 Wh** demand, **172.5 Wh** conservative unmet load, battery curves and the 12-hour sample-supported DTE obstruction interval. The supported row failed requirements; the outside-DEM row displayed OUTSIDE_COVERAGE, insufficient evidence and unavailable metrics, with transfer disabled. Individual constraint evidence displayed pass/fail states; unknown required evidence remained nonpassing.

Inspected the rendered page at **1280×900 desktop** and **390×844 mobile**. Mobile tables/plots retain their own horizontal scrolling; document width equaled viewport client width (382 px after scrollbar), so no whole-page horizontal overflow was observed. Temporary viewport overrides were reset. These are browser viewport checks, not a physical-device compatibility test. Transferred the supported alternative into the third Comparison slot and verified success status, actual 2026-11-15 01:00 UTC, 12 h duration, returned geometry, observer 2 m, 2500 m terrain radius, 3600 s sampling and all original hardware settings. Existing scenarios were preserved and further additions disabled at the three-scenario limit. Screenshots were saved outside the repository; no temporary browser artifacts are committed.

Focused tests cover signed/zero shifts, date intervals, identity, hardware preservation, recalculation dispatch, numerical deltas/units, explicit thresholds, conservative/optimistic outcomes, allowed nonzero deficits, unknown DTE/power, missing terrain, resource limits, partial failure, cancellation/serial drain, provenance, mock isolation and real saved fixed-location evidence. Frontend tests cover parsing, UTC calendar rejection, deltas, missing-data failures, sort order, request submission, labels and comparison transfer/limits.

No dependencies or new setup services are required. From `backend`, run `python -m lunascend.resilience.validation` with the existing locked science/terrain environment and restored pinned datasets to reproduce the finite real-data demonstration. Use the normal Vite/FastAPI loopback startup in SETUP.md. Fresh-PC and offline backup rehearsals remain unperformed.

Local recovery tag: **step-9-mission-resilience**. Resolve its exact commit with `git rev-parse step-9-mission-resilience`. No push, deployment, repository creation, publication, visibility or access change is part of this milestone.

## Remaining scientific limitations and stop boundary

All original limitations remain: finite terrain extent/resolution, gaps and unresolved features, center-only Sun/Earth, approximate sample-supported intervals, unpropagated terrain uncertainty, simplified PV/battery and constant heater assumptions, no complete thermal engineering, no antenna/ground-station/RF link budget, and no landing hazard/descent analysis. Conservative/optimistic illumination cases are tested assumptions, not proven physical bounds or guaranteed survival.

The next separately authorized milestone is **Step 10 — Interactive 3D Lunar Terrain Visualization**. Stop after Step 9; no Step 10 implementation is included.
