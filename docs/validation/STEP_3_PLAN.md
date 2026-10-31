# Step 3 validation plan — fixed before reference comparisons

Recorded 2026-10-30 before obtaining/assessing Horizons comparison values.

## Model

Public calculations: SPICE azlcpo, ELLIPSOID normal, observer fixed in MOON_ME_DE440_ME421, spherical Moon radius 1737.4 km, planetocentric latitude, east-positive longitude. North-clockwise azimuth; positive elevation above radial local tangent. Target centers Sun (10), Earth (399). Correction NONE (geometric). No refraction, terrain, body-disk visibility or engineering calculations.

Use de440s.bsp, moon_pa_de440_200625.bpc, moon_de440_250416.tf, pck00011.tpc and naif0012.tls from NAIF. Actual checksums/coverage will be recorded after acquisition, not invented. Moon ME frame is the DE440 orientation rotated toward the DE421 mean-Earth realization; IAU_MOON and principal-axis coordinates are not substituted.

## Reference cases

Synthetic reference positions (not surveyed landing sites), all at zero height above the declared sphere:

| ID | Planetocentric latitude / deg | East longitude / deg |
| --- | ---: | ---: |
| south-polar | -89 | 42 |
| mid-latitude | -45 | 15 |
| near-equatorial | 1 | 5 |

At each site: 2026-11-14 00:00:00, 2026-11-14 12:00:00, 2026-11-15 00:00:00 UTC. Both Sun and Earth. Save exact request parameters and complete unmodified Horizons responses. Verify the response's Moon radius, pole model, ephemeris identifiers, epochs and correction settings before interpreting residuals.

## Two complementary comparisons

1. **Geometric vector reference (primary):** Horizons topocentric VECTORS, CENTER=coord@301, COORD_TYPE=GEODETIC on its spherical Moon, VEC_CORR=NONE, REF_SYSTEM=ICRF, REF_PLANE=FRAME, OUT_UNITS=KM-S, TIME_TYPE=UT. Rotate these independently supplied vectors with the pinned NAIF frame and project using a separate ENU dot-product calculation. Compare against the public azlcpo NONE results. This cross-check shares the NAIF local rotation, so alone it does not independently verify lunar orientation.
2. **Direct apparent AZ/EL (orientation check):** Horizons OBSERVER quantity 4, AIRLESS. Compare with diagnostic SPICE azlcpo CN+S (converged light time and stellar aberration). This diagnostic is not a public API correction mode and does not relabel the geometric outputs. Horizons additionally models gravitational light deflection; SPICE azlcpo does not. Differences must be reported, not removed by changing tolerances.

## Acceptance criteria fixed in advance

- Geometric reference elevation and wrapped azimuth residuals: <= **0.0001 degree** each. At these modern epochs the models are closely aligned; this 0.36 arcsecond software-consistency allowance exceeds output rounding and the sub-meter ME-frame realization offsets documented by NAIF. It is an acceptance threshold, not a claimed physical accuracy.
- Direct apparent elevation residual: <= **0.002 degree**. Apparent azimuth threshold: **0.002 / max(abs(cos(reference elevation)), 0.1) degree**. This allows for ray-model differences and azimuth's conditioning near zenith; report actual maxima as well as each case's threshold. The 7.2 arcsecond base is a conservative consistency allowance, not an uncertainty estimate. Do not accept comparisons through solar-limb occultation without a separate treatment.
- Wrapped azimuth difference: abs((computed-reference+180) modulo 360 - 180). At exact lunar poles, or numerical zenith/nadir, azimuth is undefined and excluded rather than assigned zero.
- All designated available cases must satisfy the declared thresholds. A failed criterion is reported as failure; do not relax it after inspection. Preserve model/configuration differences in the report.

## Interpretation and reproducibility

Executed reference comparisons establish agreement over this finite test grid only. Horizons and SPICE share JPL ephemeris heritage; this is an independent implementation/service comparison, not independent observational evidence. No global accuracy, terrain validity, spacecraft feasibility or landing-site suitability follows from passing.

If Horizons is unreachable or a response cannot be matched correctly, retain reproducible scripts and mark independent validation incomplete. Unit tests remain software tests. Record package/toolkit versions, kernel hashes, request/response hashes and actual numerical residuals in the final report.

Acquisition note, 2026-10-31: the live Horizons service identifies the observer pole model as `MEAN_ME (high precision)` and ephemerides as DE441, rather than the `MOON_ME` header spelling illustrated in its manual. The parser accepts this explicit high-precision ME label and preserves it verbatim in the report. This is a header-format clarification; the designated cases, correction settings and predeclared numerical tolerances are unchanged.
