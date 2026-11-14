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
