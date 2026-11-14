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
