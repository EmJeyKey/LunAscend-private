# Step 8 — conditional solar power, battery energy and DTE access

## A. Implementation status

Implemented explicit photovoltaic/battery and direct-to-Earth (DTE) engineering options through the existing `POST /api/v1/scenarios/analyze` route. The scientific provider composes one existing terrain/geometry result with independent `power/` and `communication/` calculations. Engineering can also replay the saved environment without recalculating a terrain horizon. Existing SPICE, terrain, visibility and mock engines, scientific references, kernel/DEM manifests, dependency locks, logo and locally bundled fonts remain unchanged.

Additions include typed hardware/result contracts, bounded configuration validation, shared time-support checks, analytical tests, runtime frontend response validation, compact Analysis controls/readouts, battery energy/SOC plots, and engineering comparison summaries. Mock engineering requests are rejected rather than silently promoted to scientific analysis. Missing requested terrain produces a structured error and no engineering products. Ordinary geometric-only and mock requests retain their previous behavior. The landing-delay page remains an explicitly noncalculating preview; Step 9 is not implemented.

The interrupted implementation was preserved. Completion work reviewed the changes and saved evidence, repeated focused tests, added this report and setup/roadmap notes, and prepared the requested local recovery commit. Source line-ending rules preserve saved SHA-256 evidence across Windows checkouts; no calculation was rewritten.

## B. Power and battery equations

For each supported interval, use its actual UTC duration `dt_h = (end - start) / 3600`, not an assumed one-hour step:

```
P_solar = G * A * eta_panel * eta_system * derating * incidence * illumination
P_load  = baseline_load_w + heater_load_w
P_net   = P_solar - P_load
```

Fixed-horizontal incidence is `max(0, dot(Sun_unit_ENU, (0,0,1)))`, equivalent to the positive sine of local Sun elevation. The normal is radial local up, not a measured terrain slope. Ideal Sun tracking instead uses incidence 1, with no modeled pointing/slew/actuator limits.

Let `S=P_solar*dt_h`, `D=P_load*dt_h`, battery energy `E`, capacity `C`, reserve `E_min=C*minimum_soc_pct/100`, and efficiencies `eta_c`, `eta_d`:

```
direct_solar = min(S, D)
surplus = S - direct_solar
charge_bus_input = min(surplus, (C - E) / eta_c)
internal_charge = charge_bus_input * eta_c
charging_loss = charge_bus_input - internal_charge
curtailed = surplus - charge_bus_input

deficit = D - direct_solar
internal_discharge = min(E - E_min, deficit / eta_d)
battery_delivered_to_load = internal_discharge * eta_d
discharging_loss = internal_discharge - battery_delivered_to_load
unmet_load = deficit - battery_delivered_to_load
E_next = E + internal_charge - internal_discharge
```

Numerical guards enforce capacity/reserve without hiding unmet demand. Battery charged/discharged totals describe **internal** energy, distinct from electrical energy delivered to the bus/load. Conservation checks use:

`E_initial + solar = demand - unmet_load + E_final + charging_loss + discharging_loss + curtailed`.

## C. Assumptions and sampling

Hardware parameters are user assumptions: active area, panel efficiency, constant irradiance, orientation mode, conversion efficiency, derating, baseline/heater load, capacity, initial/minimum SOC, and charging/discharging efficiencies. Inputs reject nonfinite/out-of-range values, zero charging/discharging efficiency, and initial SOC below the configured reserve. Capacity spans 0 to configured Wh; minimum SOC is an additional enforced reserve. The default 1361 W/m² is explicitly a configurable nominal assumption, not a measured lunar-site value or a distance-scaled SPICE measurement.

Conservative illumination denies conditional sunlight. Optimistic illumination permits conditional center clearance only; modeled obstructions deny generation in both cases. Indeterminate or unavailable terrain/geometry is **not** fabricated as clear sunlight: unsupported intervals break the battery trajectory and withhold complete-period totals and success classification. Later supported solar samples may still be displayed, but a battery trajectory is not restarted after an unknown gap. Configured total demand remains known independently of environmental coverage.

