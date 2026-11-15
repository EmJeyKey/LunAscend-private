# Site01 graph verification before demonstration

Executed 2026-11-15. This is a frontend graph/data integration repair, not demonstration polishing or a new scientific milestone. Backend equations, kernels, DEMs and contracts were not changed.

## Findings and corrections

- The first inspected browser session held Apollo 11 geometry-only results: 25 valid SPICE observations, no registered terrain and power/DTE disabled. Missing electrical/horizon products were correctly absent. Loading the documented Site01 example, confirming its frame and explicitly choosing Run Full Analysis returned all supported products. The prior terrain-preflight repair remains intact; graphs never silently request expensive calculations.
- Geometric elevation mapping already consumed the correct SPICE fields. Its hardcoded ±90° axis compressed the polar example into nearly flat lines. The plot now derives its displayed range from actual returned elevations, with padding and zero retained; all 25 samples have visible markers and exact UTC/value inspection. Missing samples still break paths. This is axis scaling, not a scientific transformation.
- Electrical load (`power.cases[*].samples[*].load_w`) was available but not graphed. It now has an actual UTC series alongside conservative/optimistic solar generation. Stored battery energy and charge retain their existing backend trajectories and now expose per-sample inspection points.
- The native 360° horizon graph existed only in Explorer. Analysis now reuses that component with `result.horizon` and the selected native DE421 Sun/Earth row. It is not combined with DE440 geometric elevations. Finite coverage and missing-ray qualifications remain visible.
- Graphs were scattered between the main summary and a disclosure buried below the full numerical report. Plain-language conclusions now precede one **View Scientific Details** disclosure, which contains geometric elevation, visibility timelines, native horizon and engineering plots. Complete numerical tables remain below it.
- Fixed minimum SVG widths clipped complete UTC plots in the actual desktop column. Scoped Analysis rules fit them into normal desktop widths; minimum plot widths of 360 px (electrical/battery) and 420 px (horizon) retain horizontal scrolling on very narrow phones. No navigation or branding redesign.
- The old elevation description said “above” the geometric horizon even when Earth was below it. It now says “relative to”.

## Actual browser scenario

Site01 original Connecting Ridge observer: DE440/ME421 input −89.46315760953222° N, −137.50097847854008° E. Native DEM is `lola-site01-5m-v2020`, 2 m observer above its original DEM surface, 2500 m evaluated horizon radius, 360 azimuth rays, 5 m radial step. November 14 2026 00:00 UTC through November 15 00:00 UTC, hourly, 25 samples including endpoints.

Hardware: 2 m² fixed-horizontal panels; 25% panel efficiency; 1361 W/m² irradiance assumption; 0.9 system efficiency; 50 W baseline + 0 W heater; 500 Wh battery, 100% initial charge and 10% reserve; 0.95 charge/discharge efficiency; 1° DTE margin. All three optional products enabled by the explicit Full Analysis action.

| Returned quantity | Initial UTC | Final UTC |
| --- | --- | --- |
| Sun geometric center elevation / ° | 1.501602765 | 1.389871591 |
| Earth geometric center elevation / ° | -5.036238915 | -3.931761317 |
| conservative solar generation / W | 0.000000000 | 0.000000000 |
| conservative electrical load / W | 50.000000000 | 50.000000000 |
| conservative stored battery energy / Wh | 500.000000000 | 50.000000000 |
| optimistic solar generation / W | 16.049198495 | 14.855254310 |
| optimistic electrical load / W | 50.000000000 | 50.000000000 |
| optimistic stored battery energy / Wh | 500.000000000 | 50.000000000 |

Initial native Sun horizon −4.612548157° and clearance +6.114150922°: conditional center clearance within modeled coverage. Earth horizon +0.980374470°, clearance −6.016613385°: modeled obstruction. Optimistic generation does not meet the 50 W load throughout this example; battery reaches its 50 Wh reserve. Neither case meets configured energy requirements. No survival or radio-link guarantee.

## Executed verification

- Used the existing real in-app browser tab, loaded Site01 through the UI, confirmed the reference and ran Full Analysis. Exported the actual browser numerical record using the application download control.
- Read the rendered SVG points, coordinates, paths and computed stroke/fill styles from the DOM. `scripts/verify_graph_browser.py` compared them to that downloaded API record and confirmed its observations, horizon, terrain, power and communication products equal the independently saved Site01 API evidence.
- **612 plotted points** match returned values, UTC/azimuth and plotted coordinates. Floating serialization tolerance is 1e-14 relative / 1e-12 absolute; coordinate tolerance 1e-8 SVG units. All **10 curve paths** match their plotted samples (0.0006 SVG-unit tolerance for the existing three-decimal path formatting). This includes genuine zero conservative generation and the constant 50 W load.
- Selected the final UTC with the existing sample slider: geometric tooltip, plain-language summary, power cursors and native horizon markers synchronized to November 15 00:00 UTC. Restored the initial UTC.
- Visually inspected elevation curves, local horizon, solar generation, load, stored battery energy and state of charge. Saved screenshots outside the repository. No mock state or hidden browser-state injection used.
- Repeated from a clean page reload after implementation: 25 samples, 612 points, 10 curves, all graph SVGs visible, **zero new console errors**. Earlier retained development-reload errors existed in the browser log; the clean-run check uses a new timestamp boundary rather than claiming the historical log was empty.
- **207 frontend tests passed** (22 files), including three new actual-result graph tests and existing null-gap, true-zero, request-scope, stale-response, numerical and scientific-boundary regressions. TypeScript and production build passed. Existing >500 KB bundle advisory remains.
- No backend source changed in this task; the prior audit's 113 backend regression/availability/selection checks are historical evidence, not tests rerun here. No costly scientific search or new external validation was performed.

Evidence: `docs/validation/graph-browser-points.json`, `graph-browser-check.json`, `graph-final-sample.json`, `graph-clean-load.json`; reference API products in `sun-earth-audit.json`. Reproduce the comparison with the installed backend Python running `scripts/verify_graph_browser.py <downloaded-browser-export.json>` from the repository root.

Limits: plots connect returned samples, not a new continuous solution. Missing values remain gaps. Terrain horizons are finite and globally partial; body disks, distant terrain and DEM uncertainty remain unresolved. Battery paths stop discharging at reserve, with unmet demand reported separately. No equations, backend computations, mock fallback, deployment or demonstration polishing added.
