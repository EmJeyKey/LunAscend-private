# LOLA terrain pipeline and restoration

## Pinned source

Initial dataset: NASA PGDA product 78, **Site01 Connecting ridge**, `Site01_final_adj_5mpp_surf.tif`, 5 m/pixel, 3200 x 3200 pixels (16 x 16 km). Source file date: 2020-06-05; source page cites Barker et al. (2021), *Planetary and Space Science* 203, 105119, DOI [10.1016/j.pss.2020.105119](https://doi.org/10.1016/j.pss.2020.105119). This is a candidate-site region, not a landing recommendation.

Sources: [NASA product 78](https://pgda.gsfc.nasa.gov/products/78), [its README](https://pgda.gsfc.nasa.gov/data/LOLA_5mpp/README), [accepted manuscript at NASA NTRS](https://ntrs.nasa.gov/citations/20205009660), [PDS LOLA SIS](https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/document/rdrsis.htm). Products [81](https://pgda.gsfc.nasa.gov/products/81) and [90](https://pgda.gsfc.nasa.gov/products/90) were inspected as larger regional alternatives; their multi-GB high-resolution mosaics were not downloaded. Only the 40,980,810-byte Site01 DEM and its small documentation were acquired. No imagery, uncertainty raster, global DEM or clone ensemble was downloaded.

[The dataset manifest](../data/manifests/lola-site01.json) records source URLs, citation/version, byte count, SHA-256, projection, radius, scale/offset, NaN nodata, dimensions, affine registration, bounds and uncertainty-layer references. SHA-256: `3ba7b97cb00a2bcf21189c3aeb535f65afc21207154ab9f0d43c5bdc1f7e747e`. This checksum was computed locally from the acquired HTTPS bytes; NASA did not supply an independent checksum. Future restoration is checked against these exact pinned bytes. The binary remains ignored under `data/raw/lola-site01/`.

## Coordinate and height conventions

NASA identifies **MOON_ME of DE421**, resolved here to the exact NAIF frame `MOON_ME_DE421`. Latitude is planetocentric and longitude east-positive; the API normalizes longitude to [-180,180). The actual GeoTIFF is spherical south-polar stereographic: latitude of standard parallel -90 degrees, longitude of origin 0, zero false easting/northing, meter units, radius **1,737,400 m**. It is not EPSG:4326 or Web Mercator. The raster WKT has unnamed/unknown datum labels; it does not encode the DE421 realization. That identity is supplied by NASA documentation, not inferred by PyProj. The loader checks defining projection parameters, radii, prime meridian and linear units rather than matching arbitrary WKT names.

Projected raster bounds: X [-19000,-3000] m; Y [-20000,-4000] m. Corner affine: (5,0,-19000,0,-5,-4000). `AREA_OR_POINT=Area`; pixel centers are located at corner + half pixel. Row 1600, column 1600 is X=-10997.5 m, Y=-12002.5 m. PyProj uses `always_xy=True`; it handles only the declared lunar projection, never the DE421/DE440 orientation bridge. Forward projection is tested against the independent spherical stereographic equations, including longitude wrapping and near-polar cases.

Pixel values are **surface height in meters above the reference sphere**, not planetary radii, geoid topography or observer height. The product documentation identifies surface height; the paper distinguishes it from position uncertainty and the PDS SIS establishes the LOLA sphere-height/radius convention. Raster scale=1, offset=0, float32, nodata=NaN. Band unit metadata is absent, so units come explicitly from NASA's product/README. Preserve the floating values; add the reference radius only in physical radial geometry. Bilinear sampling uses four finite pixel-center neighbors and applies declared scale/offset after masking. No nodata pixel is treated as zero.

## Exact frame bridge

Existing SPICE geometry uses `MOON_ME_DE440_ME421`, which is closely aligned with, but **not identical** to, `MOON_ME_DE421`. [NAIF's current lunar FK](https://naif.jpl.nasa.gov/pub/naif/generic_kernels/fk/satellites/moon_de440_250416.tf) describes the nonzero, epoch-dependent rotation and its measured bounds. The [DE421 FK](https://naif.jpl.nasa.gov/pub/naif/generic_kernels/fk/satellites/moon_080317.tf) defines the older realization. Do not use the mutable generic alias MOON_ME or substitute IAU_MOON.

Native DE421 requests require no rotation. DE440/ME421 requests require an explicit UTC coordinate epoch from 1972 onward, consistent with the existing geometry engine. A one-shot isolated Python process loads the original five hash-verified kernels plus the two [separately pinned DE421 kernels](../data/manifests/terrain-frame-kernels.json), then calls SPICE `pxform` with exact frame names. It does not alter the API process's SPICE pool, original engine, original kernel manifest or saved scientific evidence. Matrix orthogonality, roundtrip cases, NAIF's rotation bound, and unchanged original geometry before/after conversion are tested. Missing kernels or unsupported epochs produce errors, never an identity approximation.

Rays are generated in the **requested frame's** local ENU basis, rotated into DE421 for raster lookup, and their sampled heights retain the common spherical datum. The output horizon azimuths/elevations belong to the requested frame. The matrix, epoch and seven kernel hashes are returned. A profile must not be compared with Sun/Earth geometry from another frame or coordinate epoch without checking these identities. This bridge is an orientation conversion, not a vertical-datum correction or new physical validation.

## Horizon mathematics and limits

For azimuth A clockwise from local north, use tangent direction `t = north*cos(A) + east*sin(A)`. A reference-sphere great-circle range d gives `u(d)=up*cos(d/R)+t*sin(d/R)`. Rotate this unit vector for DEM sampling when required. Let z be sampled sphere-relative terrain height, z0 the observer's DEM height, and h its radial height above that local surface:

```
horizontal = (R + z) * sin(d/R)
vertical   = z - z0 - h - 2*(R + z)*sin(d/(2*R))**2
angle      = atan2(vertical, horizontal)
```

This cancellation-safe formula is exactly the spherical observer-centered tangent calculation; it does not use a flat elevation-difference approximation. A smooth zero-height sphere gives `angle=-d/(2R)` for a surface observer at each finite sampled range. A raised observer approaches the spherical tangent dip `-acos(R/(R+h))` when the sampled range includes the tangent. Synthetic tests compare these and known ridges/crater rims/long-distance features with analytical Cartesian geometry.

Default: 360 azimuths, 5 m radial step, 2500 m maximum search, plus a first sample at 1 m. Include the radius endpoint once. The maximum known angle and its defining distance are recorded per ray. `sampled_distance_m` is the furthest **known sampled** range, not a contiguous-coverage claim; `first_missing_distance_m` and valid-sample fractions expose gaps. Boundary and nodata flags can coexist. Known sample maxima can survive a gap as model lower bounds, but no profile declares a direction unobstructed.

**Every returned profile is partial globally**, including profiles whose requested radial samples all have data. Terrain below 1 m range, between radial/azimuth samples and beyond the radius is unresolved. Azimuth density is not angular accuracy. Bilinear interpolation can smooth ridges and the upstream DEM already includes interpolated pixels. Uncertainty/count/clone layers are identified but not propagated. A 5 m-to-2.5 m radial refinement changed a real profile by up to about 0.052 degrees; this is a sampling-sensitivity observation, not an accuracy bound or proof of convergence.

The published study uses regional far-field terrain as well as these local grids. Our local-only horizon is not equivalent to its illumination products: coordinates, azimuth/radial sampling, height, far-field coverage and solar-disk treatment must match before any numerical comparison. No sufficiently matching independent horizon reference was available; real-data ingestion and internal tests are distinguished from external accuracy validation.

## Bounds and local grids

Requests allow 4-720 azimuths, radius 1-50000 m and radial step 1-1000 m, constrained by at most 500000 ray samples and a step no coarser than the selected DEM's spacing. Raster reads are clipped local windows, capped at 4500000 pixels; requests exceeding that memory budget fail explicitly. An observer without valid interpolation support is rejected. Exact poles are rejected because north-referenced azimuth is undefined; near-polar sites are supported.

`LunarDEM.window_for(...).grid()` prepares at most 4096 original height cells for future visualization. It returns lunar WKT/frame, geographic and projected corner origin, signed pixel spacing, sphere/vertical reference, original pixel-center heights, a matching nodata mask and dataset identity. Larger exports are rejected. No 3D viewer, map redesign or browser terrain payload was introduced.

## Windows installation and restoration

From the backend, retain the existing Python 3.12.16/uv setup:

```powershell
uv sync --frozen --extra science --extra terrain
uv lock --check
python -m lunascend.ephemeris.manage download
python -m lunascend.ephemeris.manage verify
python -m lunascend.terrain.manage download
python -m lunascend.terrain.manage verify
python -m lunascend.terrain.manage inspect
python -m lunascend.terrain.validation
python -m pytest -q -p no:cacheprovider
```

Use the environment's Python (or `uv run --frozen --extra science --extra terrain python ...`). Rasterio **1.5.2**, PyProj **3.8.0** have verified CPython 3.12 Windows x64 wheels recorded in uv.lock. Installed wheels report GDAL 3.12.2 and PROJ 9.8.1; no system GDAL/compiler was needed. Existing NumPy 2.5.4 and SpiceyPy 8.3.0 remain pinned. All previously locked package versions were preserved. Optional terrain installs add affine, attrs, pyparsing, pyproj and rasterio. The frontend lockfile is unchanged.

Native DE421 terrain needs the terrain extra and DEM; cross-frame requests additionally need science and both kernel sets. Base mock operation remains independent of all geospatial/science libraries and datasets, as verified by an import-blocking subprocess check. Missing optional terrain imports return HTTP 503. The download command fetches only allowlisted official sources, bounds bytes, verifies hashes before atomic replacement and reuses verified files. Data paths are project-relative; optional `LUNASCEND_TERRAIN_DIR` and existing `LUNASCEND_KERNEL_DIR` may override directories, with relative values resolved against the project root. No credentials are required. Another-PC restoration has not been rehearsed.

## API and reproduction

The separate **POST `/api/v1/terrain/horizon`** endpoint preserves `/api/v1/scenarios/analyze` behavior and the frontend's geometry-only parser. Example requests: [native DE421](../backend/examples/terrain-request.json), [same physical point in DE440/ME421 at a declared epoch](../backend/examples/terrain-request-de440.json). With the local backend running, from project root:

```powershell
$terrainBody = Get-Content backend/examples/terrain-request.json -Raw
Invoke-RestMethod http://127.0.0.1:8000/api/v1/terrain/horizon -Method Post -ContentType 'application/json' -Body $terrainBody
```

The result reuses HorizonProfile with optional backward-compatible distance/coverage fields, plus DEM-derived surface height, frame transformation, provenance and warnings. Missing dataset/library/kernel and invalid frame/coverage/resource requests return structured errors. HTTP handlers do not calculate terrain or download data. Frontend horizon visualization is deferred because safely displaying finite model lower bounds needs dedicated integration; existing scenario/map UI is unchanged.

Numerical evidence: [real metadata, full 360-direction profile, coverage, convergence, frame cases and benchmark](validation/step-7-results.json); [executed loopback API checks](validation/step-7-api-check.json). They do not alter the Step 3 reference files or label these horizons independently validated. Terrain-aware Sun/Earth visibility windows, power, communication, uncertainty propagation and mission feasibility remain future work.
