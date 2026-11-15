# Final pre-recording verification

## Implemented

- One shared mission and one **Run Complete Mission Analysis** action on Analysis; no global Simple/Advanced switch.
- Overview includes the distinct original **Site01 — Connecting Ridge** observer, current UTC date and analysis status.
- Four beginner cards explain sunlight, Earth visibility, electricity and terrain suitability before technical measurements.
- The authoritative Python requirement assessment supplies the overall conclusion; failed electricity is not presented as a terrain defect.
- Suggestions follow failed requirements; missing evidence is listed separately. Editing inputs still invalidates results.
- **View Professional Analysis** contains Geometry, Terrain & Visibility, Power & Battery, Communications, Sources & Validation, and requirement evidence.
- All earlier graphs, numerical records, JSON export, maps, pins, requirements and provenance remain available. User-requested visibility strips and the unimplemented sky placeholder remain removed.
- Native DE421 Sun/Earth-versus-terrain time graphs supplement the existing geometric DE440/ME421 graph. Frames are not overlaid.
- Solar graph includes the configured electrical load; battery plots show the actual configured reserve.
- NASA source disclosures use bullet metadata. Source tables and long methods are expandable; comparison numerical records are expandable.

## Partial results

- Coverage preflight selects installed terrain using real pixel support.
- Outside coverage, geometry requires an explicit surface-height assumption; no zero is supplied automatically.
- Invalid power or communication settings are reported separately; supported environmental products are still requested.
- A power or communications calculation exception preserves independent environmental and engineering products, with a module-specific `CALCULATION_FAILED` error.
- The frontend accepts an absent requested engineering product only with explicit partial-result error evidence; ordinary contract validation remains strict.
- No new scientific model, dependency, dataset download or equation change.

## Site01 recording inputs

- Original documented observer: latitude **−89.46315760953222°**, longitude **−137.50097847854008°** at the original epoch in DE440/ME421.
- Start **2026-11-14 00:00 UTC**, duration **24 h**, sampling **3600 s**, observer height **2 m** above the DEM; terrain radius **2500 m**, **360** azimuth rays and **5 m** radial step.
- Panels **2 m²**, efficiency **25%**, fixed horizontal; nominal irradiance **1361 W/m²**, conversion **0.9**, derating **1**.
- Demand **50 W**, heater **0 W**; battery **500 Wh**, initial charge **100%**, reserve **10%**, charge/discharge efficiency **0.95**.
- DTE clearance **1°**. Power is mandatory under the conservative model; DTE is optional in the default overall assessment.
- Confirm the displayed frame and height convention before running. Example loading preserves existing hardware; check the hardware summary if previously edited.

## Actual displayed results

- **25 real SPICE time samples**, including both UTC endpoints.
- Initial Sun elevation **+1.5016027645°**, Earth elevation **−5.0362389148°**.
- DEM surface **1944.7670898437 m**; Sun terrain horizon **−4.6125481571°**, clearance **+6.1141509216°**: conditional potential sunlight.
- Earth terrain horizon **+0.9803744698°**, clearance **−6.0166133846°**: modeled obstruction.
- Initial optimistic solar output **16.0491984952 W**; conservative solar output **0 W** under its explicit illumination assumption.
- Mission demand **1200 Wh**; optimistic solar energy **371.3641257111 Wh**.
- Final/minimum battery energy **50 Wh**, **10%** reserve, in both cases.
- Unmet demand: conservative **772.5 Wh**, optimistic **401.1358742889 Wh**.
- Conditional DTE access **0 s**; sample-supported interruption **86400 s**. Radio performance is not modeled.
- Overall: **DOES NOT MEET REQUIREMENTS**. Neither electrical case supplies all demand; this does not classify landing safety.
- Independent November 15 scenario: optimistic solar **343.4144938848 Wh**, **27.9496318262 Wh less** than November 14. Both electrical cases still fail.

## Browser acceptance executed now

- Actual running frontend and backend; Site01 selected on Overview, retained through Explorer and Analysis.
- One complete-analysis action returned geometry, terrain, power, battery and communications. Correct beginner conclusions appeared.
- Existing photographic Moon and actual finite LOLA mesh rendered; local vectors retained returned directions. Photographs and DEM heights remain separate.
- Professional sections and NASA source bullets opened; full result JSON downloaded through the website.
- **712 SVG points across eight graphs** matched actual returned values and plotting coordinates; **55 numerical fields** matched the same browser-exported API result.
- First/last sample selection changed the shared UTC and numerical readouts; the final endpoint was **2026-11-15T00:00:00Z**.
- Actual Comparison duplicated the calculated baseline, changed the second UTC date, ran the second calculation and displayed the **27.95 Wh** difference. Returning to the baseline restored its own site, UTC and results.
- Nobile Rim 1 and Shackleton Rim were selected and analyzed in the browser. Nobile showed potential Earth visibility; Shackleton showed modeled Earth obstruction.
- Apollo 15 first reported missing terrain/height, then returned geometry using a deliberately entered hypothetical **0 m sphere-height assumption**. Terrain and electrical products remained absent.
- Custom **10° N, 10° E** returned its own geometry and missing-terrain explanation, not Site01 values.
- An explicit one-day delay was recalculated in Mission Resilience; the alternative retained the same native observer and displayed 343.41 Wh optimistic solar energy and 429.09 Wh unmet demand.
- All six routes opened. No new captured browser console errors in the acceptance tab.
- API logs were inspected. Imagery-anchor requests occasionally returned **503 during concurrent activity**; an isolated Site01 anchor retry returned **200** with the exact DE421 conversion. This does not establish optical registration. Do not describe all network requests as error-free.
- Desktop layout inspected at actual measured **1607×824** and **1049×590** CSS viewports, with no horizontal page overflow in the measured wide layout. Smaller available desktop views were also visually inspected.
- An explicit 1920×1080 viewport override did not produce a stable matching viewport in the embedded browser. **Exact 1920×1080 capture and phone-size browser acceptance are NOT TESTED.** Record the verified window size or check the final capture size before recording.

