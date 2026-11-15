# Sun and Earth scientific data audit

Executed 2026-11-15. Scope: diagnostic and integration repair; no scientific equations, frame conventions, kernel/reference files or graph redesign changed. Earlier uncommitted explorer presentation changes were preserved and included in the recovery snapshot.

## Confirmed root causes and repairs

1. **Not requested:** a real control request with `terrain_enabled=false`, `communication_enabled=false` returned 25 SPICE observations, `terrain_visibility=null`, `communication=null`. This exactly reproduces the reported 25-geometry-sample / no-visibility condition. `buildRequest` in `frontend/src/lib/analysis.ts` faithfully serializes those flags. `ScientificAnalysisProvider.analyze` dispatches geometry without terrain when disabled. This is neither missing NASA data nor a field-name mismatch.
2. **Unclear presentation:** `conditionSamples` formerly reduced valid geometric-only results to “Terrain visibility not calculated”, omitting whether the center was above/below the geometric horizon. It now retains the not-calculated terrain state while stating actual center elevation and above/on/below relation. A calculated zero remains a calculated zero. Below a geometric horizon does not, by itself, establish obstruction by an actual depressed local skyline.
3. **Inconsistent preflight:** `MissionControls.apply` previously verified/selected installed terrain only for Full Analysis. Ordinary terrain runs could retain an unrelated/stale dataset. Both terrain-enabled actions now call the same actual-pixel coverage selector, select its supported dataset, and bound radius to its recommended finite window. Normal runs retain explicit engineering flags; only Full Analysis enables all supported products. Geometry-only runs are named **Run Geometry Only**. Explicitly disabled terrain is respected, not silently enabled.
4. **Missing explanatory metadata:** analysis API now adds typed `availability` records for Sun/Earth geometry, Sun/Earth terrain visibility, power and DTE. Codes distinguish geometric-only, terrain-qualified, not-requested, missing dataset, unavailable/invalid dataset, outside coverage, frame error, observer/settings errors and calculation failure. Per-time conditional-clearance/obstruction/unknown classes remain the existing authoritative fields. Coverage API retains each attempted dataset's error code and message. The frontend validates and displays availability reasons and preserves matched coverage notes.
5. **Actual data limits:** registered Apollo terrain and global terrain are not installed. No replacement height is inferred. The user can explicitly supply a hypothetical sphere-relative height for geometry; terrain/DTE remain unavailable. A failed terrain request with no supported height cannot legitimately invent a geometry observer. Existing separate geometry mode remains functional; valid geometry is not reclassified as a terrain result.

## Executed results

All five locations: 2026-11-14 00:00 UTC to November 15 00:00 UTC, hourly, **25 returned samples including endpoints**. Table gives first-sample DE440/ME421 geometric elevations; native terrain values follow separately. Exact inputs, all samples, coverage decisions, flags, provenance, horizons and engineering outputs are saved in `docs/validation/sun-earth-audit.json`. Numbers are fresh local API outputs, not hardcoded response replacements or new external validation.

| Location | SPICE Sun | SPICE Earth | DEM installed | Horizon supported | Sun visibility | Earth visibility | Problem |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Site01 original observer | 1.501603° | -5.036239° | Yes | Finite, yes | conditional_clearance | modeled_obstruction | No calculation or transport failure; global clearance unresolved |
| Shackleton Rim | 1.667737° | -4.878272° | Yes | Finite, yes | conditional_clearance | modeled_obstruction | No calculation or transport failure; global clearance unresolved |
| Nobile Rim 1 | 1.610707° | -1.080280° | Yes | Finite, yes | conditional_clearance | conditional_clearance | No calculation or transport failure; global clearance unresolved |
| Apollo 15 | -30.041654° | 67.685174° | No registered coverage | No | Geometry only | Geometry only | Terrain unsupported locally; explicit hypothetical 0 m used for geometry |
| Outside installed terrain (10N 10E) | -26.479486° | 77.485755° | No registered coverage | No | Geometry only | Geometry only | Terrain unsupported locally; explicit hypothetical 0 m used for geometry |

### Site01 original observer

