# Step 12 — interactive exploration and bounded opportunity screening

## Phase A — Apollo and cursor coordinates

Six NASA NSSDCA Lunar Module positions retain their original planetocentric,
east-positive `MOON_ME_DE421` coordinates in `data/manifests/apollo-sites.json`.
The existing isolated frame bridge supplies the inverse rotation into the
DE440/ME421 context sphere at the displayed UTC. No frame alias or image tie
is inferred. Pins are surface-attached and culled on the far side.
Source: https://nssdc.gsfc.nasa.gov/planetary/lunar/lunar_sites.html .
NASA SVS https://svs.gsfc.nasa.gov/4731 is historical visualization only.

Marker selection focuses the globe and opens source coordinates, landing date,
geometry analysis and comparison actions. Analysis requires an explicitly
confirmed hypothetical sphere-relative elevation. Site01 terrain, power and DTE
are disabled for Apollo requests: the installed DEM does not cover these sites.
The existing pre-1972 UTC restriction is preserved. Historical Apollo 16/17
epochs follow NSSDCA mission summaries; other historical landing dates are
context only. Geometry is a hypothetical calculation, not actual LM power data.

Cursor raycasting intersects only the globe surface, converts world to local
coordinates and displays four decimal places without React state updates per
movement. Click/tap opens an explicit selection action. Coordinates do not
establish surface elevation or terrain coverage. The existing coordinate form
and a six-site button list provide alternatives to pointer interaction.

Executed phase-A checks: 179 frontend tests, TypeScript/production build,
26 targeted backend exploration/imagery tests. Actual browser: enabled the six
pins, selected Apollo 11, confirmed its native coordinates and historical-time
limitation. Further interaction and full regression checks are recorded below
as they are completed. No independent positional accuracy or flight validity
is claimed. No deployment or push is authorized.

## Phase B — NASA polar environment windows

Installed real native-resolution 65×65 windows of `AVGVISIB_85S_060M_201608`,
its `_EARTH` counterpart and `LPSR_85S_060M_201608`, PDS product version V1.05.
The retained 3.9 km square is near Site01; it does not establish global coverage.
Original PDS labels, byte-preserving attributes and SHA256-pinned window TIFFs
are tracked. The source files themselves remain remote. The manifest records
source ETags/sizes, native window, transfer totals, CRS, transforms and scaling.
Acquisition used 124,315 + 94,209 + 28,912 = **247,436 bytes**, 16 bounded ranges
per product, instead of complete 34 MB / 25 MB rasters. The advertised COG URLs
returned HTML during inspection, so the verified ranged standard TIFFs were used.

Projection: south-polar spherical stereographic, central longitude 0°, true scale
at −90°, radius 1,737,400 m; DE421 ME identity comes from the PDS labels, not an
Earth CRS or a datum-name inference. Native grid spacing is 60 m. Full-resolution
DNs use 0.00004×DN for solar/Earth and 0.000025×DN+0.5 for binary shadow. Nodata
−32768 and masks are preserved; genuine zero remains a measured/model value.
No raster overview values or interpolation enter quantitative inspection.

The photographic map retains its imagery under a translucent nominal overlay.
No exact image-to-DE421 registration is claimed. Outside the installed square
is transparent. Inspected cells show their actual scaled value. Mode A is the
NASA long-term model; Mode B hides averages and directs users to selected-date
analysis. The page describes approximately 18.6 years at hourly steps; PDS
START/STOP observation dates describe source acquisition, not the mission epoch.
Any-disk Earth visibility is not center-clearance DTE or an RF result.

Terrain elevation reuses the existing LOLA view. A verified slope layer is not
installed. The nine Artemis regions are a sourced, unranked October 2024 list;
no verified region boundaries were found in the cited release, so no polygons
are invented. This is dated context, not a current approval.

Source and citation: https://pgda.gsfc.nasa.gov/products/69 ; NASA/LOLA team,
Mazarico et al. (2011), doi:10.1016/j.icarus.2010.10.030. NASA scientific data
are attributed as source data, with no NASA endorsement; do not imply rights to
agency insignia. Third-party paper text/images are not bundled. Small model
windows and original labels carry their source/attribution in the manifest.

Phase-B executed checks: 181 frontend tests, TypeScript/production build;
8 targeted environment/exploration backend tests; actual browser solar-layer
load and native-window focus. Raster tests cover scaling, valid zero versus
nodata, hashes, native projection and binary shadow.

## Phase C — screening and guided mission opportunities

`POST /api/v1/exploration/screening` evaluates the three installed, co-registered
NASA windows against explicit long-term sunlight/Earth fraction thresholds and
an optional permanent-shadow exclusion. Its response includes per-cell evidence,
reason codes, criteria and source hashes. No universal score, regional ranking,
interpolated coverage or selected-date raster is generated.

