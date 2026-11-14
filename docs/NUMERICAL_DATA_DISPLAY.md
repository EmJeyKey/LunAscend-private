# Numerical data display and integration correction

This is a focused follow-up to Step 11.7, not a visual redesign or new scientific
milestone. Backend engines, contracts, imagery, original reference reports, manifests,
fonts, logo and dependency locks are unchanged.

## Root causes and corrected data flow

The API already returned the relevant fields and `parseResult` retained them. Most
missing values were presentation omissions or unrequested optional calculations:

- Simple view hid geometry and terrain numbers behind technical disclosures.
- Dashboard's compact conditions excluded power summaries; its scenario cards always
  rendered `— h` and “results unavailable,” even for calculated scenarios.
- Explorer displayed classifications but not the matching complete numerical result.
- Saving an already analyzed mission to comparison created an empty scenario copy.
- Engineering flags defaulted off. A normal analysis correctly omitted those products,
  but the workflow did not clearly distinguish that from missing data.
- The frontend discarded structured error codes after requests failed; generic error
  wording conflated offline service, absent datasets and outside-coverage locations.

`NumericalResults` now presents exact returned fields in both Simple and Advanced.
`EngineeringNumbers` supplies the same instantaneous/totals table to Analysis,
Dashboard, Explorer, Comparison and calculated Resilience results. Native DE421
terrain horizons/clearances remain distinct from public DE440/ME421 geometric angles.
Selected time is matched by UTC; no neighboring sample substitutes for a missing one.
Zero remains numeric; null has an explicit reason. Graphs still use backend W/Wh.

Scenario cards consume their own stored results and show actual arrival elevations,
not invented sunlight durations. Comparison preserves matching results through its
existing validated `addResult` boundary; uncalculated configurations stay uncalculated.
Geometric differences and engineering comparisons are visible in Simple, and
Resilience's numerical differences are expanded initially. Methodology retains its
saved source/validation numbers; it does not pretend to calculate a live mission.

## Endpoint and field audit

Frontend requests use the existing `/backend` proxy to these local backend routes.

| Page / product | Endpoint and authoritative fields | Availability |
| --- | --- | --- |
| Dashboard, Analysis, Explorer mission readouts | `POST /api/v1/scenarios/analyze`; `observations[].time_utc`, `sun_azimuth_deg.value`, `sun_elevation_deg.value`, corresponding Earth fields | Requires an explicit scientific run, valid frame/height and installed kernels. |
| Terrain mission values | Same endpoint; `terrain_visibility.surface_elevation_m`, `observer_height_m`, native coordinates, `observations[].sun/earth.horizon_elevation_deg`, `clearance_deg`, `classification`, `coverage`; `horizon` | Requires `terrain_enabled`, supported Site01 DEM and exact epoch/frame bridge. |
| Power/battery | Same endpoint; `power.cases[]` selected by `assumption`; `samples[].solar_generation_w`, `load_w`, `battery_energy_wh`, `soc_pct`; `totals.*` Wh and minimum SOC; `outcome` | Requires scientific terrain, `power_enabled`, panel/battery/load/efficiency options. |
| Conditional DTE | Same endpoint; `communication.access_samples[]`, required clearance, `earth_visibility_duration_s.value`, `longest_interruption_s.value`, `unknown_duration_s`, windows | Requires `communication_enabled` and an explicit equipment clearance. No RF strength or validated link budget. |
| Scenario Comparison | Independent existing analyze requests and stored results; presentation differences use corresponding scenario fields | Up to three scenarios. No silent reuse under edited inputs; compatibility rules/assumptions remain. |
| Resilience | `POST /api/v1/resilience/search`; `baseline`, `opportunities[].result`, `differences`, constraints | Explicit bounded recalculation; not the `ScenarioResult.resilience` field, which remains unsupported/null. |
| Explorer local terrain | `POST /api/v1/terrain/mesh`, `/inspect`, `/horizon`; returned native surface/observer geometry, original DEM elevation and horizon samples | Loading a mesh/image alone does not perform mission power or visibility analysis. |
| Explorer photographs | Existing imagery catalog/tiles/anchor endpoints | Optical pixels are separate from elevation and numerical mission calculations. |
| How It Works | Local source catalog and preserved saved Horizons comparisons | Archived evidence, not a new live validation. All 36 residual rows remain unchanged. |

## Workflow and missing-data distinctions

**Run Analysis** still uses the selected options and now states which products are
enabled. **Run Full Analysis** explicitly requests terrain, power/battery and DTE for
the visible site/date using the existing hardware settings (existing defaults if not
edited). It does not change provider, coordinates, time, frame confirmation or hardware
silently, and never starts an opportunity search. Scientific coordinate confirmation
and request validation remain mandatory. Hardware parameters remain user assumptions.

Changing inputs clears existing values and cancels/version-guards pending requests.
Nothing runs just because a site/date was selected. A successful result updates shared
state, visible numerical tables, selected-time summaries and the existing graphs.

