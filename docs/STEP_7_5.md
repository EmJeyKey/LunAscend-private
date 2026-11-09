# Step 7.5 — terrain-aware center visibility

## A. Implementation

Added a bounded composition service in `backend/src/lunascend/visibility`: isolated per-epoch geometry worker, circular masked horizon classification, qualified intervals/transitions, and reproducible real-data report. The existing `POST /api/v1/scenarios/analyze` handles explicit scientific terrain requests. No endpoint, dependency, database or 3D renderer was added. Geometric-only and mock routes retain their previous engines. The original ephemeris source, terrain engine, dataset/kernel manifests and Step 3/7 numerical evidence remain unchanged. Pending typography was first preserved in local commit `57b3b4d`.

## B. Scientific methods

Reuse the Step 7 great-circle/spherical-curvature horizon. In native DE421 ENU, interpolate adjacent known horizon samples linearly in circular azimuth, wrapping the last ray to the first. An exact ray uses its own coverage. Missing endpoints never produce a horizon or clearance. At least two documented samples are required. `clearance_deg = body_center_elevation_deg - interpolated_horizon_deg`. Numerical equality within 1e-10 degrees is indeterminate; this is a floating-point equality rule, not an accuracy bound. Finite radial maxima and angular interpolation can miss narrow or unsampled features. One-degree sample spacing is not one-degree scientific accuracy.

Body centers and geometric correction NONE are retained. No limb radius, partial disk, illumination fraction, refraction, power or radio-link model is implemented. Future disk analysis needs separately verified apparent angular radii and policies.

## C. Observer and exact frames

Input coordinates remain planetocentric/east-positive MOON_ME_DE440_ME421 on the 1737400 m sphere, explicitly at `terrain_options.coordinate_epoch_utc`, which must equal analysis start. The site is then fixed in DEM-native MOON_ME_DE421. Input `surface_elevation_m` must be null: terrain mode derives it from the pinned DEM and adds `observer_height_m` exactly once. Conflicting manual surface heights are rejected, not silently combined.

An isolated worker verifies the original five kernels and the two Step 7 DE421 kernels. At every UTC/ET sample, exact NAIF `pxform(DE440/ME421, DE421, et)` rotates the fixed native observer into DE440 for the existing `observation_loaded`/`observer_position` functions. Body ENU direction vectors are rotated back and projected into native ENU before horizon comparison. The saved result includes each rotation, resolved observer coordinates/radius and position residual. The parent geometry kernel pool is untouched. No generic MOON_ME alias or identity approximation is used.

Original observation curves remain DE440; terrain readouts explicitly use DE421. Elevations agree under radial rotation, while north-based azimuths are transformed. Comparing exactly the same physical site across different start dates requires the appropriate input DE440 coordinates at each start epoch; the result reports native coordinates so this distinction is inspectable.

