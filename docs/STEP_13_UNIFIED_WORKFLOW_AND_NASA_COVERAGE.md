# Step 13 — Unified mission workflow and evidence-based assessment

Status: implementation and source/data audit completed; final verification/recovery recorded below. No deployment or later milestone is included. The user's final instruction replaces the earlier two-view requirement: there is one workspace with expandable technical details.

## Connected workflow and page responsibilities

1. Dashboard starts with six actual Apollo and thirteen verified polar catalog locations, search and a custom-coordinate route. Selection retains native DE421 identity, source and optional source-pixel quality in shared state. The requested entry refinement uses a 30 px Marcellus heading, gold supporting text, a 121 px scrolling list, and no placeholder Site01 summary. The list keeps its own scroll on narrow screens.
2. Continue opens the existing Explorer at `#moon-viewer`; downward wheel/touch/keyboard navigation into the dashboard Moon section also opens that route. A user-input guard prevents automatic navigation during loading/restoration. No scientific calculation starts on navigation.
3. Explorer focuses on the selection, shows a gold/white annotation pin, then the view controls and technical detail. The pin draws after photographic tiles but respects globe occlusion. `+` and `−` retain accessible Zoom in/out names. The original logo, actual imagery, maps, local terrain and Surface View remain.
4. Analysis owns location/date/duration, terrain and hardware configuration, operational plots, All Mission Data and Final Mission Assessment. Valid input changes clear observations and cancel pending work. Date edits retain native catalog identity and use the existing exact conversion before calculation; no old result is relabeled. Draft dates are committed on leaving the date input. Compatible independent environmental calculations can be reused for hardware changes.
5. Comparison retains up to three independent calculated snapshots, with actual numerical differences. There are no prepopulated synthetic scenarios. Catalog names are represented correctly in scenario selectors. Comparison requests retain existing version guards, cancellation and deduplication.
6. Resilience uses the current mission summary instead of another mission configuration form. Shared thresholds and mandatory power/communications categories apply to its bounded delay/search request. Returning to assessment retains the original active mission; a delayed alternative does not silently replace it. The existing native-site shift model and search bounds remain.
7. Methodology owns detailed sources, validation and the researched-versus-installed coverage audit.

Dashboard's repeated mission form, Sun/Earth cards, full numerical results and preview comparison tables were removed. Explorer's duplicated result tables were replaced by the shared mission summary. Analysis's operational section retains timelines/charts while its comprehensive numerical table appears once in All Mission Data. Resilience keeps its necessary original/alternative evidence rather than hiding differences.

## State, boundaries and performance

`MissionContext` remains authoritative for current selection, options, result, sample index and requirements; `ComparisonStore` remains authoritative for independent alternatives. UI-only native/source metadata never enters the scientific site contract. Stale analysis, catalog conversion, coverage and assessment callbacks use existing/new abort guards.

- `POST /api/v1/terrain/coverage`: bounded lookup of installed, hash-pinned sources at exactly converted native coordinates. Four valid DEM neighbors are required. Preferred compatible data is tested first, then the larger original Site01 footprint and bounded polar windows. Equal 5 m spacing alone is not evidence of better effective accuracy. No unverified mosaic or remote download occurs.
- Run Full Analysis uses this check. With supported terrain it explicitly requests terrain, power and DTE with the existing hardware settings. Without terrain it retains geometry only, requiring an explicit surface-height assumption and coordinate confirmation. It reports why engineering is unavailable; the explanation is retained with the matching UI selection, not added as a fabricated backend measurement.
- `POST /api/v1/scenarios/assess`: interprets an already returned scientific result and explicit requirements; it does not launch ephemeris, terrain or simulations. Serialized computed interval durations are checked against UTC bounds before normal contract validation. Client results are interpreted, not independently authenticated or newly validated.
- A two-entry process-local environmental cache excludes hardware/DTE settings from its dependency key. It verifies configured ephemeris kernels, frame-bridge kernels, terrain checksums and manifests before every hit. Site/date/height/terrain changes change the key; changed/missing sources cannot reuse a stale result. Frozen results are composed with the existing engineering functions. Equations are unchanged.
- Production API and selectors reject mock analysis. The old generator remains isolated for software tests (`create_app(enable_test_mock=True)`), never as a scientific fallback.

## Complete mission record

All Mission Data presents actual returned geometric azimuth/elevation, native terrain coordinates, DEM/observer heights, horizon/clearance/classifications, ray/finite-radius coverage, solar W and Wh, demand W and Wh, battery Wh/SOC/reserve-related results, unmet demand, conditional DTE thresholds/durations and unknown time. Expandable sections retain original horizon arrays/distances, interval UTC bounds/resolution, shortage intervals, charging/discharging losses, curtailment and energy-accounting residuals. Native catalog quality values remain source-pixel context, not propagated errors or landing-safety evidence.

Hardware/sampling inputs, metric validation labels and original source provenance remain accessible. JSON export contains the complete unrounded returned result, requirements, selected mandatory categories and the current deterministic assessment. Exports are not signed validation certificates. Alternatives and delay differences remain in their existing dedicated workspaces, linked from assessment.

