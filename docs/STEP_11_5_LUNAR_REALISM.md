# Step 11.5 — DEM-grounded Surface View and local horizon

## Delivered scope

The existing Lunar Site Explorer now offers **Surface View** alongside Global Moon, Local terrain orbit and South polar map. The scene uses the original NASA LOLA geometry, a fixed DEM-derived observer, black sky, neutral surface shading and native returned scientific directions. A separate 360° horizon profile shows the existing scientific model without inventing mountains outside the displayed mesh. Elevation colors remain selectable; grayscale shading is the default.

All scientific engines, public backend contracts, manifests, saved numerical references, dependency locks, battery/DTE equations and Resilience/Comparison logic are unchanged. The small prior Explorer responsive-width correction is preserved in this commit. There is no new numerical science model, texture download, runtime external imagery dependency or deployment.

## Actual data and coordinate identity

Source: **lola-site01-5m-v2020**, NASA PGDA Site01 Connecting ridge, `Site01_final_adj_5mpp_surf.tif`, original 5 m pixels. The existing manifest, CRS, masks, source hash and exact frame bridge remain authoritative. SHA-256: `3ba7b97cb00a2bcf21189c3aeb535f65afc21207154ab9f0d43c5bdc1f7e747e`. See [TERRAIN_DATA.md](TERRAIN_DATA.md) and [STEP_10.md](STEP_10.md).

The brief's rounded Site01 **−89.463158°, −137.501985°** describes the native **MOON_ME_DE421** location. It must not silently become a DE440/ME421 coordinate. The existing reference button retains **−89.46315760953222° N, −137.50097847854008° E**, declared in **MOON_ME_DE440_ME421 at 2026-11-14 00:00 UTC**. The backend resolves approximately **−89.4631577569723° N, −137.501984907623° E** in native DE421. Last digits can differ at floating-point roundoff between adapter calls. Latitude is planetocentric; longitude is east-positive.

MissionContext still owns the selected site, anchor epoch, observer height, scientific result and UTC sample. Switching viewing modes preserves that site and reuses the same mesh. Analysis and Resilience use the existing shared mission and frame conventions. Moving the sample cursor uses the returned per-epoch DE440 coordinate for the globe and fixed native DE421 terrain for the local view. No approximate frontend frame reconciliation was added.

## Ground-level camera

The existing backend supplies the original DEM bilinear surface height, body origin, proper body-to-scene rotation and `observer_scene_m`. Surface View uses that observer position directly. For Site01 this is **(0, 2, 0) m** in scene coordinates, above a **1944.7670898436575 m** sphere-relative DEM surface. DEM height and observer height are each included exactly once.

Existing spherical placement is retained:

`p_body = (1737400 + h_DEM) u(latitude, longitude)`

`p_scene = [east; radial_up; -north] (p_body - selected_DEM_surface_origin)`

The rendering direction for azimuth A clockwise from north and elevation e is:

`d_scene = (cos(e) sin(A), sin(e), -cos(e) cos(A))`

`camera_eye = observer_scene_m; camera_target = camera_eye + d_scene`

These are display rotations of backend geometry and returned angles, not another ephemeris or geodetic engine. Horizontal drag wraps through 360°. Vertical drag/accessible controls allow −89° to +89°, avoiding a singular camera at the zenith/nadir. N/E/S/W presets and “Look toward Sun/Earth” use native returned bearings. The readout reports actual applied camera azimuth/elevation. Surface View has no translational orbit/pan or arbitrary altitude. A positive observer height and supported DEM are required; zero-height or missing-data scenes do not substitute an aerial observer.

Surface View locks **1×** vertical scale. Orbit can use 1/2/5/10× with a visible warning; entering Surface View restores original true-scale positions, and orbit's selected exaggeration can be restored afterward. Exaggeration remains a copy of display vertices relative to the site's elevation, preserving the spherical base curvature and all original heights. A 0.05 m near plane supports the ground viewpoint.

## Scientific horizon presentation

The viewer reuses the active native horizon when its physical observer, original surface, dataset and source SHA match the mesh. Otherwise it requests the **existing** `/api/v1/terrain/horizon` engine using the backend-resolved native coordinates and configured observer height/radius/steps. The adapter validates identity, frame, array bounds, source hash, coverage and sampling before accepting a profile. No approximate DE440/native azimuth conversion or frontend clearance classification is performed.

The chart uses native azimuth/elevation and cardinal references. Solid gold joins adjacent known rays with sampled-radius coverage; dashed gold marks known partial lower bounds. Incomplete sectors are hatched; null endpoints create gaps, including the circular seam. The warning explicitly preserves unresolved terrain between rays and beyond the finite radius. The white bearing cursor is shown only for an active 3D Surface View, not as an invented orbit-camera measurement. Readouts include the nearest actual ray, defining range and first missing distance; absent metadata remains unknown.

