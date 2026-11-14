# Step 11.6 — Original NASA photographic maps

Checkpoint before Step 11.7: the implemented imagery and executed evidence are
preserved separately. Final post-interruption 3D neighborhood, Surface View and
responsive/offline browser checks were not completed before the UX milestone was
requested. This checkpoint does not claim that all Step 11.6 acceptance checks passed.

## Delivered scope and remaining registration gap

LunAscend now displays authentic lunar photographs internally in an interactive 2D
map and a progressive Three.js context globe. The original LOLA local mesh, physical
surface observer, horizon and scientific calculations are preserved. This is a
bounded addition to the existing viewer, not a replacement mapping/science engine.

**Incomplete: registered optical draping onto the local LOLA terrain.** The chosen
NAC product covers Site01 and was controlled to LOLA by its producer, but its saved
metadata does not identify the exact dynamical realization or establish a measured
tie to our specific Site01 DEM. No arbitrary offset, rotation or frame alias was
introduced. As explicitly permitted in the brief, real NAC photographs appear in a
separate correctly projected 2D map while local 3D remains DEM-shaded. Photorealistic
registered local terrain and seamless globe-to-ground camera morphing are not claimed.

## Actual products and delivered resolution

All layer identifiers and matrix sets came from the official Moon Trek API example
configuration/catalog and verified capabilities; no QuickMap endpoint was guessed.

| Product | Source / projection | Published tile levels | Delivered finest sampling | Nominal original |
| --- | --- | --- | --- | --- |
| `LRO_WAC_Mosaic_Global_303ppd_v02` | LROC WAC v2; lunar geographic | 0–8 | 0.002746582°/px, about 83.3 m/px meridional on the sphere | approximately 100 m/px / 303 px per degree |
| `LRO_WAC_Mosaic_SPole60_100m_v02` | LROC WAC v2; south polar, roughly south of 60° S | 0–5 | 267.56 **projected** m/px | 100 m/px |
| `LRO_NAC_Mosaic_SPole85.5_1mp` | USGS / LMMP 2011 controlled NAC mosaic; roughly south of 85.5° S | 0–11 | 4.180641 **projected** m/px | 1 m/px |

Each service uses 256 × 256 tiles, style `default`, matrix set `default028mm`.
Global images are JPEG; polar images are PNG with grayscale/alpha in checked samples.
Original source spacing is not delivered texture resolution or effective accuracy.
The UI reports the **requested service level**, loaded tile counts, source limits and
missing detail; a zoom control never creates new source pixels beyond the finest
level (display magnification capped at two CSS pixels per finest source pixel).

Acquisition is 2009–2011, not the mission date. The NAC FGDC edition is 1, publication
2011-09-21. The chosen product is distinct from the newer **uncontrolled** NAC mosaic.
Its producer describes orthorectification/control to LOLA. Producer-era horizontal
accuracy estimates are not a new LunAscend registration measurement or error bound.

Official capabilities:

