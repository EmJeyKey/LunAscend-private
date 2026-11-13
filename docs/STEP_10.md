# Step 10 — Georeferenced lunar globe and local terrain viewer

## Completion and scope

Step 10 adds an interactive context globe, actual bounded NASA LOLA terrain, a linked native polar DEM map, original-raster inspection and returned scientific Sun/Earth directions. The Dashboard and Lunar Site Explorer share the existing MissionContext; Comparison can open a completed scenario in the Explorer. Existing ephemeris, terrain horizons, visibility, power, communications and resilience equations and saved reference values are unchanged. No Step 11 sensitivity work, deployment or publication is included.

The rendering stack is Three.js **0.187.0**, with its OrbitControls addon and **@types/three 0.187.0**. Both versions are exact in the frontend manifest/lock. No React Three Fiber, extra map framework or new Python dependency was introduced. Three loads in a separate dynamic chunk. Its upstream MIT license is bundled at `frontend/public/licenses/three-LICENSE.txt`. Original logo assets, local Marcellus/Manrope/IBM Plex Mono fonts and existing palette are preserved.

## Globe, local terrain and interaction

The global Moon is an explicitly labeled reference sphere with planetocentric latitude, east-positive longitude, graticules, poles, longitude labels and a selected-coordinate marker. There is no global DEM or undocumented lunar texture. Orbit, wheel/pinch zoom, reset/selected-site and south-pole presets are available. A globe click selects a new coordinate at the displayed scientific UTC epoch and requires renewed frame confirmation.

Local terrain uses retained **original DEM pixel-center heights**, spherical body-fixed placement, indexed triangles, computed normals and gold edges along the finite rendered boundary and nodata holes. Window half-width is selectable from 250–4000 m; maximum grid sides are 33, 65 or 129. This resolution is independent of the scientific horizon rays/radial step. Orbit, pan, zoom, top/reset presets and elevation colors are available. The final camera fit was widened after browser inspection found overly tight initial framing.

The connected 2D map uses the same real native lunar polar-stereographic mesh registration, with projected +X right and +Y up. Those map axes are explicitly distinguished from universally local east/north. It is not an Earth CRS or synthetic south-polar illustration. Picking a rendered face selects its nearest retained vertex coordinate; the backend then samples the **original DEM**, using existing four-finite-neighbor bilinear interpolation. Returned height and reference-sphere distance never come from exaggerated/interpolated display geometry. The exact input-frame coordinate can be adopted as the shared selected site, with frame reconfirmation.

## API and bounds

Two routes supplement the unchanged terrain-horizon endpoint:

- `POST /api/v1/terrain/mesh`: `MeshRequest` → `TerrainMesh` (`lola-render-mesh-v1`).
- `POST /api/v1/terrain/inspect`: `InspectionRequest` → `TerrainInspection`.

Requests reject extra fields, non-finite values, invalid frames/epochs and excessive extent/detail. Longitude is wrapped consistently. Half-extent is limited to 50–4000 m; grid side is restricted to 33/65/129; observer height is 0–10000 m. Maximum output is 16641 vertices and 32768 triangles. The existing reader's 4,500,000-source-pixel cap also applies. Only the manifest-registered dataset ID can resolve to data; clients cannot supply a filesystem path. Inspection is bounded to three half-extents around the anchor. One visualization worker per backend process is admitted; concurrent work returns explicit RESOURCE_LIMIT, and cancellation drains the worker before releasing the bound.

Responses carry native frame, full source CRS WKT, sphere/datum/units, source URL/SHA-256, exact bridge metadata, source window and retained dimensions, stride, projected axes, dataset/request bounds, native coordinates, original/retained height ranges, mask/omitted-cell counts, positions, proper rotation and boundary indices. The frontend validates consumed identity, epoch, datum, vectors, dimensions, masks and triangle indices before accepting a mesh. Missing datasets or optional libraries produce explicit unavailable errors; mock output never replaces missing scientific terrain.

## Coordinate transformations