- Input DE440/ME421: -89.4631576095° N, -137.5009784785° E. Observer 2.0 m.
- SPICE azimuths, clockwise north: Sun 264.109827°, Earth 136.243960°.
- Readable DEM `lola-site01-5m-v2020`, source elevation 1944.767090 m above radius 1,737,400 m; native DE421 -89.4631577570° N, -137.5019849076° E. Valid four-pixel observer support confirmed by coverage API.
- Sun: native elevation 1.501603°, horizon -4.612548°, clearance 6.114151°, `conditional_clearance`, ray coverage `sampled_radius`.
- Earth: native elevation -5.036239°, horizon 0.980374°, clearance -6.016613°, `modeled_obstruction`, ray coverage `sampled_radius`.
- DTE first sample `modeled_obstruction` at configured 1.0° margin. Not an RF link. Horizon radius 2500.0 m; all horizons remain globally partial.

### Shackleton Rim

- Input DE440/ME421: -89.7668865732° N, -171.8450409180° E. Observer 2.0 m.
- SPICE azimuths, clockwise north: Sun 298.462381°, Earth 170.614867°.
- Readable DEM `pgda-site04-5m-window-v1`, source elevation 771.474243 m above radius 1,737,400 m; native DE421 -89.7668813899° N, -171.8469724577° E. Valid four-pixel observer support confirmed by coverage API.
- Sun: native elevation 1.667737°, horizon -28.107985°, clearance 29.775722°, `conditional_clearance`, ray coverage `sampled_radius`.
- Earth: native elevation -4.878272°, horizon 4.280717°, clearance -9.158989°, `modeled_obstruction`, ray coverage `sampled_radius`.
- DTE first sample `modeled_obstruction` at configured 1.0° margin. Not an RF link. Horizon radius 100.0 m; all horizons remain globally partial.

### Nobile Rim 1

- Input DE440/ME421: -85.4380843237° N, 37.3651041010° E. Observer 2.0 m.
- SPICE azimuths, clockwise north: Sun 89.384242°, Earth 321.537765°.
- Readable DEM `pgda-site06-5m-window-v1`, source elevation 5947.434082 m above radius 1,737,400 m; native DE421 -85.4380850182° N, 37.3652187780° E. Valid four-pixel observer support confirmed by coverage API.
- Sun: native elevation 1.610707°, horizon -11.859350°, clearance 13.470057°, `conditional_clearance`, ray coverage `sampled_radius`.
- Earth: native elevation -1.080280°, horizon -5.235420°, clearance 4.155140°, `conditional_clearance`, ray coverage `sampled_radius`.
- DTE first sample `conditional_access` at configured 1.0° margin. Not an RF link. Horizon radius 100.0 m; all horizons remain globally partial.

### Apollo 15

- Input DE440/ME421: 26.1323957857° N, 3.6333065050° E. Observer 2.0 m.
- SPICE azimuths, clockwise north: Sun 75.596652°, Earth 192.907529°.
- No valid installed/registered DEM at this point. Horizon, clearance, terrain visibility and DTE cannot be produced. The 0 m surface is an explicit hypothetical input, not a measured elevation. Registered terrain ingestion is needed; no Site01 substitution.

### Outside installed terrain (10N 10E)

- Input DE440/ME421: 10.0000000000° N, 10.0000000000° E. Observer 2.0 m.
- SPICE azimuths, clockwise north: Sun 86.732244°, Earth 244.113181°.
- No valid installed/registered DEM at this point. Horizon, clearance, terrain visibility and DTE cannot be produced. The 0 m surface is an explicit hypothetical input, not a measured elevation. Registered terrain ingestion is needed; no Site01 substitution.


## Source and registration audit

