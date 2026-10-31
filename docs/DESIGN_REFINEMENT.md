# LunAscend visual refinement

The Step 5 integration was stabilized and preserved as commit 61072b6 / recovery tag step-5-integration-checkpoint before the visual pass. The current work retains the six routes, API, shared observations, source selector, UTC controls, chart, sample slider, provenance and safe error states. No backend changes were needed.

## Identity and typography

The original supplied logo is stored unchanged in frontend/public/brand/lunascend-original.png. Its SHA-256 and intended use are documented beside it. The Dashboard shows the entire image without crop/distortion, with accessible alternative text. Compact navigation retains the existing text/symbol fallback; no replacement logo was drawn. The full original remains available in the repository.

Cormorant Garamond is reserved for major/editorial headings, the existing Manrope font serves controls/navigation/body text, and IBM Plex Mono serves coordinates, timestamps, angular values, axes and metadata. The added fonts were acquired from the official Google Fonts repository at pinned commits; filenames, source URLs, checksums and sizes are in frontend/public/fonts/sources.json. Both added fonts and Manrope use SIL Open Font License 1.1, with full notices included in public/fonts. Assets load from relative local URLs through @font-face (font-display swap), without a runtime font CDN or new package. Font data/lettering were not altered. Original TTFs are retained for quality and simple offline restoration; the variable display font adds about 1.2 MB before transfer compression.

## Page changes

- Dashboard: original logo/whole lunar artwork, restrained serif heading, selected site/epoch facts and direct analysis action precede the existing lunar context and compact live readouts. The image and surface canvas are explicitly artwork, not terrain.
- Explorer: filtered synthetic locations, central illustrative canvas, coordinate editor and selected-site details. Configure analysis preserves the selected location. No invented coordinates, projected markers or NASA imagery were added.
- Analysis: technical chart remains dominant after successful inputs collapse; gold Sun, dashed cyan Earth, neutral geometric horizon, precise readouts and expandable actual provenance. SVG coordinates/labels resize to the container; missing values break curves. No terrain horizon is drawn.
- Comparison: aligned scenario columns and restrained shared typography; no rankings or computed differences were invented.
- Resilience: original mission/date offset/future engineering workflow is explicit. The existing delay control still changes timestamps only.
- Methodology: updated accurate descriptions of active SPICE/mock data, fixed frame/sphere, executed finite Horizons comparisons, geometric versus terrain horizon and remaining engineering limits.

Dark navy surfaces, selective muted gold, solar gold and Earth cyan replace repeated decorative emphasis. No new animation library, continuous motion, copied reference assets or photorealistic 3D engine was added. Reduced-motion handling is preserved.

The three supplied references were read for composition, technical hierarchy and atlas selection principles: [Spacesis](https://dribbble.com/shots/24147478-Spacesis-Interactive-Web-Design), [dashboard concept](https://dribbble.com/shots/26719728-NASA-Dashboard-Meteorite-Analysis-Concept), [Apollo map](https://mungomash.com/space/apollo-landing-sites/). Their layouts/assets were not reproduced. The Apollo schematic was not used as a south-polar map. Font sources: [Cormorant Garamond](https://github.com/google/fonts/tree/main/ofl/cormorantgaramond), [IBM Plex Mono](https://github.com/google/fonts/tree/main/ofl/ibmplexmono).

## Verification and boundaries

TypeScript, 37 frontend tests and production build passed. All 115 backend tests passed, including unchanged scientific API/Horizons comparisons and deterministic mock checks. Runtime font checks confirmed Cormorant Garamond and IBM Plex Mono loaded; computed styles used the intended display/technical families. The logo file was verified byte-identical to the supplied original. Desktop and phone views were inspected, all six route headings verified, and filter/selection/navigation, scientific/mock analysis, sample synchronization, native coordinate validation, backend-down and missing-kernel errors exercised. See STEP_5.md for the exact science example and error checks. Screenshots are local ignored QA artifacts, not runtime dependencies.

The application remains a local educational prototype. A georeferenced lunar atlas, terrain ray tracing, actual windows, electrical/radio models, multi-scenario analysis and 3D remain future work. Another Windows computer and encrypted recovery have not been rehearsed. Further visual refinement should follow user review of this coherent shared foundation and the Dashboard/Explorer/Analysis pages; no later scientific milestone begins automatically.

User review polish: warm/orange interface accents now use pale luminous gold, with static metallic gradients on primary buttons. The original image replaces the navigation fallback, its edges fade into the sidebar, and the Dashboard brand image has feathered edges with no caption. The original PNG remains unchanged; no scientific behavior changed.
