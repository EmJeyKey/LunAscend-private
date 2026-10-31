# Step 5.5 - Premium branding and scientific lunar explorer

## Baseline and scope

Read AGENTS.md, ARCHITECTURE.md, SETUP.md and DEVELOPMENT_ROADMAP.md; inspected the existing components and Git history. Step 5 integration was already committed. Baseline TypeScript, 37 frontend tests and production build passed. Existing reviewed visual edits were preserved in local commit `306362c`, recovery tag `pre-step-5.5-design`, before this work.

This milestone changes presentation and reuses existing interactions. Backend source, scientific/mock provider logic, contracts, reference evidence, request construction, shared analysis state and dependency lockfiles are unchanged. No Step 6 implementation was started.

## Design and pages

- Dashboard: compact atlas introduction, large schematic Moon, adjacent mission controls and Sun/Earth readouts on wide desktops, with UTC chart and provenance below. Smaller desktops place controls below the viewport; mobile places them before numerical readouts. Compact settings open when a required field is invalid.
- Explorer: filtered synthetic-site list and custom coordinate entry on the left, lunar viewport centrally, selected-site context and source/analysis status on the right. Add to comparison reuses the existing bounded, in-memory configuration snapshots; it does not calculate results. Mobile stacks the viewport and controls.
- Lunar viewport: globe and surface-study presentations reuse original SVG crater artwork. Grid and contour switches remain available. The symbolic marker is fixed artwork with no coordinate-to-image transformation. Lighting is artistic, orientation unregistered, and no mapped hemisphere is claimed. Actual Sun/Earth directions remain in scientific angular readouts and the UTC chart.
- Analysis: retained compact controls, returned-sample chart, units, keyboard timeline, missing-value behavior and provenance; receives shared typography/open-section styling.
- Comparison: retained baseline and saved configuration workspace, with shared lighter actions and section typography; no comparison engine added.
- Resilience: workflow now reads original mission, delayed mission, alternative opportunities pending. Existing date offset remains a timestamp preview only.
- Methodology: preserved academic explanations, sources, coordinate conventions, finite validation scope and unavailable terrain/engineering distinctions; receives shared typography.

Dark navy surfaces, restrained gold headings and fine outlined actions retain the user's requested open sections and metallic gold divider strips. Cyan continues to identify Earth information. No chart decoration or fabricated measurements were added.

## Brand and fonts

The complete 1448 x 1086 original PNG remains unchanged in `frontend/public/brand/lunascend-original.png`. SHA-256: `5297534cb24705c8c319e8ce25db4d1f93735e4b44a679c216a7cb4ca01385de`. A small proportional, CSS-feathered navigation presentation retains the original lettering and colors. The previously removed large Dashboard logo/caption remain absent.

Cormorant Garamond serves display headings; IBM Plex Sans serves interface text and buttons; IBM Plex Mono serves coordinates, UTC and measurements. All load locally. The added Latin variable Sans WOFF2 covers weights 400-600 and is 45,712 bytes. SIL OFL notices and pinned sources/hashes are stored alongside assets. The unused Manrope runtime import was removed; no dependency or lockfile changes were needed. All six pinned font/license hashes were verified.

## Verification executed

- Final `npm.cmd run typecheck`: passed.
- Final `npm.cmd test`: 37 passed across two files.
- Final `npm.cmd run build`: passed, 2,127 modules; JS 329.58 kB (103.58 kB gzip), CSS 55.50 kB (12.56 kB gzip). No production source maps.
- An initial build caught invalid UTF-8 introduced in two edited text files. Both were repaired; all frontend sources were subsequently decoded successfully as UTF-8 and the final build passed.
- Browser: wide desktop (1700 viewport request) Dashboard and Explorer visually inspected. Mobile (390 viewport request) Dashboard and Explorer visually inspected; measured document width matched scroll width, with no horizontal overflow. The globe was enlarged on mobile after inspection.
- Browser: all six navigation routes visited; mobile drawer opened and routed successfully. Explorer filtering, synthetic-site selection, custom coordinate selection, comparison saving and full-slot disabled state worked. Globe/surface and grid controls worked.
- Browser: actual scientific run returned 49 observations with SPICE and unvalidated labels. End-key sample selection reached `2026-11-16T06:00:00Z` and persisted into Analysis, where readouts/chart agreed. Explicit mock run returned 49 observations with mock labels and persistent NOT LUNAR PREDICTIONS warnings. Editing site inputs cleared old results.
- Browser: empty required scientific height reopened collapsed Dashboard settings. Correcting it allowed analysis. A pre-1972 request displayed UNSUPPORTED_TIME, cleared results, retained scientific selection and did not fall back to mock.
- Browser: all three font families reported ready via document.fonts.check; body computed IBM Plex Sans. Original logo loaded with its 4:3 intrinsic ratio and proportional rendered dimensions.
- Screenshots saved locally under ignored `.tools/step-5.5-*` for Dashboard/Explorer desktop and mobile. Browser automation later timed out during an additional reference-case/medium-desktop check; that additional check is not claimed as passed.
- `git diff --check` passed. Backend and dependency lockfiles were not modified. Prior Step 5 backend evidence remains 115 passing tests; the backend suite was not rerun for this presentation-only milestone.

## Files changed

`frontend/src/components/LunarMapPlaceholder.tsx`, `MissionControls.tsx`; `frontend/src/pages/Dashboard.tsx`, `SiteExplorer.tsx`, `Resilience.tsx`; `frontend/src/main.tsx`; `frontend/src/styles/index.css`; `frontend/public/fonts/IBMPlexSans-Latin.woff2`, `ibmplexsans-OFL.txt`, `sources.json`; `frontend/public/brand/README.md`; root AGENTS, ARCHITECTURE, SETUP, DEVELOPMENT_ROADMAP; this report.

## Recovery and remaining limitations

Final recovery tag: `step-5.5-lunar-atlas` (resolve with `git show --no-patch step-5.5-lunar-atlas`). Repository remains local, with no configured remote, push or deployment. The checkpoint tag remains available separately.

The schematic is not terrain imagery, a south-polar projection, a measured globe or a sky-position plot. Georeferenced imagery, 3D terrain, visibility windows, power feasibility and computed scenario/delay differences remain future work. The official 2026 challenge page timed out during reference review; event/submission details were not verified. Dribbble and the Apollo atlas were inspected for design inspiration; no code or assets were copied. Fresh-machine restore and production hosting were not tested.