Generation/access use a documented left-sample hold over supported intervals, requiring usable states at both endpoints. Timestamps must be strictly ordered and in range. Actual irregular durations and shorter final intervals are supported. Missing period endpoints or gaps exceeding the requested sampling interval remain unknown. Stored-sample plot connections are visual guides, not verified sub-sample dynamics. Potential-depletion outputs bracket intervals containing unmet load rather than claiming an exact depletion timestamp. Hourly sampling can miss short outages or changes; no high-resolution battery accuracy is claimed.

Cases are tested assumptions, **not** statistical confidence intervals, physically guaranteed lower/upper bounds, or guaranteed mission survival. Outcomes distinguish passing both tested cases, passing only optimistic, failing both, indeterminate and unavailable.

## D. Actual SPICE/LOLA example

[Request](../backend/examples/engineering-request.json), [fresh environment report](validation/step-8-results.json), [saved-environment replay](validation/step-8-replay-results.json).

Environment: NASA LOLA Site01 `lola-site01-5m-v2020`, 5 m pixels, 2500 m search radius, 360 azimuth rays, 5 m radial sampling. Native DE421 latitude approximately -89.463157757°, east-positive longitude -137.501984908°. Input DE440/ME421 coordinates are explicitly anchored at 2026-11-14 00:00 UTC; the existing exact per-epoch frame bridge is retained. DEM surface elevation is approximately 1944.767 m, with observer height 2 m above that surface, added once. The period ends 2026-11-15 00:00 UTC and contains 25 hourly observations. All horizons remain globally partial and terrain visibility independently unvalidated.

Assumed hardware: 2 m² active panel area, panel efficiency 0.25, ideal Sun tracking, nominal irradiance 1361 W/m², conversion efficiency 0.9, derating 1, baseline load 50 W, heater load 0 W, battery capacity 500 Wh, initial SOC 100%, reserve SOC 10%, charging/discharging efficiencies 0.95/0.95. Required Earth-center clearance is 1°.

| Quantity | Conservative | Optimistic |
| --- | ---: | ---: |
| Estimated PV power at supported samples / W | 0.00 | 612.45 |
| Solar energy generated / Wh | 0.00 | 14698.80 |
| Electrical demand / Wh | 1200.00 | 1200.00 |
| Solar supplied directly to load / Wh | 0.00 | 1200.00 |
| Internal battery energy charged / Wh | 0.00 | 0.00 |
| Internal battery energy discharged / Wh | 450.00 | 0.00 |
| Charging loss / Wh | 0.00 | 0.00 |
| Discharging loss / Wh | 22.50 | 0.00 |
| Curtailed surplus / Wh | 0.00 | 13498.80 |
| Final and minimum battery energy / Wh | 50.00 | 500.00 |
| Minimum SOC / % | 10.00 | 100.00 |
| Unmet load / Wh | 772.50 | 0.00 |

Both cases have complete support on the requested time grid, which does not establish global terrain completeness or continuous environmental accuracy. The result is `pass_optimistic_only`. Maximum recorded absolute energy-balance residual is about 1.82e-12 Wh, a floating-point accounting check rather than physical accuracy. The optimistic battery begins full, so surplus is curtailed instead of creating a fictitious charging-energy total.

## E. DTE results and classifications

The model preserves five distinct states: modeled Earth-center obstruction, conditional center clearance below the equipment requirement, conditional access satisfying that requirement, indeterminate terrain, and unavailable data. Failure to meet an equipment margin is never relabeled physical terrain obstruction.

In the recorded Site01 example, Earth-center clearance changes from approximately -6.017° to -4.865°; all returned samples show modeled obstruction. The left-hold result therefore has **0 h conditional DTE access**, **24 h longest sample-supported interruption**, and **0 h unknown time** on this grid. The obstruction interval is censored by the period boundaries. These are approximate finite-terrain, center-based access estimates, not a guaranteed communication blackout or usable radio link. Unknown intervals terminate interruption support and are not counted as access or known interruption. Link-budget values remain null and `link_availability=not_modeled`.

## F. Integration and provenance