| Case | Display / behavior |
| --- | --- |
| A: Not run / edited inputs | Run analysis; previous results explicitly cleared after edits. |
| B: Service offline/interrupted | Scientific analysis service unavailable; no old or mock result. |
| C: Dataset/software absent or invalid | Required local dataset/software missing; preserved structured API errors provide details. |
| D: Outside coverage / no valid pixels | Explicit terrain coverage explanation and `OUTSIDE_COVERAGE` detail. The failed full request produces no numbers; no automatic geometry-only fallback. |
| E: Product not requested | Explains which setting/Full Analysis action is needed. |
| F: Incompatible API payload | Explains that data were returned but not accepted; strict validation remains. Previously omitted valid fields now map to visible components. |
| G: Unsupported quantity | Radio signal strength and link performance are not calculated. No fabricated RF percentage, whole-disk illumination, global visibility or mission-survival guarantee. |

## Executed numerical verification

Real scientific browser runs used the documented Site01 coordinates, 2 m observer,
24-hour duration and 3600 s sample step, yielding **25 samples each**. Both runs used
the same entered DE440/ME421 coordinates, anchored separately at their selected start
epochs by the existing bridge. The Resilience workflow retains its existing fixed
native-observer semantics; no frame or date equations were modified.

Hardware: 2 m² fixed-horizontal panels, 25% panel efficiency, 1361 W/m² assumed
irradiance, 90% conversion efficiency, derating 1, 50 W load, no heater, 500 Wh initial
full battery, 10% reserve, 95% charging/discharging efficiencies; DTE margin 1°.
These differ from the older *ideal Sun-tracking* example; smaller generation is
expected from the selected orientation and is not a missing-data substitution.

| Returned quantity | Nov 14 00:00 UTC | Nov 15 00:00 UTC |
| --- | --- | --- |
| Initial Sun / Earth elevation | +1.501603° / −5.036239° | +1.389871° / −3.931761° |
| Initial Sun / Earth terrain clearance | +6.114151° / −6.016613° | +5.584583° / −4.863736° |
| DEM surface elevation | 1944.767090 m | 1944.767703 m |
| Initial optimistic solar power | 16.049198 W | 14.855249 W |
| Optimistic solar energy | 371.364126 Wh | 343.414494 Wh |
| Optimistic unmet demand | 401.135874 Wh | 429.085506 Wh |
| Conservative generation / unmet demand | 0 Wh / 772.5 Wh | 0 Wh / 772.5 Wh |
| Demand / minimum and final battery energy | 1200 Wh / 50 Wh in each case | 1200 Wh / 50 Wh in each case |
| Minimum battery SOC / model outcome | 10% both / fail both | 10% both / fail both |
| Conditional DTE access / supported interruption | 0 s / 86400 s | 0 s / 86400 s |

At Nov 14 01:00 UTC, selected battery energy updated to 447.368421 Wh conservative
and approximately 464.26 Wh optimistic, with corresponding SOC and W values. The
Sun remains conditionally clear within evaluated terrain; Earth is modeled obstructed.
Neither result establishes radio performance, global visibility or guaranteed survival.

`scripts/verify_numerical_display.py` compared fresh local API results against browser
DOM field captures at Nov 14 00:00, Nov 14 01:00 and Nov 15 00:00 UTC. **Each state
matched 39 raw numerical fields, their rounded visible text/units, 100 solar/battery
graph points and 50 Sun/Earth timeline classifications**. Evidence is saved in
[`validation/numerical-display-check.json`](validation/numerical-display-check.json).
This is an executed data-flow regression, not new independent physical validation.
The script accepts `--browser-trace-dir` for read-only DOM captures named in that
report; it does not drive the browser. Temporary captures/screenshots remain outside Git.

Browser inspection also verified all six routes, numerical readouts in both modes,
Dashboard/Explorer selected UTC, calculated-result transfer, two-date comparison
(optimistic solar difference −27.95 Wh), actual scenario-card elevations, one-day
Resilience recalculation with both sets of numerical values, and unchanged source links.
Editing the date removed all readouts before recalculation. A real latitude 0° full
request returned `OUTSIDE_COVERAGE`; the UI showed the precise coverage explanation
with **zero numerical readouts, timeline marks or power curves**. No mock analysis
was used. No console warnings/errors were captured before that expected failing request.

**174 frontend tests passed**, including nine new numerical/request/error/transfer
checks. TypeScript and production build passed. The existing large-chunk warnings
remain. Source-catalog/evidence identity check passed. No backend source changed;
no full backend regression suite was rerun. Backend-offline, missing-dataset and
incompatible-payload distinctions have focused frontend tests; datasets were not
removed and the user's backend was not stopped to simulate outages.

Narrow-screen/GPU/physical-offline acceptance was not repeated in this data-integration
task. Existing finite coverage, sample spacing, conservative/optimistic assumptions,
unverified optical-to-DEM tie and scientific validation scope remain. No push, deployment,
new scientific model or later milestone is included.