The existing isolated exact-name NAIF bridge reconciles declared `MOON_ME_DE440_ME421` coordinates at an explicit coordinate epoch into native `MOON_ME_DE421`. Native DE421 API requests are also supported. No frame aliases, approximate bridge or Earth datum transform were added. The large DEM and additional terrain frame kernels remain outside Git under the existing pinned manifests.

For native planetocentric latitude φ and east-positive longitude λ:

`u = (cos φ cos λ, cos φ sin λ, sin φ)`

`p_body = (1737400 + h_DEM) u`

The local origin is the selected original-DEM surface `(R + h_site) u_site`. Existing native basis vectors define east E, radial up U and north N. Local rendering coordinates are `p_scene = [E; U; -N] (p_body - origin)`. This rotation is orthonormal with determinant +1: scene +X east, +Y up and −Z north. The observer marker is `(0, observer_height_m, 0)`; DEM height is included once in the origin and observer height once in marker elevation. There is no second DEM-height addition.

The context globe uses the proper body-to-scene rotation `(X,Y,Z) → (X,Z,-Y)`, so north is +Y and 90° east points toward −Z. Inverse geographic picking wraps longitude to [−180°,180°). Tests cover poles, southern latitudes, cardinal longitudes, round trips, native projection and outward triangle winding.

## Source pixels, nodata and exaggeration

Integer-stride decimation retains real pixel centers, including both window endpoints once. Endpoint spacing may differ from the interior stride. An integral mask checks **every original pixel spanned by a decimated cell**; any missing pixel omits both cell triangles, even if all four retained corners are finite. Clipped windows retain their actual extent. No geometry fills outside the dataset or missing cells. Source height range and retained mesh range are reported separately. The viewer is not a substitute for native-resolution horizon/hazard calculations.

At factor k (1/2/5/10), the renderer copies positions and adds `(k−1)(h−h_site) u_scene`. The spherical base curvature and selected-site datum remain intact; the original returned height arrays and all scientific products remain unchanged. **1× is true-scale spherical geometry.** Exaggerated surfaces may appear to intersect true-angle arrows differently; rendered intersections are not visibility classifications. Lighting is static and illustrative, with no shadow casting or physical illumination claim.

## Scientific directions and shared time

The browser transforms returned azimuth A and elevation e into local scene direction `(cos e sin A, sin e, −cos e cos A)`. It computes no ephemeris, visibility, power or RF equation. Global directions use returned DE440 azimuth/elevation at the returned per-epoch reconciled observer coordinate. Native local directions use the existing terrain-aware DE421 observation row. The frontend newly consumes and validates the already-returned `observer_geometry` metadata; it does not change the backend scientific contract. Historical payloads without that optional metadata remain readable, with unreconciled global overlays withheld.

The physical terrain anchor remains fixed in DE421 as the scientific sample changes. Its equivalent DE440 coordinate can vary with the exact per-epoch frame bridge. The globe marker follows that returned coordinate. Mesh requests remain tied to the declared anchor epoch, not the sample cursor. The existing sample index synchronizes numerical values, arrows, actual UTC and exact returned classifications. No binary classification interpolation or new ray casting occurs when moving the cursor or camera. Missing/polar-undefined/mock directions are withheld. Local arrows require native terrain-aware reconciliation. Arrow lengths/marker sizes are annotations, not physical body distance/size.

Input changes clear stale geometry/readouts, abort pending requests and ignore late responses. At most two completed mesh products are cached in memory; reload can explicitly bypass cache. Comparison's new Explorer action uses the existing inspectScenario transfer, preserving that completed result and settings. Shared controls, Analysis charts, errors, provenance, Resilience and Comparison remain in their existing stores/routes.

## Real NASA Site01 evidence

`docs/validation/step-10-results.json` contains a freshly executed real mesh/inspection, source hashes and comparison against the saved Step 9 scientific surface. Its saved Sun/Earth rows are clearly labeled historical Step 9 data, not a new ephemeris reference comparison. A separate live browser analysis of the same 24-hour interval was executed in the finishing session.

