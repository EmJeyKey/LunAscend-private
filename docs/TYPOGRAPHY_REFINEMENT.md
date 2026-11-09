# LunAscend typography refinement

Scope: presentation-only font and heading refinement following Step 7. No new milestone, scientific behavior or application redesign.

- Marcellus Regular 400 is the shared display family for major headings and selected section headings. It uses its real regular weight without synthesized bold/italics. Heading sizes, tracking and line heights are responsive; the desktop introduction gives its title more room while small screens retain natural wrapping.
- Manrope variable 200-800, locally bundled Latin WOFF2 from the existing pinned Fontsource 5.3.0 package, handles body text, navigation and actions. IBM Plex Mono is retained for coordinates, UTC, measurements and numerical inputs, with tabular figures.
- Marcellus comes from the pinned Google Fonts revision recorded in public/fonts/sources.json. SIL OFL licenses, source URLs, byte sizes and SHA-256 hashes accompany all bundled fonts. Fonts load from local paths with swap; the two primary families are preloaded. Unused Cormorant Garamond and IBM Plex Sans binaries/notices were removed, reducing font assets by approximately 1.1 MiB.
- The complete original sidebar logo remains unchanged. The Dashboard already omitted a repeated decorative logo; its existing schematic Moon viewport is preserved for future integration. No artwork, palette, React components, scientific code, contracts or API changes.

Verification: 64 frontend tests passed; TypeScript check passed; final production build passed. Font hashes and the Manrope license match their recorded sources/package. Git scope checks confirm backend, components, pages, state, API/types and original brand assets have no changes. A rendered Dashboard screenshot was inspected at the existing approximately 785 px browser width: title on one line, primary branding intact, clear controls and mono UTC readout. Subsequent browser automation timed out; additional desktop/mobile viewport checks and browser font-network inspection were not completed. Existing responsive breakpoints are retained with a bounded mobile heading scale. No claim of broader visual QA is made.

Only local Git is authorized. No push, deployment or subsequent milestone.