- [Global WAC](https://trek.nasa.gov/tiles/Moon/EQ/LRO_WAC_Mosaic_Global_303ppd_v02/1.0.0/WMTSCapabilities.xml)
- [South WAC](https://trek.nasa.gov/tiles/Moon/SP/LRO_WAC_Mosaic_SPole60_100m_v02/1.0.0/WMTSCapabilities.xml)
- [South NAC](https://trek.nasa.gov/tiles/Moon/SP/LRO_NAC_Mosaic_SPole85.5_1mp/1.0.0/WMTSCapabilities.xml)
- [NAC FGDC metadata](https://trek.nasa.gov/moon/TrekWS/rest/cat/metadata/fgdc/html?label=LRO_NAC_Mosaic_SPole85.5_1mp)
- [Moon Trek WMTS documentation](https://trek.nasa.gov/tiles/apidoc/trekAPI.html?body=moon)

`data/manifests/lunar-imagery.json` is generated from saved capabilities and the four
small source tiles in `data/fixtures/imagery`. Their hashes and attribution are tracked.
The larger research TIFF and live tile cache remain ignored. Live service tiles are
not a frozen complete archive; the manifest pins service identity/matrices and the
bundled samples, not every future remote response.

## Cartography, picks and shared scientific selection

The global grid is lunar geographic: planetocentric latitude, east-positive longitude,
radius 1,737,400 m; world bounds −180…180°, −90…90°. It is not Earth Web Mercator.
Its matrix has `2^(z+1)` columns and `2^z` rows; sampling is derived from angular
extent and tile dimensions, not Earth meters per degree.

Polar rendering uses spherical south-polar stereographic: standard parallel/origin
−90°, central meridian 0°, scale 1, false E/N zero, radius 1,737,400 m. Forward display
projection is `rho = 2 R tan(pi/4 + latitude/2)`, `x = rho sin(longitude)`,
`y = rho cos(longitude)`; inverse uses the matching spherical formula. Executed
PyProj vectors in `projection-checks.json` verify these rendering parameters.
There is no independent approximate dynamical frame conversion in React.

Important metadata defects are explicit: polar capabilities report `EPSG:0` and
meter-valued geographic boxes; the NAC catalog WKT has a zero scale factor. The
official FGDC standard parallel and lunar sphere define the usable projection.
Neither those corrections nor a matching radius prove a DE421/DE440 frame tie.

For a confirmed scientific input, the imagery anchor reuses the existing isolated
exact-name SPICE DE440/ME421 → DE421 bridge at the input epoch. The response includes
input identity, epoch, bridge provenance and `registration_verified=false`; the
frontend rejects mismatched identities. The map explicitly labels placement on the
cartographic image as nominal, with an unverified source-frame tie. The exact scientific
globe marker/directions retain their DE440/ME421 frame; the photo shell is qualified context.

Clicking a photo only inspects cartographic coordinates. Explicit adoption sets a
shared **unconfirmed** input, clears stale results and requires frame confirmation
before science. It does not silently call the source coordinate DE421 or DE440.
The original MissionContext, comparison snapshots and resilience workflow remain in use.

## 2D and 3D navigation

2D includes global / south-polar / local photographic modes, smooth pointer-centered
wheel zoom, pinch handling, drag/keyboard pan, +/- controls, fit Moon/pole/site/reset,
coordinate inspection, selected-site cross, approximate center scale and layer switch.
Real source levels load progressively, keeping available parent tiles. Fine PNG masks
clear the underlying photo so missing source pixels remain visibly missing. Bounds
prevent requests outside the published product; missing detail is never synthetic.

The 3D context globe uses source-grid tile patches mapped onto the same correctly
oriented spherical scene as the original marker: longitude 0 on +X, 90° E on −Z,
north on +Y. Global parent photographs remain under progressively chosen tile detail.
Approaching the south pole selects WAC polar imagery, then NAC in supported polar
neighborhoods. Geometry uses the source's correct geographic or polar pixel positions
and corresponding UV coordinates; no whole-image polar stretching is used.
PNG nodata becomes a dark missing-image patch, not invented crater detail.
The optical shell uses unlit materials so historical acquisition shadows are not
confused with current SPICE illumination. The local DEM still uses returned native
Sun directions for explicitly illustrative lighting. No rendering enters power,
battery, visibility or DTE calculations.

Global, regional, neighborhood, detailed LOLA and Surface View presets preserve the
shared site. Smooth orbit/zoom works within the globe and local mesh; switching
coordinate scales is a discrete mode change, not a continuous planet-wide 3D terrain
simulator. Local detail remains explicitly bounded: 33/65/129 maximum-side meshes,
250–4000 m half-width windows and returned original source stride. It never invents
native terrain detail when zooming a coarse mesh. Surface View stays 1× with actual
DEM + observer height, no raised camera or fabricated distant mountains.

## Bounded loading, offline operation and rights

- Backend: fixed allowlisted products/HTTPS host; no arbitrary URL proxy, 4 workers,
  at most 12 waiting jobs, 12 s network timeout, 18 s queue wait, 2 MB/tile limit,
  format/dimension checks, atomic disk writes, 64 MB / 1024-file disposable LRU cache.
  Disconnected clients do not bypass the worker bound.
- Each viewer: 4 transports, at most 48 decoded 256 px bitmaps, bounded error records,
  obsolete-request cancellation and failed-tile cooldown/retry. Three.js keeps at most
  64 tile textures, disposes geometry/maps/materials and retains context until new
  pixels arrive. Tile canvases own copied pixels independently of bitmap eviction.
- Existing lazy Three.js, on-demand draws, DPR ≤1.5, static local mesh reuse and 2D
  DEM compatibility remain. Bounds are resource policies, not a measured FPS guarantee.
- Four small authentic source tiles total 225,014 bytes. Global coarse photographs
  are portable/offline; viewed live tiles are cached. Uncached detail needs internet.
  Failure produces a clear notice with cached context or existing DEM fallback; local
  scientific computation is independent of the external image service.
- Credit NASA / GSFC / Arizona State University (LROC), NASA Moon Trek, and USGS / LMMP
  for the selected polar NAC product. FGDC states no access/use constraints. Preserve
  product/source credit. [LROC terms](https://lroc.im-ldi.com/about/terms) distinguish
  public-domain PDS science products from copyrighted non-PDS website media. These are
  science-product tiles, not copied portal UI, stock photos, generated craters or agency
  logos. No NASA, JPL, USGS, ASU or CSA endorsement is implied.

## Executed verification

- Full backend regression: **266 passed** before final adapter hardening. After the
  final request-identity/date/queue/format changes, **29 targeted imagery/source checks
  passed**. The latter adds two cases; original scientific modules and saved evidence
  were unchanged, so another costly complete science run was not repeated.
- Frontend: **145 tests passed**, TypeScript passed, production build passed. After the
  browser-discovered layer-switch fix, the frontend checks/build were rerun (final
  results: 145 passed, TypeScript and build passed). Tests include actual matrix limits,
  executed PyProj vectors, pointer-centered zoom/pan, source coverage, tile loading,
  cancellation/LRU/failure, globe UV/LOD and disposal, plus all prior scientific viewer,
  true-scale observer, horizon, analysis/comparison/resilience tests.
- Live API: `scripts/verify_lunar_imagery.py` retrieved 8 bounded genuine JPEG/PNG tiles
  across all three sources and several levels. Saved byte hashes/timing/origin and the
  exact Site01 anchor are in `docs/validation/step-11.6-imagery-check.json`. Native anchor
  differences from saved Step 10 are **0°** in both coordinates; this is a regression
  check of the existing transform, not independent image registration.
- Browser: actual photographic 2D and globe rendering, global/polar/local source levels,
  Site01 NAC level 11 at 4.18 projected m/px, wheel zoom, drag/keyboard pan, coordinate
  inspection without input mutation and fine→coarse layer switching were exercised.
  An unsupported old zoom index on layer switch was found and corrected. Intermediate
  development hot reload also retained an old class instance; final checks use fresh
  modules. A fresh-session final responsive / Surface View pass remained unfinished at
  checkpoint; physical touch gestures and GPU performance are not certified.

No engine equations, original SPICE/LOLA manifests, numerical references, package locks,
logo or fonts were changed. No push, deployment, publication or later milestone is included.