Classification precedence: **red** if any evaluated mandatory criterion fails;
otherwise **gray** if all environmental evidence is absent; otherwise **amber**
if a required input is unknown; otherwise **green** for the evaluated long-term
criteria only. The default requires mission-date engineering, which is absent
from these averages, so otherwise-passing pixels remain amber. Requesting slope
also stays unknown. Green requires explicitly excluding those unevaluated
requirements and is never certification of landing safety. Missing pixels
remain unknown; an excluded valid shadow flag is a failure, not missing data.

The existing Resilience page now contains the six-step **Find better landing
opportunities** flow. It reuses the exact fixed-location date reconciliation,
unchanged hardware, source provenance, cache and bounded backend search: at most
12 candidates across three explicitly supplied sites, within 30 days of the
original epoch; missions at most seven days/169 samples. It does not scan a
continuous geographic region or discover an optimal location across the Moon.
Candidate rows retain their numerical differences, constraint evidence,
comparison transfer and model limitations. Missing results are gray; critical
unknown criteria in calculated candidates are amber. Failures take precedence.

Two optional, backward-compatible request fields were added to
`MissionConstraints`: `minimum_sun_clearance_fraction` (0–1) and
`maximum_slope_deg` (0–90). The first checks complete sample-supported conditional
Sun-center clearance intervals in the existing finite terrain model; missing or
indeterminate intervals cannot pass. It is not disk illumination. There is no
verified slope-at-scale product, so a mandatory slope limit always remains
indeterminate. Existing requests with these fields absent retain their rules.
No ephemeris, horizon, power, battery or communications equations were changed.

## Executed current API evidence

`scripts/verify_step12.py` executed the actual local endpoints and wrote
`docs/validation/step-12-api-check.json`; results below were not hardcoded into
the UI. Site01: 24 hours, 25 samples, 2 m observer, 2 m² fixed-horizontal panels,
25% panel efficiency, 90% system efficiency, 50 W demand, 500 Wh battery,
100% initial/10% reserve charge and 95% charge/discharge efficiencies.

| Arrival UTC | Optimistic solar Wh | Optimistic unmet demand Wh | Final battery Wh | Conditional DTE s |
| --- | ---: | ---: | ---: | ---: |
| 2026-11-14 00:00 | 371.364126 | 401.135874 | 50 | 0 |
| 2026-11-15 00:00 | 343.414638 | 429.085362 | 50 | 0 |

Both conservative cases generate 0 Wh under their stated assumptions and leave
772.5 Wh unsupplied. Both optimistic and conservative battery cases fail the
configured model. November 14 has 27.949488 Wh more optimistic solar energy;
this relative advantage is not absolute feasibility or guaranteed survival.
No candidate in this two-date grid meets the selected mandatory requirements.

The API also returned 25 geometry-only samples for Apollo 11 on 2026-11-14,
Apollo 16 at 1972-04-21 02:23:35 UTC and Apollo 17 at 1972-12-11 19:54:57 UTC.
With an explicit hypothetical 0 m sphere-relative surface height and 0 m
observer height, initial Sun/Earth geometric elevations were respectively
−13.163567°/+64.944478°, +14.755166°/+77.127510°, +13.344699°/+45.281237°.
These are unvalidated hypothetical geometry checks with no Apollo terrain or
historical spacecraft power reconstruction. Original NASA coordinates remain
unchanged; transformed context coordinates and assumptions are saved separately.

## Verification and remaining limits

Executed full backend suite: **281 passed** (one existing Starlette/httpx
deprecation warning). Executed frontend suite: **182 passed**. TypeScript and
production build passed; existing >500 kB chunk-size warnings remain.
The offline source registry and saved validation identities still match.
GPU-mocked tests exercised actual ray/pin intersections, far-side culling,
hover leave/off-Moon behavior, plus existing rendering ownership and reuse.
Coordinate tests covered world rotations, poles and longitude wrapping.

Actual browser checks: Apollo 11 focused and selected by clicking its 3D pin;
live coordinate readout; explicit globe selection; all three NASA environment
layers; screening pixel evidence (solar 0.48728, Earth 0.58104, shadow 0) and
failure reasons; guided Site01 two-date search and its numerical conclusions.
Narrow-screen checks measured a 398 CSS-pixel viewport with no document overflow
and exercised the mobile navigation drawer. Native multitouch gestures were not
executed; pointer-selection support does not constitute a touch-device field test.

Global environmental coverage, verified Apollo DEMs, verified slope/hazard
products and exact Artemis region polygons are not installed. Photo registration
remains unverified. The existing pre-1972 time restriction is retained. Full
thermal, descent, boulder, RF link-budget and flight-safety evaluation are absent.
Offline astronomy/terrain require restored scientific datasets; the bundled
NASA windows work offline, while uncached photographs still require network.
No new independent Horizons comparison or scientific-accuracy claim was made.