`AnalysisSettings` receives optional hardware configurations; `PowerAnalysis` and `CommunicationAnalysis` gain backward-compatible engineering fields. Configuration is explicit, ordinary requests do not calculate engineering, and no new endpoint is introduced. Saved-environment replay requires matching site, time interval, observer height, frame and terrain settings and matching geometry/terrain timestamps. Environmental provenance is retained; additional power/DTE provenance records identify model versions, configuration SHA-256 and limitations. All real engineering results remain unvalidated; prior Horizons agreement does not validate power or radio performance.

Analysis exposes configuration, separate illumination cases, full accounting totals, battery energy/SOC timelines, deficits, DTE clearances/margins/windows and unknown time. Existing scientific plots, sample selection, typography, palette and logo are retained. Comparison displays each scenario's hardware, sampling, energy outcomes and conditional DTE estimates without automatic superiority rankings or unsupported cross-configuration deltas. Frontend validation checks configuration identity, timeline order, energy balance, capacity/SOC, classifications and absent link budgets.

## G. Executed verification

- Previous implementation session: **195 backend tests passed**, including all original scientific/terrain/visibility tests and 27 new engineering cases. **91 frontend tests passed**, including 15 new engineering tests. TypeScript checks and production build passed.
- Completion session: repeated only the **27 engineering backend tests** and **15 engineering frontend tests**; both passed. The original source hashes match the saved reports, so expensive scientific regressions and real terrain calculations were not unnecessarily repeated.
- Analytical coverage includes constant solar/load, darkness, zero generation parameters, horizontal/tracking incidence, charging/discharging efficiency, full/minimum battery, unmet load, conservation, irregular and incomplete time support, both assumptions, all DTE states, mock separation, API validation and provenance. The first targeted backend run exposed a test-fixture datetime JSON-serialization error; the first targeted frontend run exposed a capitalization-only text assertion. Both were corrected before the successful runs; no scientific references were changed.
- [Executed live API checks](validation/step-8-api-check.json): engineering 200; missing dataset 503 with no engineering products; geometric-only 200; mock engineering rejected 422; explicit ordinary mock 200.
- Actual browser verification in the implementation session: loaded Site01, confirmed frame, enabled power/DTE, selected ideal tracking and ran the real analysis. Inspected rendered engineering totals and the battery plot at the existing window size. Moving the existing sample slider to the final UTC sample updated engineering/DTE readouts. Navigation to Comparison succeeded; a completed browser comparison run and additional mobile viewport checks were not executed before interruption. Comparison output is covered by frontend rendering tests.
- The existing Starlette/httpx TestClient deprecation warning remains; no unresolved test failure was observed. No new browser verification is claimed for the completion session.

## H. Performance, portability and recovery

Recorded fresh-environment execution: approximately **3.9235 s**; saved-environment replay: **0.0238 s**. Parent Python tracked peaks were 62,959,776 and 1,057,547 bytes respectively. Tracemalloc excludes GDAL native caches and isolated worker RSS, so these are not total-memory measurements.

No dependencies or scientific manifests changed. Restore the existing locked science/terrain extras and pinned data as documented in SETUP.md and TERRAIN_DATA.md. From `backend`, reproduce a fresh scenario with `python -m lunascend.power.validation`; replay the saved environment with `python -m lunascend.power.validation --saved-environment ../docs/validation/step-7.5-results.json`. Replay uses saved derived inputs and does not recalculate geometry/horizon. A fresh Windows-PC restore rehearsal remains unperformed.

Local recovery tag: **`step-8-power-communications`**. Resolve its commit with `git show --no-patch step-8-power-communications`. Stage source, tests, small requests/reports and documentation only; scientific binaries and environments remain ignored. No push, deployment, publishing or repository-access change is authorized or performed.

## I. Remaining limitations and stop boundary

Finite terrain coverage, unresolved narrow/far-field features, center-only bodies, unpropagated DEM uncertainty and coarse environmental holds limit all estimates. No partial disk illumination, spacecraft self-shadowing, dust/thermal PV variation, battery aging, battery power/current limits, electrical transients, antenna/ground-station model or radio link budget is included. Constant heater load is an input assumption, not a thermal model. Independent physical engineering validation, mobile browser checks and another-PC restoration remain outstanding.

Step 8 is complete at this boundary. The next separately authorized milestone is **Mission Resilience and Landing-Delay Analysis**. Step 9, optimization and a 3D viewer have not been started.
