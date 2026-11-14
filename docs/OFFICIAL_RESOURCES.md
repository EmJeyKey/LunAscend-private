# Step 11 — Official resources and scientific provenance

Historical Step 11 report. Step 11.6 subsequently added three verified NASA Moon Trek
photographic WMTS products to the internal map/context globe. Current source roles
come from the registry and imagery manifests; the reference-only statements below
describe the earlier milestone. QuickMap remains external; local DEM photographic
draping remains withheld. See [Step 11.6](STEP_11_6_ORIGINAL_NASA_MAPS.md).

## Implemented scope

This milestone makes source roles, product identity, attribution and the existing Horizons comparison evidence visible in Scientific Methodology. Explorer provides contextual external-map links alongside the selected input coordinates and epoch. Result provenance links to the saved comparison explanation in a separate local tab, preserving the original analysis workspace.

The four resources are those specified in the team's Step 11 brief for [Lunar Landing Site Navigator](https://www.spaceappschallenge.org/2026/challenges/lunar-landing-site-navigator/?tab=resources). Review date: **2026-11-14**. The official challenge summary was discoverable through search, but direct retrieval of its resources tab/root failed during this review (including HTTP 502). The exact current resource listing therefore was not independently verified from the live tab. Each resource's own site/documentation was reviewed; no fabricated listing, endpoint or availability guarantee is supplied.

The user-authorized Step 11 resource/provenance scope supersedes the roadmap's previously proposed Step 11 sensitivity study. No sensitivity study or next milestone is implemented.

## What is actually used