## Reproducible evidence and checks

- `docs/validation/final-demo-graph-points.json`: captured DOM plot data.
- `docs/validation/final-demo-numerical-display.json`: captured numerical field identities and raw values.
- `docs/validation/final-demo-graph-check.json`: successful browser/API numerical verification.
- `docs/validation/final-demo-api-check.json`: fresh bounded five-location API checks; all products equal the preserved audit and two browser exports retain independent dates/results.
- Recheck a browser JSON export with `backend/.venv/Scripts/python.exe scripts/verify_final_demo.py <export-path>`.
- **101 backend tests passed**: engineering, assessment, availability, ephemeris and visibility; includes two independent-product failure regressions.
- **211 frontend tests passed** in the full suite. The affected final-demo, human-experience and resource suites also passed **28 tests**.
- TypeScript and production build passed after final UI edits. Existing large-chunk build advisory remains; no source maps or source removal introduced.
- Earlier graph milestone: 207 frontend tests and browser verification remain historical evidence, not counted as newly executed tests.
- Saved **36 Horizons residual rows** were preserved; no new live Horizons comparison or additional validation claim.

## Sources, offline operation and scientific limits

- **NASA/JPL NAIF SPICE:** local matched DE440/ME421 kernels; geometric center directions, correction NONE.
- **NASA/GSFC LOLA / PGDA product 78:** original Site01 5 m DEM and separately registered finite polar windows. Native terrain uses DE421 and the existing exact epoch bridge.
- **NASA LROC / Moon Trek:** real photographic context; acquisition shadows are historical. Image-to-local-DEM registration remains unverified.
- **JPL Horizons:** saved cross-implementation checks with shared JPL heritage, not live inputs or independent observational validation.
- **LunAscend:** conditional electrical and DTE models with user hardware assumptions.
- Existing manifests, product hashes, producer attribution, licenses and restoration instructions remain the source of truth. External QuickMap/CSA references do not contribute numerical layers. No agency endorsement.
- Installed scientific analysis works locally after restoring the optional environment, kernels and DEM. Uncached online imagery and external links require network access.
- Globally incomplete terrain, center-only visibility, finite spatial/time sampling and unpropagated terrain uncertainty remain explicit.
- Landing hazards, mission-assessed slope/roughness, full-disk illumination, thermal survival and radio link budgets remain unsupported.
- Session state is in memory; a reload clears results and comparison snapshots. Prepare the comparison before starting a continuous recording; do not reload mid-demonstration.

## Startup

- Backend terminal, from project root:
  ```powershell
  cd backend
  .\.venv\Scripts\python.exe -m uvicorn lunascend.main:app --host 127.0.0.1 --port 8000
  ```
- Frontend terminal, from project root:
  ```powershell
  cd frontend
  npm.cmd run dev
  ```
- Open `http://127.0.0.1:5173/`. These commands use the already restored environment; portable installation remains documented in `SETUP.md`.

## Two-minute recording sequence

- **0:00–0:15:** Overview, logo, evidence-based mission planning.
- **0:15–0:35:** Select original Site01; Explore This Site; show photographs and the finite LOLA landing area.
- **0:35–0:55:** Analysis; confirm November 14 / 24 h / documented hardware and coordinate reference; Run Complete Mission Analysis.
- **0:55–1:20:** Read conditional sunlight and modeled Earth obstruction; show the shared selected UTC.
- **1:20–1:40:** Explain electricity failure; open Professional Analysis for real generation/load and battery graphs. Reserve does not imply all demand was supplied.
- **1:40–1:55:** Compare the independently calculated November 15 scenario; show lower optimistic solar energy, without claiming either option safe.
- **1:55–2:00:** Return to branding; emphasize conditional, traceable decision support.
- Prepare both calculated comparison scenarios and cache desired photographs beforehand. Keep all assumptions and failures truthful.

## Recovery and readiness qualification

- Local recovery commit and requested tag: `final-demo-ready-lunascend`; no push or deployment authorized.
- Scientific calculation, display and real comparison gates were exercised. Exact full-HD capture remains a recording-environment check, not a verified claim in this report.
