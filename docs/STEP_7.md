# Step 7 - NASA LOLA terrain and local horizons

## A. Implementation

Added one optional, modular terrain pipeline: hash-pinned GeoTIFF ingestion, strict lunar metadata verification, projection and epoch-dependent frame conversion, DEM surface-height queries, bounded raster windows, conservative bilinear sampling, spherical observer-centered horizon rays, per-direction coverage and provenance. Added a standalone versioned terrain API and a repeatable restoration CLI. Existing SPICE/mock providers, numerical engines, Step 3 evidence and frontend source are unchanged.

Major files: `terrain/dem.py`, `geometry.py`, `frames.py`, isolated `_frame_worker.py`, `engine.py`, `manage.py`, `validation.py`, `errors.py`; `contracts/terrain.py` and optional HorizonProfile extensions in `contracts/models.py`; `api/terrain.py` registered in `main.py`; `tests/test_terrain.py`; two example requests; two dataset/kernel manifests; optional dependency pins/uv.lock; source line-ending attributes and root documentation. Full design, sources and commands: [TERRAIN_DATA.md](TERRAIN_DATA.md).

## B. NASA dataset

NASA PGDA [product 78 Site01 Connecting ridge](https://pgda.gsfc.nasa.gov/products/78), `Site01_final_adj_5mpp_surf.tif`: 5 m/pixel, 3200 x 3200, 16 x 16 km, 40,980,810 bytes. Source file dated 2020-06-05; citation Barker et al. (2021), PSS 203, 105119. Acquired full regional file rather than multi-GB global/polar mosaics. It remains ignored under data/raw. [Manifest and SHA-256](../data/manifests/lola-site01.json) pin exact bytes; the checksum is locally computed, not publisher-supplied. Separate uncertainty/count/clone products remain upstream references, not implemented error layers.

## C. Coordinates, heights and frames

Actual raster metadata: spherical south polar stereographic, true-scale latitude -90 degrees, central meridian 0, zero false offsets, radius 1,737,400 m, X/Y meters. Coverage X [-19000,-3000], Y [-20000,-4000] m. GDAL pixel-corner affine (5,0,-19000,0,-5,-4000), Area registration, center sampling. Float32 elevations are meter heights above the reference sphere, scale 1, offset 0, nodata NaN. Band unit is absent; NASA documentation supplies the units. Unnamed WKT datum labels are not used to infer physical frame identity.

NASA identifies DE421 ME coordinates, resolved to MOON_ME_DE421. LunAscend's original MOON_ME_DE440_ME421 is not identical. Cross-frame requests require a UTC epoch and use exact NAIF pxform transformations with separately hash-pinned DE421 FK/PCK plus original kernels in an isolated child process. Parent SPICE pool/source/manifest remain unchanged. Three saved epoch cases have vector roundtrip residuals no larger than 1.11e-16. Native DE421 requests require no science library or orientation conversion. No Earth CRS or undocumented identity substitution is used.

## D. Terrain mathematics

Azimuth is clockwise from local north in the requested frame. Great-circle unit directions sample the declared sphere; a verified rotation maps them to native DEM coordinates for projection. Height-dependent lunar radial positions are resolved into the observer's radial ENU tangent frame. The cancellation-safe exact spherical formula is `atan2(z-z0-h-2*(R+z)*sin(d/(2R))^2, (R+z)*sin(d/R))`. It includes curvature and observer radial height above the local DEM, not merely flat height differences. Each known sampled maximum has a defining distance.

## E. Real numerical example

The [saved report](validation/step-7-results.json) includes metadata, exact inputs, all 360 azimuths and returned angles/distances/coverage, three representative pixel checks, frame cases, sampling sensitivity and performance.

| Quantity | Executed value |
| --- | --- |
| Native frame | MOON_ME_DE421 |
| Site01 pixel row / column | 1600 / 1600 |
| Latitude / east-positive longitude | -89.4631577569723 / -137.50198490762307 deg |
| DEM surface height above sphere | 1944.7670898436713 m |
| Observer height above local DEM | 2 m |
| Search radius / radial step | 2500 m / 5 m, plus initial 1 m sample |
| Azimuth spacing | 1 degree (360 rays) |
| Minimum / maximum sampled terrain angle | -4.677395904896212 / +2.277213308817433 deg |
| Rays with all requested samples supported | 360 / 360 |
| Global horizon complete | **false** |

Those full numerical values preserve computation precision, not physical accuracy. This is a raster pixel-center example, not a surveyed lander position or site recommendation.

## F. Validation

33 new terrain tests cover smooth spherical surfaces, analytical Cartesian ridge/curvature cases, crater rims, observer height, known azimuth, nodata, boundaries, projection formulas/inverses, longitude wrapping, near-polar positions, scaled/offset heights, bounded grids/masks, metadata rejection, hashes, request validation, deterministic outputs, provenance/API errors, real raster ingestion and isolated frame transformations. Existing SPICE geometry before/after the frame bridge remains identical. Projection inverse checks allow 1e-9 degrees; they are software precision checks, not DEM accuracy claims.

An initial terrain run had three failures: the synthetic near-pole fixture accidentally initialized at the exact pole; an inverse-projection assertion demanded tighter numerical precision than observed; and the bridge passed an ISO numeric timezone suffix unsupported by SPICE's time parser. The fixture/assertion were corrected and UTC conversion now formats an explicit UTC epoch for SPICE. No existing SPICE engine or reference tolerance/result was changed. Final tests have no failures.

Real-data ingestion is successful. There is **no independent, sufficiently matched external terrain-horizon comparison**. Published illumination/horizon examples use different observer locations, heights, far-field terrain and sampling assumptions; they were not treated as interchangeable references. All real terrain provenance remains unvalidated. Refining 5 m to 2.5 m radial samples changes some angles by up to 0.0521462053 degrees, so angular convergence/physical accuracy is not certified. A higher observer never raised the sampled horizon in the executed check.

## G. Coverage

All horizons are globally partial, even when every requested sample has support. Model lower bounds do not establish unobstructed directions. The result records radius, radial/azimuth spacing, valid-sample fraction, furthest known sample, first missing range, and boundary/nodata flags per ray. A separate near-edge example encountered dataset boundaries in 52 of 72 rays; 20 had all requested radial samples. No missing terrain is replaced with zero. Terrain below 1 m, between samples or beyond the finite radius remains unresolved. Regional far-field data are needed for a fuller obstruction analysis.

## H. Performance

The saved native-frame benchmark executed in approximately **1.12 s**, with **48,843,650 bytes** peak Python/NumPy tracked allocations. It read a **1003 x 1003** local window, allocating **8,048,072 bytes** for the float64 raster array, rather than loading the entire 3200-square raster. Hash verification had already warmed its bounded identity cache. GDAL native caches and child-process RSS are excluded from tracemalloc, so this is not a total memory measurement. Cross-frame startup time is not included in that native benchmark. Workloads/windows/export grids have explicit limits; no distributed infrastructure is introduced.

## I. Testing and regressions

- **148 backend tests passed**, including all original 115 and 33 terrain tests, with real DEM and kernels available. No scientific-reference tests skipped. Only the existing Starlette/httpx TestClient deprecation warning remains.
- **64 frontend tests passed**; TypeScript and production build passed. Frontend source/package-lock remain unchanged. No new browser visual check is claimed because no UI changed.
- Offline uv lock check and frozen sync with both science/terrain extras passed. Every previously locked package version was preserved. Windows CPython 3.12 wheels installed successfully: Rasterio 1.5.2/GDAL 3.12.2, PyProj 3.8.0/PROJ 9.8.1; NumPy 2.5.4 and SpiceyPy 8.3.0 unchanged.
- DEM/frame kernel checksums and actual raster metadata verified. Idempotent restoration command reused already verified files. A fresh-PC download/restore rehearsal has not been executed.
- Import-blocking subprocess with NumPy, Rasterio, PyProj and SpiceyPy unavailable: health HTTP 200, mock analysis HTTP 200, terrain HTTP 503 PROVIDER_UNAVAILABLE.
- Original ephemeris/providers/kernel manifest and all prior validation artifacts have no diff. Step 3 Horizons comparisons remain passing and unchanged.

## J. API

**POST /api/v1/terrain/horizon** accepts registered dataset, coordinates/frame, optional required cross-frame epoch, observer height, azimuth count, radius and radial step. Terrain calculations remain outside HTTP handlers and do not download data. Existing scenario endpoints continue returning their original products; terrain visualization is deferred to dedicated integration. [Native example](../backend/examples/terrain-request.json), [DE440 example](../backend/examples/terrain-request-de440.json).

The existing owned loopback server was restarted with the new endpoint. [Actual HTTP evidence](validation/step-7-api-check.json): real terrain HTTP 200/360 rays; original SPICE example HTTP 200 with unchanged starting Sun elevation 1.6500961689197666 degrees; repeated mock responses HTTP 200 and equal; unknown dataset HTTP 503 MISSING_DATA with no synthetic fallback. No public service or deployment was created.

## K. Portability

`uv sync --frozen --extra science --extra terrain`; restore original SPICE kernels, then `python -m lunascend.terrain.manage download` / `verify` / `inspect`. Complete commands, dataset hashes, optional path overrides and versions are in [TERRAIN_DATA.md](TERRAIN_DATA.md). Official Windows wheels avoid a system GDAL/compiler requirement. Downloads are bounded, hash checked and atomically replaced. Paths are source-root relative and no credentials are needed. Mock remains available without terrain/science resources.

## L. Git and privacy

Recovery tag: `step-7-lola-horizon`; resolve its commit with `git show --no-patch step-7-lola-horizon`. The Step 6 recovery remains intact. Stage only source, tests, manifests, dependency lock and small documentation/results. Large DEM/kernel binaries remain ignored; staged changes are checked for credentials and unwanted large files. No remote, push, source sharing or deployment.

## M. Unresolved limits

No external terrain-horizon accuracy certification, no proof of angular convergence, no subpixel terrain/near-field/far-field completeness, no uncertainty-layer propagation, no new geoid/ellipsoid model or support for unverified frames/datums. Exact-pole azimuth is rejected explicitly. Grid exports are bounded original cells, not a 3D renderer. The current frontend's illustrative map and unavailable terrain plot are not replaced or relabeled as NASA terrain. Another Windows PC and total process-memory behavior remain untested.

## N. Next milestone

Recommend carefully integrating **terrain-aware Sun/Earth visibility windows**, with matching site/frame/epoch/height, coverage-aware unknown states, adequate distant terrain, temporal/angular sampling and explicit body-disk policy. Step 8 is not implemented or authorized automatically. Stop after Step 7.