| Property | Executed result |
| --- | --- |
| Dataset | lola-site01-5m-v2020, NASA Site01 Connecting ridge |
| Source | https://pgda.gsfc.nasa.gov/data/LOLA_5mpp/Site01/Site01_final_adj_5mpp_surf.tif |
| Source SHA-256 | 3ba7b97cb00a2bcf21189c3aeb535f65afc21207154ab9f0d43c5bdc1f7e747e |
| Input DE440/ME421 at 2026-11-14 00:00 UTC | −89.46315760953222° N, −137.50097847854008° E |
| Native DE421 anchor | −89.4631577569723° N, −137.50198490762307° E |
| Radius/datum | 1737400 m sphere; height in meters above that sphere |
| Surface; observer | 1944.7670898436575 m; 2 m above original DEM |
| Surface residual versus saved scientific result | 0.0 m (numerical agreement, not external accuracy) |
| Requested window | ±1000 m in native projected coordinates |
| Original read / retained extent | 403 × 403 source pixels / 2010 × 2010 m pixel-center span |
| Native spacing / decimation | 5 m / stride 7, usually 35 m retained spacing |
| Retained mesh | 59 × 59 vertices; 6728 triangles |
| Original height range | 1675.1412353515625–1959.4962158203125 m |
| Retained height range | 1675.1412353515625–1958.5362548828125 m |
| Source nodata / omitted cells | 0 / 0 in this window |
| Real mesh adapter run | 1.7161102 s, one recorded run, not a guarantee |
| Demonstrated exaggeration | 1× and 5×; numerical heights unchanged |

| Native returned sample | Sun az/el; clearance (°) | Earth az/el; clearance (°) |
| --- | --- | --- |
| 2026-11-14 00:00 UTC | 264.110831 / 1.501603; +6.114151 | 136.244964 / −5.036239; −6.016613 |
| 2026-11-15 00:00 UTC | 251.925832 / 1.389872; +5.584551 | 134.858867 / −3.931761; −4.865149 |

Sun classification at both endpoints is `conditional_clearance`; Earth is `modeled_obstruction`. These values/classifications matched the live browser's rounded readouts. The 25-sample analysis used 3600 s temporal sampling, 2500 m horizon radius, 360 azimuth rays and 5 m radial step. These finite center classifications do not establish disk illumination or an RF link.

## Verification actually executed

- **239 backend tests passed**, including all existing SPICE/LOLA/engineering/resilience regressions and 17 new visualization cases. One existing Starlette/httpx TestClient deprecation warning remains. No scientific references were changed.
- **117 frontend tests passed** across eight files, including the existing 104 and 13 new transform/response/cleanup/static-geometry cases. Analytical direction checks compare actual native and global directions using saved exact rotation metadata. Renderer tests use real Three.js CPU geometry with a mocked GPU; they do not claim GPU validation.
- TypeScript and the frontend production build passed. The final frontend suite/check/build was repeated after the camera/copy correction. Dependency inspection confirms both Three packages at 0.187.0. Vite warns that the lazy Three renderer chunk exceeds 500 kB; this is a documented build warning, not a failed build.
- Live Windows in-app Chromium/WebGL: context globe, south-pole preset, zoom/reset, orbit drag, actual Site01 mesh, marker, true-scale/5× rendering, elevation metadata and shared Analysis inputs inspected. A live scientific request completed with 25 samples. Moving 1→25 updated UTC/directions/classifications while **mesh builds stayed 1 and vertex updates stayed 0**. Exaggeration alone incremented vertex updates, without another mesh build.
- The 2D compatibility switch removed the scene canvas (`canvasCount=0`) and showed the actual native polar window. Clicking an interior face returned **−89.48344561° N, −139.28463964° E, 1918.779 m, 790.742 m** reference-sphere distance, explicitly sampled from original DEM. Actual forced driver/context-loss failure was not injected in the browser; initialization failure, late creation and idempotent disposal are unit-tested.
- Selecting unsupported Polar ridge A cleared the previous mesh (zero submitted triangles/buffers), scientific result, arrows and timeline; the live API returned **OUTSIDE_COVERAGE**, shown in the scene and error text. No substitute surface appeared. Browser tests also exercised real request loading and navigation interruptions.
- Desktop and small-laptop viewport overrides (nominal 1280×900 and 785×722), plus a narrow 390×844 override, were inspected. Browser zoom produced measured CSS viewport sizes about 1306×918, 801×737 and 398×861. Document scroll width equaled client width (1290/786/382 px respectively); no whole-page horizontal overflow was observed. These are viewport checks, not physical-device or cross-browser certification. Temporary overrides were reset after checking.
- Comparison and Resilience routes/controls were revisited and remained usable. Their full regression tests passed; lengthy opportunity searches were not rerun for this visualization milestone. Browser GPU resource profiling and right-drag/touch-pan behavior were not exhaustively measured. Canvas removal on fallback/navigation and deterministic teardown tests support cleanup, but do not establish an exhaustive GPU leak audit.