At the demonstration settings, the mesh spans **2010 × 2010 m**, with a **59 × 59** retained grid, stride **7**, usually **35 m** spacing, **6728 triangles**, and original source spacing **5 m**. The scientific horizon uses **360 rays**, **1°** azimuth spacing, **5 m** radial steps and **2500 m** search radius. Its greater extent and finer radial sampling are deliberately separate from the mesh. Distant terrain is not fabricated to make the panorama match the chart. The chart is authoritative for this finite modeled horizon; neither depiction has independent horizon-accuracy validation.

Decimated triangles can differ from the original DEM near the camera. A CPU Three.js ray check confirms the Site01 2 m camera is above its actual retained triangles. A display-only check at mesh load/surface-mode entry withholds the panorama if there is no supported eye cell or a retained triangle crosses the eye/near-plane clearance; it does not raise the real observer. Choose finer mesh detail or change the actual observer height in Analysis when required. This guard does not certify subpixel terrain or change scientific clearance. Missing source pixels and finite boundaries remain unfilled.

## Sun, Earth and lighting

Local overlays require an original-source-matched terrain analysis and returned native DE421 direction row at the selected UTC sample. No mock or unreconciled direction is substituted. Sky points are annotation glyphs, with deliberately nonphysical angular sizes, not apparent disks. Only `conditional_clearance` centers receive a sky point; modeled obstruction, indeterminate or unavailable states retain numerical/bearing cues and are withheld from the sky. Both centers remain plotted at their true returned angles in the separate profile, including an obstructed Earth below the modeled horizon.

Lighting is illustrative, unshadowed directional light aligned to the returned native Sun plus ambient inspection fill. Without a returned Sun, the directional light is withheld locally. There is no atmosphere, blue sky, invented shadow accuracy or physical illumination claim. Mesh intersections, colors and lights never determine clearance, battery energy, DTE or mission survival. The globe retains static context lighting explicitly described as non-scientific.

## Real Site01 consistency check

`scripts/verify_lunar_surface.py` freshly calls the existing mesh and native horizon engines and compares against unchanged saved Step 9 evidence. It saves [step-11.5-surface-check.json](validation/step-11.5-surface-check.json), a small derived report. It does not rerun an independent ephemeris reference comparison or overwrite any original report.

At **2026-11-14 00:00 UTC**:

| Returned native quantity | Sun | Earth |
| --- | ---: | ---: |
| Azimuth / ° | 264.11083058462435 | 136.2449636825324 |
| Center elevation / ° | 1.5016027645265886 | −5.036238914765129 |
| Modeled terrain horizon / ° | −4.612548157097288 | 0.9803744697915846 |
| Center clearance / ° | +6.114150921623877 | −6.016613384556714 |
| Classification | conditional_clearance | modeled_obstruction |

Maximum fresh-versus-saved horizon residual: **0.0°**; all ray-coverage labels match. Surface height: **1944.7670898436575 m**. These are internal reproducibility checks, not independent accuracy bounds or confirmed complete visibility. The live browser also ran the existing 25-sample analysis, matching the rounded reference readouts. At 2026-11-15 00:00 UTC it showed Sun clearance **+5.585°**, Earth **−4.865°**, retaining the same classifications.

Reproduce from the repository root with the restored existing science/terrain environment:

```powershell
backend\.venv\Scripts\python.exe scripts/verify_lunar_surface.py
```

No setup/dependency/dataset requirement changed; SETUP.md's existing restoration commands remain sufficient.

## Official imagery investigation and fallback

