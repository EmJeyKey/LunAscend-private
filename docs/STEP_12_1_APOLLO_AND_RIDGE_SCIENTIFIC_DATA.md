# Step 12.1 — Apollo and polar scientific site integration

Implemented with explicit terrain and historical-date limitations. Step 12 remains checkpointed at `87cf334b07100196ce47aba4aeb0a54c30d0c15f`, tag `step-12-apollo-lunar-opportunities`. No ephemeris, terrain-horizon, power, battery or DTE equation was changed.

## Registry and interaction

`data/manifests/scientific-sites.json` references the existing Apollo catalog and the new source-derived polar catalog. It retains the original Site01 observer separately from its parent Connecting Ridge study region, user-point policy and dated Artemis assessments. GET `/api/v1/exploration/site-registry` resolves those manifests. Existing Apollo API is preserved; POST `/api/v1/exploration/polar-sites` converts polar catalog coordinates with the existing exact per-epoch bridge.

Gold Apollo and cyan polar category controls are independent. Both categories coexist in the 3D context globe and the existing 2D photographic map. Marker selection updates shared mission state and the information panel, focuses the camera, and clears previous results. All six Apollo and thirteen polar globe pins were individually clicked and analyzed in the browser. All six Apollo 2D pins and a detailed Nobile 2D pin were clicked. Category toggling removed Apollo pins while retaining all thirteen polar pins.

Catalog points are stored in MOON_ME_DE421, planetocentric latitude and east-positive longitude. The inverse of the existing DE440-to-DE421 rotation supplies context coordinates at the displayed epoch. Scientific requests retain DE440/ME421 inputs and explicit coordinate epoch. Date changes reconvert the same catalog point before calculation, including Comparison; canceled conversions cannot overwrite edited inputs. Other user points still require explicit frame/height confirmation.

The dashboard explorer now spans the available workspace width, correcting obsolete grid placement that squeezed the current component into a narrow column. Controls and metrics remain below it. This is a focused layout correction, not a redesign.

## Actual terrain acquisition and coverage