| Source | LunAscend role | Actual integration |
| --- | --- | --- |
| [LROC QuickMap](https://quickmap.lroc.asu.edu/) | Reference only | External optical-image exploration and PDS-discovery reference. No image, tile, texture or QuickMap measurement imported. |
| [NASA Moon Trek](https://trek.nasa.gov/moon/) | Reference only | External map and documented WMTS-service references. No basemap/texture/layer installed. |
| [JPL Horizons](https://ssd.jpl.nasa.gov/horizons/) | Used for validation | Existing saved requests/responses and executed Step 3 angle residuals, presented locally. No runtime Horizons requests. |
| [CSA Moon Exploration](https://www.asc-csa.gc.ca/eng/astronomy/moon-exploration/) | Reference only | Attributed educational context on Artemis, Gateway/Canadarm3 and surface infrastructure. No numerical CSA dataset or endorsement claim. |
| [JPL NAIF SPICE](https://naif.jpl.nasa.gov/naif/) | Used in calculations | Existing local geometry and exact frame bridge, with the original pinned kernel manifests. |
| [NASA LOLA / PGDA Site01](https://pgda.gsfc.nasa.gov/products/78) | Used in calculations; used for visualization | Existing source DEM, finite horizons and retained original pixel-center 3D/polar mesh. |

Scientific engines, API/contracts, mock provider, kernel/DEM manifests, scientific reference files and both dependency locks are unchanged. The source catalog describes provenance; it neither replaces result-level DataProvenance records nor changes their validation labels. A dataset's presence in the catalog does not establish local installation, selected-site coverage, independent terrain validation or mission feasibility.

## Imagery investigation and rights

QuickMap's supplied URL redirected to `quickmap.lroc.im-ldi.com` during review. The [LROC terms and citation page](https://www.lroc.im-ldi.com/about/terms) distinguishes PDS-delivered products from copyrighted non-PDS website imagery. Relevant image credit is NASA/GSFC/Arizona State University. No QuickMap assets were scraped or copied. A future imagery addition must choose the exact PDS product, document its release, map projection/frame, coverage, effective resolution and usage conditions, and execute alignment checks. The current links intentionally open portal home pages; no guessed coordinate URL parameters are used.

The [official Moon Trek WMTS documentation](https://trek.nasa.gov/tiles/apidoc/trekAPI.html?body=moon) was accessible and describes layer-specific capabilities and tile matrix sets. The documentation lists equirectangular and polar service groups. A particular imagery product's complete capabilities/rights/reference-frame/alignment chain was not verified in this bounded milestone. No tile endpoint is invented or activated, no imagery is reprojected onto the DE421 surface and no service is required for core workflows. Documentation accessibility is not a claim that any individual tile service was tested.

LOLA is laser-altimetry-derived elevation, distinct from optical imagery. The existing product remains **lola-site01-5m-v2020**, `Site01_final_adj_5mpp_surf`, source release recorded in `data/manifests/lola-site01.json`. Its native frame is MOON_ME_DE421, south-polar stereographic on the 1737400 m sphere; heights are sphere-relative meters. The UI derives the release, original 5 m spacing, registration, bounds, citation and SHA-256 directly from that manifest. Pixel spacing is not effective accuracy. Uncertainty layers remain unpropagated, coverage finite, nodata unknown and display exaggeration/lighting independently unvalidated. See docs/TERRAIN_DATA.md and docs/STEP_10.md.

The [CSA resource](https://www.asc-csa.gc.ca/eng/astronomy/moon-exploration/) supports the short educational context; its [terms](https://www.asc-csa.gc.ca/eng/terms.asp) require appropriate credit and distinguish third-party material and official marks. LunAscend credits CSA, reproduces no CSA media/logo and implies no association or endorsement. NASA/JPL/LOLA producer acknowledgements remain explicit. [NAIF's SPICE rules](https://naif.jpl.nasa.gov/naif/rules.html) are linked; original kernel credits and restoration procedures are preserved. This is a source/usage review for the implemented links and short summaries, not blanket clearance for future imagery or agency branding.

## Saved Horizons evidence displayed

The UI reads a generated, offline snapshot of **docs/validation/step-3-results.json**, retaining all 36 original rows. That report was executed on **2026-10-31T07:22:28.209936+00:00**. The 12 saved API response files cover three synthetic observers, three UTC epochs, both target centers and two complementary comparison methods: nine site/epoch cases and 18 rows per method, 36 total. Each row compares both azimuth and elevation. These are not 36 sites or a new validation run.

| Comparison | Maximum absolute wrapped azimuth difference / ° | Maximum absolute elevation difference / ° | Predeclared criteria |
| --- | --- | --- | --- |
| Public geometric NONE | 1.0330911095479678e-6 | 3.1318892013132427e-7 | 0.0001° per angle |
| Diagnostic apparent CN+S | 5.898086214983778e-7 | 1.9815385599031288e-7 | Elevation 0.002°; azimuth 0.002° / max(abs(cos(reference elevation)), 0.1) |

Compared synthetic latitude/longitude pairs are **(−89°, +42°), (−45°, +15°), (+1°, +5°)**, with 0 m sphere-relative surface elevation and 0 m observer height. Epochs are **2026-11-14 00:00 UTC**, **2026-11-14 12:00 UTC** and **2026-11-15 00:00 UTC**. Latitude is planetocentric, longitude east-positive, azimuth clockwise from north and elevation above the local radial tangent; the sphere radius is 1737400 m.

The public model uses geometric correction NONE in MOON_ME_DE440_ME421. The primary Horizons check supplies geometric topocentric ICRF vectors, then projects them using separate ENU dot products while sharing the NAIF lunar rotation. The complementary direct AIRLESS apparent AZ/EL check uses internal SPICE CN+S for orientation evidence. Horizons also includes gravitational deflection absent from that SPICE diagnostic. Saved headers identify DE441 translations and `MEAN_ME (high precision)`; local SPICE uses the pinned DE440/ME421-aligned set. The UI preserves these distinctions.

Horizons is a separate service/implementation with shared JPL model heritage, not independent observational truth. Passing this grid does not validate all locations/heights/epochs, the DEM, terrain clearance, disk illumination, battery survival or an RF link. Existing exact-case/software/kernel identity requirements for reference_compared labels remain unchanged. New selected sites remain unvalidated unless the original rules apply.

Full source records, raw requests/responses, numerical tolerances, correction differences and reproduction instructions remain in **docs/validation/STEP_3_PLAN.md**, **STEP_3_RESULTS.md**, **step-3-results.json** and **data/fixtures/horizons/**. The [Horizons API documentation](https://ssd-api.jpl.nasa.gov/doc/horizons.html) is linked for any separately authorized future acquisition; no optional live validation API was added here.

## Central registry and reproducibility

- `data/manifests/source-registry.json`: curated organization, official URLs, role, purpose, actual use, access/usage notes and attribution for six resources. Local scientific entries refer to their existing manifests instead of duplicating authoritative metadata.
- `scripts/build_source_registry.py`: standard-library-only build/check adapter. It resolves pinned manifests and verifies the saved engine/script/plan, kernel manifest and raw response hashes. It aggregates only already-executed residual rows, rejects inconsistent/nonpassing evidence and never calculates new astronomy or modifies scientific reports.
- `frontend/src/data/sourceCatalog.json`: committed 37,852-byte presentation artifact, reproducible from those inputs. This small approved metadata/evidence snapshot contains no Python source, environment files, kernel binaries or DEM raster. It loads locally with the UI; no runtime network request or secret is required.

From the repository root with the restored Python environment:

```powershell
backend\.venv\Scripts\python.exe scripts/build_source_registry.py
backend\.venv\Scripts\python.exe scripts/build_source_registry.py --check
```

The first command refreshes only the UI artifact; the second fails if it is stale or evidence identities disagree. Commit registry/manifest changes and their regenerated presentation together. Existing scientific outputs and reference values must never be edited to satisfy this presentation check. If identities cease to match, investigate/revalidate the science before refreshing the catalog.

To reproduce the original finite comparison without network, use the restored backend science environment and pinned kernels: `python -m lunascend.ephemeris.validation compare`. This command is already part of Step 3; it was not replaced by a live service or new calculation in Step 11.

## Reliability and offline behavior

Resource descriptions, source identity and residual tables are local static assets. QuickMap, Moon Trek, Horizons and CSA are contacted only if a user follows an external link; there are no external embeds, image tiles or automatic queries. If those sites fail, the original tab and selected site/time remain unchanged. The UI says they are reference portals and directs users to the local viewer/analysis. No imagery fallback/reprojection logic is needed because no external layer was installed.

Local scientific analysis still requires its existing optional environment, restored data and loopback backend. Offline readiness after installation is different from first-time restoration. No service worker, new API, dependency, key, hosting service or package installation is required. Full physical network-disconnection and fresh-PC rehearsals were not performed in this milestone.

## Verification executed

- **34 existing SPICE regression tests and 6 new source-registry cases passed**, in separate focused runs (initial combined 39-pass run, followed by all six registry cases after adding the nonpassing-evidence guard). Existing SPICE tests rerun the saved comparison with `write_report=False`; original report bytes remain unchanged. No full backend-suite claim is made for this milestone; the previous Step 10 full suite had 239 passes.
- **121 frontend tests passed** across nine files, including four new source/UI checks and all existing comparison, resilience, analysis and 3D tests. Tests cover exact URLs/roles/credits, original residual identity, offline rendering with a rejecting fetch stub, no external embeds and contextual coordinate links without guessed deep-link parameters. A stubbed offline render is not a physical browser-disconnection test.
- TypeScript passed. The production build passed, including a final build after the numerical-cell wrapping correction. Its existing lazy Three.js chunk-size warning remains; no new dependency was added. Source maps remain disabled.
- Catalog `--check` passed. Original scientific sources, source manifests, reference fixtures, saved numerical reports and both locks have no Git changes. Focused tamper tests reject altered source, raw response, summary or nonpassing evidence.
- Actual Windows in-app browser inspection: resource roles/attribution disclosures, the residual summary, reference coordinates/epochs/model headers, all **36 data rows plus header**, and Explorer reference context were checked. The in-app source link scrolled to the correct Methodology fragment while retaining the selected site/UTC. All six application routes rendered their expected heading; no console errors were captured.
- Desktop 1280×900 and narrow 390×844 viewport overrides were checked (measured CSS narrow viewport about 398×861 at current browser zoom). The narrow document width equaled its 382 px client width; tables had their own horizontal scroll area. Numeric cells retain scientific notation without line breaks. Browser inspection found no external embeds. Temporary viewport overrides were reset. Screenshots are outside Git.
- The local development servers had stopped before browser inspection and were started using the existing setup commands. Lengthy terrain/opportunity searches and another exhaustive GPU audit were not repeated. No new imagery was added, so no new imagery-georeferencing result is claimed.

## Recovery and stop boundary

Create the local verified commit and recovery tag **step-11-official-resources**. Resolve its full commit with `git rev-parse step-11-official-resources`. Review staged files for credentials, unexpected downloads, local paths and generated environments before committing. Existing remote configuration is retained; no push, publication, deployment or repository-visibility change is authorized or performed. Remote privacy was not independently reverified.

Stop after Step 11. Scientific sensitivity/uncertainty review and other later work remain separately authorized milestones.