Sources: [NAIF lunar frame specification](https://naif.jpl.nasa.gov/pub/naif/generic_kernels/fk/satellites/moon_de440_250416.tf), [pxform documentation](https://naif.jpl.nasa.gov/pub/naif/toolkit_docs/C/cspice/pxform_c.html), and [Step 7 terrain conventions](TERRAIN_DATA.md).

## D. Executed NASA result

[Saved reproducible report](validation/step-7.5-results.json), generated with `python -m lunascend.visibility.validation`. Native site latitude -89.4631577569723 degrees, east-positive longitude -137.50198490762307 degrees, NASA LOLA `lola-site01-5m-v2020`. Start 2026-11-14 00:00 UTC, end 2026-11-15 00:00 UTC, 25 hourly samples; 360 rays, 2500 m radius, 5 m radial sampling. DEM elevation 1944.7670898436575 m, observer 2 m above terrain; total observer radius 1739346.7670898438 m. Maximum measured frame/observer position residual was 9.68034e-10 m (software consistency, not positional accuracy).

| First sample / degrees | Sun center | Earth center |
| --- | ---: | ---: |
| Native azimuth | 264.110831 | 136.244964 |
| Elevation | 1.501603 | -5.036239 |
| Interpolated terrain horizon | -4.612548 | 0.980374 |
| Clearance | 6.114151 | -6.016613 |
| Classification | Conditional clearance | Modeled obstruction |

Both queried directions have sampled-radius coverage. All 25 samples retain these respective classifications. The model returns approximately 24 h of sample-supported Sun conditional clearance and 24 h of modeled Earth obstruction, both censored at both period edges. No joint conditional-clearance interval or supported crossing occurred. These are not certified continuous sunlight/communication durations; between-sample crossings remain possible. No independent real-data terrain-visibility comparison was performed.

## E. Classification and coverage

- `modeled_obstruction`: negative clearance against the documented circular-linear horizon model. Known maxima may establish this model classification even when farther radial samples are unknown. This does not certify physical obstruction accuracy at interpolated azimuths.
- `conditional_clearance`: positive center clearance with both supporting rays evaluated to the requested finite radius. Terrain below 1 m range, between samples and beyond the radius remains unresolved.
- `indeterminate`: unknown horizon direction, positive clearance with radial gaps/boundaries, or numerical horizon equality.
- `unavailable`: required geometry/profile cannot be evaluated.

Every real visibility result remains unvalidated and globally partial; `global_visibility_confirmed=false`. Ray masks/distances remain available in the existing HorizonProfile. Missing DEM/kernel/dependency failures return structured errors with no fallback or fabricated windows. Geometric-only mode still works without terrain data; mock remains explicitly illustrative.

## F. Operational intervals and transitions

Same-state neighboring samples define approximate `sampled_support` intervals, never continuous guarantees. Opposite-sign decisive samples with complete sampled-radius support admit a piecewise-linear clearance zero estimate. Store both UTC bracket endpoints, resolution in seconds and `piecewise_linear_clearance` method. Unknown-adjacent or unsupported changes make the whole bracket indeterminate; missing terrain is not interpolated into clearance. Exact zero remains unresolved. Intersect only qualified Sun/Earth conditional intervals for joint conditional clearance. Merge adjacent same-state/same-method segments; start/end censoring marks period edges. No next-sunset/Earthset countdown or second-level precision claim is introduced.

## G. Scientific validation

20 added backend tests cover analytical above/below/equal obstacles; circular seam and longitude wrapping; masked directions; missing azimuth/elevation; known partial obstruction versus unknown positive partial clearance; multiple crossings/joint intersections; indeterminate gaps; endpoint censoring; no/single sample support; height/frame mismatch and explicit epoch/budget rejection; missing terrain with functioning geometric-only mode; actual near-polar NASA height and per-epoch observer reconciliation; profile reuse once; changed observer height; and existing-route API failure behavior. Step 7 retains its independent synthetic sphere/ridge/crater/curvature/height tests. Real first-epoch angles are consistent with the unchanged SPICE method; this does not independently validate terrain visibility.

## H. Frontend

Preserved Marcellus/Manrope/IBM Plex Mono, original logo, palette, existing controls and elevation curves. Added optional terrain settings with bounded radius/rays/step, DEM-derived height indication and a Site01 example that requires frame confirmation. Analysis shows synchronized current-sample horizon/clearance/coverage, explicit classifications, a selectable UTC table, approximate operational intervals and bracketed transitions. Comparison reuses Step 6 settings/snapshots/cache; each configuration and independent interval totals are visible, without unsupported coverage-equivalence deltas or suitability ranking. Updated scope/methodology text. Runtime response validation rejects mismatched dataset/sampling/frames, invalid masks, invented global visibility and contradictory clearances.

Browser inspection was attempted but blocked by browser security policy before page access. No rendered-page, mobile or interactive browser success is claimed for Step 7.5. Frontend tests execute request/parser/state regressions and render real-result markup.

## I. Performance

The saved 25-sample scenario took approximately 3.19 s with 49,836,552 bytes peak parent Python/NumPy tracked allocations. This excludes GDAL native cache and isolated child RSS; it is not total memory. One native horizon is computed per request and reused across all timestamps. Two bounded worker launches (anchor and full geometry), 1001 time samples, existing terrain sample/window bounds and 90 s worker timeout bound resources. No persistent terrain cache is introduced, avoiding stale dataset/height/frame identities. Existing three-scenario cache keys include explicit terrain settings. Dataset IDs pin hashes; changing source bytes requires a new verified manifest/version.

## J. Verification

- Existing backend tests plus new cases: 168 passed, including original 148 and all SPICE/terrain regressions; no skipped reference tests with installed data. Existing Starlette/httpx deprecation warning remains.
- Frontend tests: 76 passed (64 existing, 12 new); TypeScript and production build passed.
- Live API: real terrain 200; missing dataset 503 with no visibility products; geometric-only 200; mock 200. [Evidence](validation/step-7.5-api-check.json).
- Optional dependency isolation passed: blocked NumPy/Rasterio/PyProj/SpiceyPy, health 200, requested terrain 503, explicit mock 200. Offline uv lock check passed using the project-local cache.
- No numerical reference files, original ephemeris/terrain engines, original manifests or dependency locks changed. Source hashes accompany the new report; no credentials or large source datasets are staged.

## K. Windows restoration

No new dependencies. From project root: `.\.tools\uv.exe --directory backend sync --frozen --extra science --extra terrain`. From backend: `.\.venv\Scripts\python.exe -m lunascend.ephemeris.manage download`, then `-m lunascend.terrain.manage download` and `-m lunascend.terrain.manage verify`. See SETUP.md/TERRAIN_DATA.md for runtime restoration. Restore frontend with `npm.cmd ci`; the existing `/backend` development proxy targets loopback port 8000. POST [the example request](../backend/examples/terrain-visibility-request.json) to the existing scenario endpoint. No machine-specific paths, remote downloads during analysis, new service or credentials. A fresh Windows-PC rehearsal has not been performed.

## L. Git and privacy

Local recovery tag: `step-7.5-terrain-visibility` (resolve with `git show --no-patch step-7.5-terrain-visibility`). Typography recovery commit `57b3b4d` and Step 7 recovery tag remain intact. Commit source, tests and small JSON evidence only. No push, remote creation, public deployment, source sharing or visibility change.

## M. Remaining limits

Finite regional terrain, angular/radial interpolation, no submeter near field/far-field completeness, upstream DEM interpolation/uncertainty not propagated, coarse-time missed transitions, center-only bodies and no independent terrain-visibility accuracy validation. Sampled operational intervals are not flight planning guarantees. Frame support is only the documented DE421/DE440 pair with available exact kernels. Browser visual verification and another-PC restoration remain unverified.

## N. Next recommendation

Prioritize terrain-coverage and temporal/angular sensitivity validation, independently matched terrain-visibility references, and a browser/Windows restore check before using intervals for engineering decisions. Power, battery, radio links and resilience optimization require separate authorization. Stop after Step 7.5; no subsequent milestone started.