Missing means unknown, not zero. No-analysis, stale-input, calculation failure, missing configuration, outside installed coverage, missing resources and unsupported models have distinct workflow explanations. A genuine numerical zero remains visible. Unavailable global terrain, geology, thermal survival, RF link budget and full-disk mission illumination are explicitly identified.

## Assessment rules and ordinary-language explanation

Python reuses the existing requirement evaluator. Thresholds come from the actual mission settings. No suitability score or universal W threshold was added.

| State | Rule |
| --- | --- |
| Analysis not run | No current scientific result |
| Does not meet requirements | At least one definite mandatory failure, even with unrelated unknown evidence |
| Insufficient data | No definite failure, but missing mandatory evidence; also no selected evaluated mandatory criteria |
| Conditional | Required evidence passes only under the selected optimistic energy assumption, or relies on finite conditional access/clearance |
| Meets all evaluated mandatory requirements | Every selected evaluated mandatory criterion passes under the required conservative energy model; not mission-safety certification |

Resilience keeps its established labels while respecting the same selected mandatory categories; default API categories remain true for backward-compatible old requests. An existing shortage recorded before a later unknown interval can definitively fail the unmet-demand limit. It is labeled as a known-prefix lower bound, never a complete-period energy total.

Explanations cover what the angle/rate/energy represents, actual value, comparison with requirements, operational consequence, a supported setting/date/site to test next and scientific limitations/source IDs. Instantaneous generation is compared with the configured simultaneous load; a temporary deficit does not itself fail the whole mission. Battery sufficiency uses the existing energy trajectory and unmet-demand criterion (existing 1e-8 Wh arithmetic tolerance, not physical uncertainty).

The model stops discharge at the configured reserve. A result at 10% reserve with unmet load does **not** mean the battery went below reserve. Optimistic-only success is conditional and never guaranteed survival. Earth-center clearance and sampled access duration are not radio signal strength, contact reliability or a link budget. Positive clearance against finite sampled terrain is not guaranteed unobstructed sunlight.

## NASA data audit and actual integration

The machine-readable audit is `data/manifests/step13-source-audit.json`. Numerical source identities still come from the original manifests; this audit is not a second manually maintained set of dataset hashes.

| Source | Actual status |
| --- | --- |
| NASA/JPL SPICE | Existing active matched-kernel geometric engine; no equation change |
| Horizons | Existing 36 saved reference comparisons preserved, shared JPL heritage limits independence |
| Original LOLA Site01 | Existing full local 5 m source, bounded queries; never substituted at another coordinate |
| PGDA study-site products (78) | Existing thirteen native 325 m, 5 m DEM windows and source-pixel quality records, newly connected to coverage-aware workflow |
| PGDA illumination/Earth visibility (69) | Existing three 3.9 km, 60 m long-term windows near Site01; not selected-date illumination or center-only DTE |
| LROC / Moon Trek WMTS | Existing real archived photographic tiles in 2D and 3D context; not terrain or illumination calculations |
| Global LOLA / ODE | Catalog researched, no global DEM installed |
| SLDEM2015 (54) | Researched official ±60° product and large tiles; **not installed** |
| PGDA regional DEMs (90), 87–90°S DEM (81) | Researched DE421 polar products; **not installed** |
| Apollo stereo DTMs | Existing source metadata retained; exact local frame/vertical registration not established, so no Apollo terrain ingestion |
| Diviner | Official RDR 3.1 and thermal map references researched; no thermal model/data integration |
| USGS geology | Reference retained; official homepage retrieval returned HTTP 403; no geology layer integrated |

No additional large scientific archive was downloaded in Step 13. Existing source credits, usage conditions, manifests and restoration instructions remain. Cite product-specific authors if using researched datasets later; NASA/CSA/JPL/USGS non-endorsement applies. Installed science operates locally. Uncached photographic tiles and optional external references require network; they do not supply numerical analysis.