Reviewed the official [QuickMap portal](https://quickmap.lroc.asu.edu/), [Moon Trek](https://trek.nasa.gov/moon/), [Moon Trek WMTS documentation](https://trek.nasa.gov/tiles/apidoc/trekAPI.html?body=moon), [LROC PDS archive](https://pds.lroc.im-ldi.com/data/), [WAC global product description](https://data.lroc.im-ldi.com/lroc/view_rdr/WAC_GLOBAL/) and [LROC terms](https://lroc.im-ldi.com/about/terms) during this milestone.

The documented real candidate **WAC_GLOBAL_E000N0000_008P** is a simple cylindrical global mosaic centered at 0° N/0° E, **8 pixels/degree**, nominal **3790.42 m/pixel**, declared bounds −180° to +180° E / −90° to +90° latitude. Its [official product page](https://data.lroc.im-ldi.com/lroc/view_rdr_product/WAC_GLOBAL_E000N0000_008P) lists a 15.83 MB PDS IMG and 3.96 MB TIFF. This is coarse global context imagery, not suitable local-detail evidence. Published mosaic metadata describes 643 nm WAC images, photometric normalization and acquisition from multiple epochs; photographic shadows would not represent the selected mission UTC.

The terms identify PDS-delivered products as public domain and request **NASA/GSFC/Arizona State University** credit, with instrument/product citations for research. This does not grant blanket rights to non-PDS site artwork. Product citation: Speyerer, Robinson, Denevi & LROC Team (2011), Lunar Reconnaissance Orbiter Camera Morphological Map of the Moon, LPSC abstract 2387. No agency endorsement is implied.

The PDS product request redirected to the NASA PDS store and could not be retrieved by the browsing tool; the README returned 403. This review therefore did **not** verify the complete delivered label/frame, pixel-center registration, actual polar valid-pixel mask or an exact image-to-DE421/DE440 alignment. The WMTS documentation requires each layer's capabilities/style/tile matrix; no selected local layer's complete registration chain was established. No undocumented tile endpoint, QuickMap screenshot, unrelated texture or synthetic crater image is used. No raw imagery archive was downloaded.

Accordingly **no optical texture is installed on the local mesh or global sphere**. The viewer exposes the candidate product and documented service links and retains elevation-shaded DEM geometry. The global sphere remains labeled context-only, with existing geographic orientation, selected-site focus and pole controls; no globally accurate relief or newly realistic basemap is claimed. This is an explicit imagery limitation, not a completed imagery-registration result. Core scientific analysis remains independent of external portals.

## Performance and fallback

The same GPU mesh persists across globe, orbit, polar and Surface View; time, camera bearings, horizon cursor and Sun/Earth annotations do not reconstruct terrain. Only changed mesh data/configuration rebuilds it. The existing two-product bounded request cache, bounded backend adapter, lazy Three.js import, DPR cap, on-demand RAF drawing, teardown and non-WebGL fallback remain intact. Exaggeration updates vertices without requesting a new DEM. Native horizon requests are bounded by existing server limits; no horizon calculation occurs on rotation or UTC cursor movement.

The 2D compatibility switch removes the canvas and shows the same registered polar DEM window. Surface-mode fallback is explicitly labeled **“2D fallback · no ground-level perspective”**. The horizon profile and numerical evidence remain available. No missing geometry is supplied outside dataset coverage.

## Verification performed in this milestone

- **245 backend tests passed**, including existing SPICE/LOLA/horizon, frame, contracts, engineering, resilience, visualization and registry cases. Existing Starlette/httpx deprecation warning remains. No backend source or reference fixture changed.
- **129 frontend tests passed** across ten files. Eight added cases cover original DEM + observer height, cardinal/360° camera directions, native identity/source gating, exact saved Site01 classifications, nodata/seam handling, native horizon boundary/failures, actual CPU Three.js observer/triangle clearance, sky-point suppression, true-scale lock, mesh reuse and refusal of a display surface crossing the DEM eye. Existing coordinate round trips, lunar curvature, marker orientation, extrapolation/exaggeration, exact returned frame-direction agreement, disposal and WebGL initialization-failure tests remain passing. GPU work is mocked in unit tests; browser verification is distinct.
- TypeScript and production build passed. Existing lazy Three renderer chunk exceeds 500 kB; no new dependency was added, and source maps remain disabled.
- Fresh reproduction script passed with 0.0° horizon residual and the unchanged reference SHA recorded in its report. Git review confirms original science/results/manifests/locks remain unchanged.
- Actual in-app Chromium/WebGL: Site01 ground perspective at 2 m; north-facing terrain; Sun and obstructed-Earth bearings; drag rotation from 0° to 316° with +6° elevation; 360° wrap to 0°; true-scale lock; optional 5× orbit; all four view switches with unchanged coordinates and **mesh builds 1**; 25-sample UTC synchronization; real profile and registered polar fallback inspected.
- Changing UTC first→last retained **1 mesh build / 0 vertex updates** in the initial observation. Camera drag and four-mode switching also retained **1 / 0** in the stable final instance. A recorded standard mesh build was **13.10 ms**, CPU render submissions around **0.3–0.7 ms** for several surface views, and main geometry buffers **161.8 KiB**. These single-machine JS measurements exclude GPU completion and are not FPS or cross-device guarantees.
- Outside-coverage Polar ridge A retained its original selected coordinates, returned **OUTSIDE_COVERAGE**, displayed unavailable observer/horizon, and submitted **zero terrain triangles/buffers**. No nearest-site substitution occurred. The independent-horizon path without prior ephemeris analysis was checked separately.
- Responsive browser checks used nominal 1280×900, 785×722 and 390×844 viewports (current zoom measured approximately 1306×918, 801×737 and 398×861). Document scroll width equaled client width: 1290, 786 and 382 px. The horizon chart has an internal 700 px scroll area, preserving readable axis labels without whole-page overflow. The selected-site panel fills its responsive column. Final Surface View and horizon screenshots were saved outside Git; temporary tabs were closed and viewport overrides reset. Actual forced GPU driver failure, physical network disconnection, cross-browser/mobile hardware and independent visual accuracy validation were not performed. Existing fallback ownership/failure tests and the actual 2D compatibility switch were executed.

## Limits and recovery

Rendering remains independently unvalidated. Finite terrain, decimation, subpixel features, unpropagated uncertainty and center-only geometry prevent global visibility or safety claims. The scene has no authentic optical basemap, physical Sun/Earth disks, validated shadows, fabricated distant relief, new battery/radio calculations or suitability score. Conditional/optimistic engineering results never guarantee survival.

Local recovery tag: **step-11.5-lunar-realism**. Resolve with `git rev-parse step-11.5-lunar-realism`. No push, deployment, publication, access/visibility change or new milestone is included. Existing remote configuration is untouched; remote privacy was not independently reverified. Stop after Step 11.5.