The renderer has no continuous animation loop: frames are requested only for camera, resize, geometry, marker or overlay changes. Orbit damping and autorotation are off. Resize handling, DPR cap 1.5, geometry reuse, buffer disposal, listener/observer removal and RAF cancellation are implemented. Separate visualization request bounds avoid an unbounded worker queue; camera/time changes perform no terrain ray casting. This does not prove zero CPU contention with a simultaneous scientific search.

Observed standard-mesh main geometry buffers were **161.8 KiB**; submitted scene triangles were **7100** (6728 terrain plus annotation glyphs). One final mount measured **13.30 ms mesh construction / 1.00 ms CPU render submission**; another sample update measured **21.70 ms** submission with 1 build/0 vertex updates. Initial shader/setup submissions reached about 53.90–68 ms in inspection. These varying JavaScript timings exclude asynchronous GPU completion, other allocations and full frame latency. They are not FPS, GPU memory, a benchmark distribution or a modest-device guarantee.

Screenshots were saved outside Git, including the final terrain view and narrow missing-coverage state. No temporary screenshots, full DEM, development environments or kernel binaries are committed.

## Reproduction and portability

Use SETUP.md's pinned Windows Node/npm and Python/uv versions. From `frontend`, restore with `npm.cmd ci`; Three and types come from the committed lock. From `backend`, restore with `uv sync --frozen --extra science --extra terrain`, then restore/verify the existing SPICE kernels and Site01 DEM/frame kernels using their unchanged management commands/manifests. Start the existing FastAPI/Vite loopback services; the frontend uses the existing `/backend` proxy.

In Lunar Site Explorer, choose **Load Site01 reference**, confirm its DE440/ME421 coordinate epoch, and choose Local terrain or South polar map. This sets the reproducible 2026-11-14 00:00 UTC, 24 h, 2 m observer example while preserving other hardware assumptions. The viewer's confirmation alone does not run scientific analysis. Open Analysis, inspect terrain/settings and Run Analysis; return to Explorer to move the shared 25-sample timeline. Globe-only context requires no DEM or kernels; missing local science/terrain remains explicit.

From `backend`, `python -m lunascend.terrain.visualization_validation` reproduces the bounded real mesh/inspection and saved scientific-height comparison. It writes only the small derived validation report. Run `uv run --frozen --extra science --extra terrain pytest -q` for regressions; frontend checks are `npm.cmd test`, `npm.cmd run typecheck` and `npm.cmd run build`. The finishing session used the already-restored backend `.venv` directly, without reinstalling or changing its lock. Fresh-PC, encrypted-restore and disconnected-device rehearsals remain unperformed.

## Limits and recovery boundary

The depiction and illustrative lighting are independently unvalidated. A retained 5 m-source sample is not 5 m accuracy; decimation, finite extent, missing terrain and unresolved features remain limitations. No full global high-resolution terrain, hazard certification, descent/trajectory model, new astronomy, shadow validation, scoring, new battery or RF equations were added. Existing optimistic battery estimates remain conditional and do not guarantee survival. Scientific sensitivity review is the next separately authorized milestone.

Recovery tag: **step-10-3d-lunar-terrain**. Resolve the full local commit with `git rev-parse step-10-3d-lunar-terrain`. Existing remote configuration is retained; remote visibility was not independently verified. No push, deployment, publication, repository creation or access/visibility change was performed. Stop after Step 10.