Source links: [SLDEM2015](https://pgda.gsfc.nasa.gov/products/54), [regional polar products](https://pgda.gsfc.nasa.gov/products/90), [87–90°S](https://pgda.gsfc.nasa.gov/products/81), [study sites](https://pgda.gsfc.nasa.gov/products/78), [long-term polar model](https://pgda.gsfc.nasa.gov/products/69), [Diviner](https://www.diviner.ucla.edu/data). See the existing `OFFICIAL_RESOURCES.md`, terrain/imagery documentation and manifests for source-specific attribution.

## Executed real examples

`docs/validation/step-13-results.json` records fresh API requests and returned values, produced by `scripts/verify_step13.py`. These are evidence, not production constants or new external validation. Each example returned 25 samples.

| Example | Initial Sun elevation | Initial Earth elevation | Optimistic solar / unmet demand | Assessment |
| --- | ---: | ---: | ---: | --- |
| Original Site01, Nov 14 2026 | 1.501603° | −5.036239° | 371.364126 / 401.135874 Wh | Does not meet requirements |
| Same native Site01, Nov 15 | 1.389871° | −3.931761° | 343.414494 / 429.085506 Wh | Does not meet requirements |
| Apollo 15, Nov 14, explicit hypothetical 0 m height | −30.041654° | 67.685175° | Not calculated without terrain | Insufficient data for required power |
| Nobile Rim 1, Nov 14 | 1.610707° | −1.080279° | 531.716025 / 240.783975 Wh | Does not meet requirements |

Site01 initial Sun clearance was +6.114150922° and Earth clearance −6.016613385°. Conservative solar was genuinely 0 Wh and unmet demand 772.5 Wh. Both battery cases stopped at 50 Wh / 10% reserve; they did not dip below reserve. The second-date value uses the fixed native observer conversion rather than relabeling the original context coordinate. Both dates/locations remain conditional finite-center models.

At 10°N, 10°E the installed terrain selection correctly returned no supporting DEM. No broader terrain assessment was invented. Low-load conservative pass, optimistic-only conditional pass, missing battery evidence, no communications requirement, empty analysis and failure-before-unknown cases are covered by backend tests using saved real environment evidence with explicit test-only hardware variants.

## Verification and recovery

Initial Step 13 session: full backend 308 tests passed; frontend 188 passed, then 194 after assessment boundary tests; TypeScript and production build passed. Subsequent changes received targeted backend/frontend checks; final results and browser evidence are recorded in the final verification note below. Existing Starlette/httpx deprecation and Vite large-chunk advisories are not scientific failures.

Executed browser journey before the interruption: Apollo 15 → Explorer focus → 25-sample geometry → insufficient power evidence → Comparison; Nobile → correct `pgda-site06-5m-window-v1`, 5947.434082 m terrain, actual horizon/power → independent comparison; one-day Nobile delay → same native location/hardware → fresh 25-sample result. Nov 15 Nobile optimistic energy was 773.071867 Wh with 0 Wh unmet demand, minimum battery about 50.60 Wh / 10.12%; conservative unmet remained 772.5 Wh, so a conservative mandatory requirement still failed. DTE access changed to 86400 s under the selected 1° margin. No radio-link/survival guarantee.

The final resume additionally verifies requested compact typography/layout, visible annotation marker, scroll-to-Explorer transition, and navigation after those changes. Browser-only details are not inferred from unit tests. Final screenshot/evidence and exact verification results are recorded below.

Local checkpoint `a41c533` preserves initial unified workflow/assessment implementation. Final recovery tag: `step-13-unified-mission-workflow` (created only after final review). No push/deployment is authorized or performed.

## Remaining limitations

No global DEM, registered Apollo local terrain, thermal/geological safety assessment, RF link budget, sub-sample outage guarantees or propagated terrain uncertainty. Finite terrain can miss distant/unsampled obstructions. Source-pixel slope/RMS is not landing-hazard certification. Missing hardware evidence cannot pass mandatory energy requirements. A mission with no selected mandatory criteria remains unassessed. Comparison storage is in memory and clears on reload; JSON export is the explicit portable record. No later milestone started.


## Final verification after resume (November 15, 2026)

- 101 targeted backend tests passed after the final assessment/requirements/cache changes: assessment, resilience, engineering, API, mock isolation and source registry. The earlier full 308-test run remains historical evidence for unchanged scientific modules.
- All 194 frontend tests passed; explicit TypeScript check and production build passed after the requested layout/marker changes. Vite's existing >500 kB chunk advisory remains. No production source maps were generated.
- Offline source catalog and preserved validation identities passed `build_source_registry.py --check`.
- Repeated final browser journey: Apollo 15 geometry and insufficient power evidence; independent Apollo/Nobile comparison; Nobile's correct DEM/height/horizon; one-day delay recalculation; return to original active mission; original Site01 full analysis and assessment.
- 55 Site01 DOM numerical fields matched the actual downloaded JSON export, including genuine zeros, instantaneous W, totals Wh, reserve-clamped battery values, native terrain and DTE fields. Export contains 25 observations and a failed mandatory energy assessment. See `docs/validation/step-13-browser.json`.
- Both marker category controls remained available. Selected-site pin/focus, custom-coordinate navigation, accessible zoom controls and guarded downward-scroll transition were inspected in the actual browser. Existing automated pick/frame/stale-response tests passed.
- Measured desktop styles: Marcellus/Georgia/serif, 30 px heading, white `rgb(240,238,233)`, detail gold `rgb(242,219,170)`, catalog height 120.993 px. Marcellus loaded locally. Scope is component-wide, not tied to the annotation's viewport.
- Mobile Dashboard and Resilience at a requested 390 px viewport had 382 px body/client width and 382 px scroll width: no horizontal body overflow. The list uses one column and its own 121 px scrolling region. Temporary viewport override was reset. Captured browser console errors: none.
- A stylesheet punctuation error found during the resumed build was corrected and the successful build rerun; the scroll listener was guarded against non-user loading/restoration events. Temporary edit/debug scripts were removed. These are UI corrections, not changed scientific equations.

Final source/data coverage limits remain as listed above. No SLDEM2015, global DEM, geology or thermal dataset is claimed as newly installed. Stop after Step 13.