[NASA PGDA product 78](https://pgda.gsfc.nasa.gov/products/78) and its saved README establish the polar products and DE421 convention. Thirteen native 65 × 65 windows (325 m square, 5 m grid) were extracted through budgeted HTTPS ranges. Each representative point is an actual valid DEM pixel with four-pixel interpolation support nearest the bounded interior window center. Pixel indices and source affine/shape are saved. These are **dataset-area markers, not landing-site coordinates**. No polygon centroid or map-image guess was used.

The thirteen bundled GeoTIFF fixtures total 263,037 bytes. Original full-resolution Site01 data and existing environmental/photographic assets were not removed or replaced. New window manifests pin checksums, original source identity and modification metadata, CRS, source window, nodata, scale, offset and vertical convention. Original source archives were not downloaded or committed.

The existing hash-checked DEM adapter selects each registered dataset explicitly. It never substitutes Site01 for an Apollo or another polar point. The existing spherical horizon engine uses the DEM surface height plus observer height once, lunar curvature, four-neighbor interpolation, finite coverage and nodata rules. The site panel requests a 100 m local horizon radius; all global horizons remain partial. A known local obstruction can be reported; conditional clearance is not clearance from distant terrain.

Height is relative to the 1,737,400 m sphere, in metres. Grid spacing is not independent accuracy. Separate native source-pixel slope, height-RMS, slope-RMS and LDEC samples were acquired with bounded reads and exact geographic registration. Different quality-raster extents were handled by projected coordinates, not reused DEM indices. Values and source URLs are in `data/manifests/polar-sites/quality.json`. They are not propagated through horizon or engineering equations. Fractional native LDEC values are preserved without interpreting them as fractional physical observations. A genuine zero is displayed as zero.

## Native coordinates

All coordinates below are MOON_ME_DE421, planetocentric / east-positive. Apollo rows are exact published LM points; polar rows are source-pixel dataset-area markers. The full unrounded polar coordinates and pixel indices are retained in the registry.

| Site | Latitude / � N | Longitude / � E |
| --- | ---: | ---: |
| Apollo 11 | 0.67416000 | 23.47314000 |
| Apollo 12 | -3.01280000 | -23.42190000 |
| Apollo 14 | -3.64589000 | -17.47194000 |
| Apollo 15 | 26.13239000 | 3.63330000 |
| Apollo 16 | -8.97340000 | 15.50110000 |
| Apollo 17 | 20.19110000 | 30.77230000 |
| Connecting Ridge | -89.46316789 | -137.47712070 |
| Shackleton Rim | -89.76688139 | -171.84697246 |
| Nobile Rim 1 | -85.43808502 | 37.36521878 |
| Peak Near Shackleton | -88.81112239 | 123.68896558 |
| de Gerlache Rim | -88.68331078 | -67.93012364 |
| Leibnitz Beta Plateau | -85.42655058 | 31.74134015 |
| Malapert Massif | -85.99470200 | -0.23695780 |
| de Gerlache�Kocher Massif | -85.82951324 | -116.32049967 |
| Amundsen Rim | -84.22878744 | 69.44290189 |
| Nobile Rim 2 | -83.95404481 | 58.82098270 |
| Connecting Ridge Extension | -89.03235212 | -101.99349717 |
| Haworth | -86.76383413 | -22.77780435 |
| Shoemaker | -87.18355016 | 62.83275747 |

## Per-site status

All rows below have individually verified 3D pin clicks, shared selection, native coordinates, selected-date numerical Sun/Earth displays and correct provider/missing-data behavior. Geometry was executed for 25 samples on both 2026-11-14 and 2026-11-15 through the real API.

| Site | Category / coordinate source | Terrain dataset and availability | Sun / Earth geometry | Terrain obstruction / DTE | Limitation |
| --- | --- | --- | --- | --- | --- |
| Apollo 11 — Mare Tranquillitatis | Historical LM; NASA NSSDCA DE421 | LROC NAC DTM metadata inspected; DEM not installed | Executed, both dates | Not calculated; no verified local DEM | Explicit assumed height; no Site01 substitution; pre-1972 historical dates unsupported |
| Apollo 12 — Oceanus Procellarum | Historical LM; NASA NSSDCA DE421 | LROC NAC DTM metadata inspected; DEM not installed | Executed, both dates | Not calculated; no verified local DEM | Explicit assumed height; no Site01 substitution; pre-1972 historical dates unsupported |
| Apollo 14 — Fra Mauro | Historical LM; NASA NSSDCA DE421 | LROC NAC DTM metadata inspected; DEM not installed | Executed, both dates | Not calculated; no verified local DEM | Explicit assumed height; no Site01 substitution; pre-1972 historical dates unsupported |
| Apollo 15 — Hadley Rille/Apennines | Historical LM; NASA NSSDCA DE421 | LROC NAC DTM metadata inspected; DEM not installed | Executed, both dates | Not calculated; no verified local DEM | Explicit assumed height; no Site01 substitution; pre-1972 historical dates unsupported |
| Apollo 16 — Descartes | Historical LM; NASA NSSDCA DE421 | LROC NAC DTM metadata inspected; DEM not installed | Executed, both dates | Not calculated; no verified local DEM | Explicit assumed height; no Site01 substitution; pre-1972 historical dates unsupported |
| Apollo 17 — Taurus-Littrow | Historical LM; NASA NSSDCA DE421 | LROC NAC DTM metadata inspected; DEM not installed | Executed, both dates | Not calculated; no verified local DEM | Explicit assumed height; no Site01 substitution; pre-1972 historical dates unsupported |
| Connecting Ridge (Site01) | Polar ridge; NASA PGDA valid DEM pixel | `pgda-site01-5m-window-v1`; bundled native window | Executed, both dates | Existing finite terrain / conditional DTE models executed | Representative study point; 100 m local radius, globally partial; RMS not propagated |
| Shackleton Rim (Site04) | Polar rim; NASA PGDA valid DEM pixel | `pgda-site04-5m-window-v1`; bundled native window | Executed, both dates | Existing finite terrain / conditional DTE models executed | Representative study point; 100 m local radius, globally partial; RMS not propagated |
| Nobile Rim 1 (Site06) | Polar rim; NASA PGDA valid DEM pixel | `pgda-site06-5m-window-v1`; bundled native window | Executed, both dates | Existing finite terrain / conditional DTE models executed | Representative study point; 100 m local radius, globally partial; RMS not propagated |
| Peak Near Shackleton (Site07) | Polar study region; NASA PGDA valid DEM pixel | `pgda-site07-5m-window-v1`; bundled native window | Executed, both dates | Existing finite terrain / conditional DTE models executed | Representative study point; 100 m local radius, globally partial; RMS not propagated |
| de Gerlache Rim (Site11) | Polar rim; NASA PGDA valid DEM pixel | `pgda-site11-5m-window-v1`; bundled native window | Executed, both dates | Existing finite terrain / conditional DTE models executed | Representative study point; 100 m local radius, globally partial; RMS not propagated |
| Leibnitz Beta Plateau (Site20) | Polar plateau; NASA PGDA valid DEM pixel | `pgda-site20-5m-window-v1`; bundled native window | Executed, both dates | Existing finite terrain / conditional DTE models executed | Representative study point; 100 m local radius, globally partial; RMS not propagated |
| Malapert Massif (Site23) | Polar massif; NASA PGDA valid DEM pixel | `pgda-site23-5m-window-v1`; bundled native window | Executed, both dates | Existing finite terrain / conditional DTE models executed | Representative study point; 100 m local radius, globally partial; RMS not propagated |
| de Gerlache–Kocher Massif (Site42) | Polar massif; NASA PGDA valid DEM pixel | `pgda-site42-5m-window-v1`; bundled native window | Executed, both dates | Existing finite terrain / conditional DTE models executed | Representative study point; 100 m local radius, globally partial; RMS not propagated |
| Amundsen Rim (DM1) | Polar rim; NASA PGDA valid DEM pixel | `pgda-dm1-5m-window-v1`; bundled native window | Executed, both dates | Existing finite terrain / conditional DTE models executed | Representative study point; 100 m local radius, globally partial; RMS not propagated |
| Nobile Rim 2 (DM2) | Polar rim; NASA PGDA valid DEM pixel | `pgda-dm2-5m-window-v1`; bundled native window | Executed, both dates | Existing finite terrain / conditional DTE models executed | Representative study point; 100 m local radius, globally partial; RMS not propagated |
| Connecting Ridge Extension (SL3) | Polar ridge; NASA PGDA valid DEM pixel | `pgda-sl3-5m-window-v1`; bundled native window | Executed, both dates | Existing finite terrain / conditional DTE models executed | Representative study point; 100 m local radius, globally partial; RMS not propagated |
| Haworth (Haworth) | Polar crater area; NASA PGDA valid DEM pixel | `pgda-haworth-5m-window-v1`; bundled native window | Executed, both dates | Existing finite terrain / conditional DTE models executed | Representative study point; 100 m local radius, globally partial; RMS not propagated |
| Shoemaker (Shoemaker) | Polar crater area; NASA PGDA valid DEM pixel | `pgda-shoemaker-5m-window-v1`; bundled native window | Executed, both dates | Existing finite terrain / conditional DTE models executed | Representative study point; 100 m local radius, globally partial; RMS not propagated |

The existing Site01 scientific observer remains available through Load Site01 reference/example using `lola-site01-5m-v2020`, its original 16 km full DEM and original settings. Connecting Ridge uses a separately identified representative sample; it does not replace that observer. Custom points have geometry when frame/height are confirmed, and terrain only where the selected dataset genuinely covers the requested position.

## Actual numerical evidence

API snapshot: 24 hours, 1-hour sampling, both endpoints once (25 samples). Polar observer height 2 m; 100 m terrain radius, 5 m radial step. Hypothetical hardware: 2 m² fixed-horizontal panels, efficiency 0.25, electrical efficiency 0.9, irradiance 1361 W/m², 50 W load, 500 Wh battery, 100% initial charge, 10% reserve, charge/discharge efficiencies 0.95, 1° DTE clearance. Apollo geometry uses an explicitly assumed 0 m sphere-relative surface height and 0 m observer height, without terrain/engineering.

| Point | DEM height / m | Sun elevation / ° | Earth elevation / ° | Source slope / ° | Source height RMS / m | Conditional DTE / s |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Connecting Ridge | 1944.967651 | 1.389653 | -3.931589 | 3.623312 | 0.289222 | 0.000000 |
| Shackleton Rim | 771.474243 | 1.621723 | -3.781901 | 32.870819 | 0.262659 | 0.000000 |
| Nobile Rim 1 | 5947.434082 | 2.571292 | -0.055966 | 14.405970 | 0.666991 | 86400.000000 |
| Peak Near Shackleton | 1644.928345 | 2.729769 | -4.256355 | 5.710314 | 0.318030 | 0.000000 |
| de Gerlache Rim | 1793.793945 | 0.240802 | -3.002566 | 1.022973 | 0.459154 | 57600.000000 |
| Leibnitz Beta Plateau | 6398.582031 | 2.132348 | 0.223218 | 8.344003 | 0.246636 | 0.000000 |
| Malapert Massif | 4783.953613 | -0.117675 | 0.447855 | 3.621150 | 0.543721 | 3600.000000 |
| de Gerlache–Kocher Massif | 2706.125732 | -1.082976 | -5.220430 | 6.709492 | 0.385042 | 86400.000000 |
| Amundsen Rim | 399.476654 | 5.630232 | -1.763416 | 3.888064 | 1.141979 | 0.000000 |
| Nobile Rim 2 | 1009.441162 | 4.960498 | -0.653028 | 4.179966 | 0.188111 | 86400.000000 |
| Connecting Ridge Extension | 1180.167480 | 0.777755 | -3.710105 | 10.621359 | 0.145162 | 0.000000 |
| Haworth | 1628.816162 | -0.819233 | -0.515166 | 4.816021 | 0.234643 | 0.000000 |
| Shoemaker | 548.187317 | 3.304049 | -2.380186 | 5.693264 | 0.343119 | 43200.000000 |

These are saved executed examples, not hardcoded website values. `docs/validation/step-12.1-api-check.json` contains all 38 site/date records, conservative/optimistic power totals and DTE qualifications. `docs/validation/step-12.1-browser-results.json` contains raw numeric DOM values following the 19 individual globe selections. Browser defaults in that file were 48 hours starting 2026-11-14 06:00 UTC and a 0 m observer, so those examples intentionally differ from the API table above.

The final browser date-change check selected Nobile Rim 1, navigated to Analysis, changed UTC to 2026-11-15 00:00, set 24 hours, and used Run Full Analysis. The native point was reconverted and 25 fresh samples appeared: Sun elevation 2.5712923922°, DEM surface height 5947.4340820313 m, conservative solar energy 0 Wh, optimistic solar energy 773.0718670061 Wh (0 m observer). This is an assumed engineering estimate, not a survival guarantee.

Original Site01 Step 12 regression remains separately saved: Nov 14 optimistic solar 371.3641257111 Wh; Nov 15 343.4146375967 Wh; difference 27.9494881144 Wh. Both dates fail the configured conservative and optimistic battery models. No equations or saved reference values were changed.

## Apollo terrain and historical checks

All six [official LROC NAC DTM catalogs](https://data.lroc.im-ldi.com/lroc/view_rdr/NAC_DTM_APOLLO11), READMEs and PDS labels were inspected and saved under `data/manifests/apollo-terrain`. Labels identify equirectangular, planetocentric, east-positive cartography on a 1737.4 km sphere; per-product versions, extents, pixel scales and nodata are retained. READMEs include LOLA ties and error measures. These files did not establish an accepted exact dynamical-frame/vertical registration for local ingestion. No full Apollo raster was downloaded, no photograph shadow was interpreted as elevation, and no Site01 terrain was applied to an Apollo point. Confidence products exist upstream; color slope images are not treated as numerical slope rasters. Apollo terrain/DTE therefore remain explicitly unavailable while modern-date geometry works.

[ALSJ computed landing-event Sun/Earth tables](https://apollojournals.org/alsj/alsj-EarthSun_AltAz.html), revised 2025-05-07, are preserved as six reference records in `data/manifests/apollo-historical-reference.json`. These are computed tables, not direct observations. Their coordinates differ from modern LM coordinates and do not declare an exact dynamical realization. Apollo 11 Earth altitude prints `59:43`; this ambiguous value is retained as unavailable.

Apollo 11/12/14/15 historical calculations were not executed because the existing UTC contract excludes pre-1972 dates. This is a time-model support limit, not a claim that NASA ephemeris files are absent. Apollo 16/17 were executed with the installed kernels and modern native LM points at the exact ALSJ timestamps; diagnostic residuals follow. No new reference-compared/validated stamp is assigned.

| Mission / UTC | Sun altitude residual / ° | Sun azimuth residual / ° | Earth altitude residual / ° | Earth azimuth residual / ° |
| --- | ---: | ---: | ---: | ---: |
| apollo-16 / 1972-04-21T02:23:35Z | -0.00483393 | -0.00517193 | -0.03249011 | -0.01969580 |
| apollo-17 / 1972-12-11T19:54:58Z | 0.01483090 | 0.02112360 | -0.23877472 | -0.00348111 |

Coordinate, observer, ephemeris and correction assumptions can affect comparisons; the residuals are not attributed to one cause without additional evidence. Apollo 17 uses ALSJ 19:54:58 for this comparison; the existing NASA mission-summary historical selector retains 19:54:57. Saved Horizons comparisons remain unchanged (36 rows). Horizons shares JPL ephemeris heritage and is not wholly independent observational evidence.

## Artemis, provenance and data use

Nine NASA October 2024 candidate-region names remain as a dated, unranked reference catalog, distinct from similarly named PGDA study areas. The August 2022 assessment is retained as a separate historical reference. Verified region boundaries were not installed; no touchdown points or polygons were invented. NASA/JPL SPICE remains the astronomical engine; NASA LOLA supplies polar terrain; Moon Trek/WAC/NAC images remain optical context with unverified image-to-DEM registration. Existing environmental layers remain limited long-term averages near Site01, never substituted for selected-date conditions.

Cite NASA/GSFC LOLA and Barker et al. (2021), PSS 203, 105119, doi:10.1016/j.pss.2020.105119; NSSDCA/Wagner et al. (2017) for LM coordinates; LROC/ASU and Henriksen et al. for Apollo DTM metadata; ALSJ/Fjeld/Scotti for historical tables. Preserve supplied product metadata and acknowledgments. No blanket third-party licensing grant or NASA/CSA endorsement is implied; review upstream reuse conditions for redistribution beyond this local educational prototype.

## Restore and reproduce

- Restore the existing locked science/terrain extras and verified kernels using SETUP.md. Original Site01 restoration is unchanged.
- Small polar terrain fixtures and hash manifests are tracked. `backend/.venv/Scripts/python.exe scripts/prepare_site_registry.py` verifies cached windows first; missing windows use bounded range reads from exact catalog links. No whole raster reads; per-product 8 MB / 100-request budget, 128 KiB caching.
- `backend/.venv/Scripts/python.exe scripts/prepare_polar_quality.py` preserves successful saved samples and retrieves missing quality values only. `scripts/inspect_apollo_terrain.py` downloads bounded metadata, not Apollo DEM archives.
- `backend/.venv/Scripts/python.exe scripts/verify_step12_1.py` explicitly runs the 38 site/date cases plus supported historical diagnostic comparisons against the local API. This is not automatic background work.
- Kernels, original full Site01 data, environments and large scientific archives remain outside Git. No credentials or external services are needed for local calculations once restored; uncached optical tiles and optional restoration require network access.

## Verification and remaining limits

- Phase A: 281 backend tests, 182 frontend tests, TypeScript/build, real Site01 two-date and Apollo/browser/map checks; see STEP_12.md.
- Phase B: full backend suite executed: **297 passed**, one existing Starlette/httpx deprecation warning. After final registry availability handling, focused registry/exploration checks were rerun; **20 focused tests passed**.
- Frontend full suite: **188 passed**; TypeScript and production build passed. Existing >500 kB chunk advisory remains. Comparison tests cover exact epoch reconciliation, shared identical requests and rejection of late conversions after edits.
- Browser: all 19 globe pins clicked and analyzed individually, all six Apollo 2D pins, detailed Nobile 2D marker, both categories together and independent toggle, actual dates/numbers, scientific catalog label, existing photographic tiles and shared analysis workflow. A transient request failed during local backend reload while files were being changed; the same unchanged scientific request succeeded on retry. No fabricated fallback was used.
- Dashboard width measured equal to available workspace (634 CSS px in a 918 px viewport), without document overflow. Native multi-touch and an independent terrain-accuracy study were not executed in this milestone.
- Scientific limits: finite 100 m new-site windows, unresolved distant terrain, center-only visibility, sampled intervals, unpropagated uncertainties, conditional DTE without radio link budget, assumed hardware and no survival guarantee. Apollo terrain and four early historical dates remain unsupported as explained above. No universal ranking or flight-safety claim.

Stop after Step 12.1. Local recovery only; no push, deployment or later milestone.
