# Step 3 executed scientific comparison

The saved Horizons requests and responses were acquired on 2026-10-31 from the official JPL API. The offline comparison was executed successfully using SpiceyPy 8.3.0, CSPICE N0067 and NumPy 2.5.4. [The numerical report](step-3-results.json) contains every residual, tolerance, reference hash, model header, kernel hash and engine/script hash. [The plan](STEP_3_PLAN.md) set the tolerances before fetching or assessing these results.

## Configuration and actual results

Synthetic observers: south-polar (-89 degrees, 42 degrees east), mid-latitude (-45,15), near-equatorial (1,5). All use zero height above a 1737.4 km sphere and zero observer height. Epochs: 2026-11-14 00:00 UTC, 12:00 UTC and 2026-11-15 00:00 UTC. Both Sun and Earth centers are compared: 18 rows per method, 36 total. These are not surveyed landing sites.

| Comparison | Maximum absolute wrapped azimuth difference | Maximum absolute elevation difference | Predeclared criteria | Outcome |
| --- | --- | --- | --- | --- |
| Public geometric NONE vs Horizons topocentric ICRF vectors, NONE, projected to local ENU | 1.0330911095479678e-6 deg | 3.1318892013132427e-7 deg | 0.0001 deg per angle | 18/18 pass |
| Internal SPICE CN+S vs direct Horizons apparent AIRLESS AZ/EL | 5.898086214983778e-7 deg | 1.9815385599031288e-7 deg | Elevation 0.002 deg; azimuth 0.002/max(abs(cos(reference elevation)),0.1) deg | 18/18 pass |

Horizons responses identify DE441 translations and the observer frame as `MEAN_ME (high precision)`, with spherical radii 1737.4 km. The manual describes its lunar mean-Earth alignment via DE440 PA and the DE421 ME alignment. The implemented frame is explicitly MOON_ME_DE440_ME421, linked to the matched DE440 binary PCK by the NAIF FK. No IAU_MOON transformation is substituted. The exact live header differs from the manual's MOON_ME label; this acquisition detail was recorded in the plan without altering tolerances.

The geometric vector check uses separate ENU dot products but shares NAIF's J2000-to-lunar rotation, so it does not alone independently establish orientation. The direct apparent check supplies complementary orientation evidence. Horizons quantity 4 includes light-time, stellar aberration and gravitational deflection; diagnostic CN+S includes converged light-time and stellar aberration but not gravitational deflection. Both are airless, with no terrestrial refraction. DE440/DE441 translation differences, output precision and these correction differences can contribute residuals. The small residuals here do not prove those models identical.

The minimum Sun-Earth angular separation computed from the saved reference apparent AZ/EL pairs is 117.09566369593948 degrees, so this grid contains no solar-limb alignment. No occultation treatment or visibility product is inferred from this check.

## Actual public example

At the synthetic south-polar observer, 2026-11-14T00:00:00Z, correction NONE:

| Body | Azimuth clockwise from north | Elevation above geometric horizon |
| --- | --- | --- |
| Sun center | 84.65099127719394 deg | 1.6500961689197666 deg |
| Earth center | 316.82117188544953 deg | -3.919542379188271 deg |

The [request](../../backend/examples/scientific-request.json) and [complete result](step-3-example-result.json) preserve contracts and provenance. Below-horizon center elevation is a geometric direction, not a computed obstruction or visibility window.

## Limits and scope

This is executed cross-implementation agreement on nine site/epoch cases, not a global physical accuracy claim. Horizons and SPICE share JPL model heritage. Exact poles/zenith singularities, sampling, errors and API behavior have automated software tests, but poles were not included in the Horizons grid. Nonzero heights, other dates and other sites have not been independently reference-compared. Only matching saved site/epoch cases with matching engine hash, software and kernel fingerprint receive reference_compared metrics; every other case stays unvalidated. No metric is labeled globally validated.

The spherical surface is not LOLA terrain or a measured landing elevation. Heights must be supplied explicitly. Angles describe body centers without disks, limb occultation, terrain masking, atmospheric refraction, sunlight duration, Earth visibility windows, power, storage or radio links. CN+S is diagnostic only, not a public calculation setting. Future UTC relies on the last known offset in LSK 0012. Intervals crossing leap-second insertions are rejected because the current timestamp contract cannot represent :60. Another-PC restoration remains untested.

The frontend is unchanged and still presents preview/unavailable scientific fields. Its unresolved input metadata prevents a small safe integration; API output is documented for a later dedicated integration milestone.

## Reproduction and official references

Final software verification on Windows: 101 backend tests passed with the science extra and verified kernels; the retained 67 base tests also passed in a separate environment without SpiceyPy. Frontend TypeScript, all 17 tests and the production build passed without source changes. Dependency lock check passed offline. A live Uvicorn instance on loopback port 8001 returned HTTP 200 for health/info/OpenAPI and a contract-validated complete three-epoch scientific analysis, saved as the example result. Missing-kernel HTTP 503, wrong-frame HTTP 422, checksum failure, optional-library absence and concurrent deterministic calculations were exercised by tests. The only test warning is the existing Starlette HTTPX compatibility deprecation. Kernel verify passed. Git attributes preserve raw reference bytes and LF engine source across checkouts so saved evidence hashes remain portable.

From backend with the locked science extra and verified kernels, run `python -m lunascend.ephemeris.validation compare`. No network is required for comparison. `fetch` explicitly accesses Horizons and reuses hash-verified saved responses. Run pytest for software regressions; unit tests alone do not establish scientific accuracy.

Sources: [NAIF azlcpo](https://naif.jpl.nasa.gov/pub/naif/toolkit_docs/C/cspice/azlcpo_c.html), [NAIF spkcpo](https://naif.jpl.nasa.gov/pub/naif/toolkit_docs/C/cspice/spkcpo_c.html), [matched lunar frame kernel](https://naif.jpl.nasa.gov/pub/naif/generic_kernels/fk/satellites/moon_de440_250416.tf), [binary PCK comments](https://naif.jpl.nasa.gov/pub/naif/generic_kernels/pck/moon_pa_de440_200625.cmt), [Horizons manual](https://ssd.jpl.nasa.gov/horizons/manual.html), [Horizons API](https://ssd-api.jpl.nasa.gov/doc/horizons.html). Exact kernel URLs/versions/checksums are in the [manifest](../../data/manifests/spice-kernels.json).