- **SPICE**: installed pinned NAIF/JPL kernel set loaded in the running service (`scientific_calculations_available=true`). All five date-specific API runs produced Sun/Earth azimuth/elevation. Existing ephemeris regressions re-executed, including saved Horizons comparisons, kernel checks, time/frame conventions and finite validation scope. Horizons is saved comparison evidence, not a runtime dependency; shared JPL ancestry means this is not independent ephemeris validation. The 36 saved comparison rows were not edited.
- **LOLA PGDA 78**: [official products](https://pgda.gsfc.nasa.gov/products/78), verified online during this audit. Site01 Connecting Ridge, Site04 Shackleton Rim, Site06 Nobile Rim 1 are listed. Source products are 5 m/pixel south-polar stereographic X/Y in meters, MOON_ME of DE421, heights above the 1,737,400 m sphere. Original Site01 and bounded 325 m windows are installed locally and readable. Actual local windows, manifests, SHA256 and masks remain the source of truth. No downloads required for the three tested polar observers. Other source ROIs/DTM extents are not inferred from a marker or nominal product name.
- **Apollo 15 LROC NAC DTM**: [official product](https://data.lroc.im-ldi.com/lroc/view_rdr/NAC_DTM_APOLLO15), verified online. Existing saved label reports equirectangular projection, sphere radius 1737.4 km, 25.5922248–26.5361178° N and 3.5026368–3.6901291° E. Metadata are retained locally; raster is not installed as a scientific provider. Exact dynamical frame realization and local vertical/coordinate registration have not been demonstrated. Download alone is insufficient: establish and verify registration before using for horizons. Photographs already installed/integrated are not LROC elevation providers.
- **Outside point 10°N, 10°E**: backend coverage tested all installed compatible windows and returned `outside_dataset_coverage`. This is not a missing SPICE ephemeris. No claim of high-resolution point coverage from an uninstalled product is made. [SLDEM2015](https://pgda.gsfc.nasa.gov/products/54) is published for 60°S–60°N; no corresponding raster is installed. Its official page was verified, but projection/realization for any chosen tile must still be checked against its label before ingestion.
- **Broader south-polar coverage**: [PGDA 90](https://pgda.gsfc.nasa.gov/products/90), verified online, publishes DE421 MOON_ME south-polar stereographic COGs at several bounds/scales (e.g. 80–90°S, 20 m/pixel). These larger products are not installed. Bounded source-window ingestion, checksums, valid-pixel/mask checks and exact frame/height reconciliation would be required. No automatic large downloads were made.

## End-to-end field trace

`SiteChooser` / globe input → retained `site.native` catalog coordinates → `resolveCatalogEpoch` exact epoch conversion → `MissionControls` coverage preflight → `buildRequest` settings → `/api/v1/scenarios/analyze` → ScientificAnalysisProvider → existing geometry / visibility / engineering services → strict ScenarioResult → `parseResult` → MissionContext result + shared sample index → `conditionSamples`, NumericalResults, TerrainVisibilityPanel and existing graphs.

Geometry fields: `observations[i].sun_azimuth_deg.value`, `sun_elevation_deg.value`, `earth_azimuth_deg.value`, `earth_elevation_deg.value`. Terrain: `terrain_visibility.surface_elevation_m`, `observer_geometry`, `observations[i].sun/earth.{horizon_elevation_deg,clearance_deg,classification,coverage,reason}`. DTE: `communication.access_samples[i].classification` and configured margin. Samples are matched by UTC in the human summary. Native DE421 terrain numbers are not subtracted from DE440 values in React; the backend owns reconciliation and clearance.

Fresh five-location API responses are consumed by frontend integration tests through the real typed parser and human summaries. All 25 samples and classification states survive this boundary; numerical readout and graph mappings retain existing executed regression tests. No browser visual verification is claimed in this audit: browser control was blocked earlier, and there was no expensive repeat browser exploration.

## Limits and precise remedies

- No analysis run / inputs changed: no current result; explicitly run analysis after frame/height confirmation.
- Geometry only / terrain off: valid SPICE center geometry, terrain not requested. Enable terrain or choose Full Analysis. DTE additionally requires communication enabled and its equipment margin.
- Unsupported observer height: enter an explicit sphere-relative height or install a registered DEM supporting that point; never fabricate zero.
- Missing/corrupt dataset, outside valid pixels, frame failure and calculation failure: structured API errors and coverage diagnostics preserve actual reason. No mock fallback.
- Finite horizon: modeled obstruction is supported by sampled terrain; positive clearance is conditional within evaluated finite radius. Beyond radius, nodata and unresolved features remain unknown. A 100 m horizon from a small polar window does not certify distant clearance. These are center classifications, not extended-disc illumination fractions.
- DTE means conditional center access only. No signal strength, link budget, station coverage, thermal survival or flight safety is computed. Long-term NASA raster averages do not fill mission-date gaps.
- Better coverage requires scientifically registered larger DEM windows (or validated Apollo DTMs), with provenance, masks, radius/convergence checks and uncertainty work. No new model or dataset ingestion was authorized/performed in this repair.

## Verification

- 106 existing backend scientific/API/source tests passed: ephemeris (including saved Horizons regression), terrain providers, visibility classifications/frames and source registry.
- Six new availability tests passed, plus the 13 API tests rerun (19 total in the focused second run).
- 199 frontend tests passed after the workflow/status repair, including added preflight scope and geometric below/zero cases. Five fresh API-to-frontend location checks passed separately (204 distinct frontend tests in total).
- TypeScript checks and production build passed. Existing large-chunk advisory remains; no new dependency was added.
- Five real HTTP analyses plus the geometry-only control passed. Backend was restarted to load repaired API metadata. No live Horizons queries, searches, downloads, push or deployment.
