# Official optical imagery evidence

These are actual NASA Moon Trek / LROC source bytes, not generated textures.
`seed-tiles.json` records each of four small 256-pixel photographs, its official URL,
byte count and SHA-256. Total photographic payload: 225,014 bytes. They provide
portable coarse global context, one south WAC parent and one Site01 NAC tile.
They are not a complete offline image archive.

Credit: NASA / GSFC / Arizona State University (LROC); south-polar NAC additionally
USGS / Lunar Mapping and Modeling Project. The chosen NAC FGDC record states no
access/use constraints. LROC distinguishes PDS public-domain science products from
copyrighted non-PDS website media: https://lroc.im-ldi.com/about/terms . These files
are science-product WMTS tiles, not copied website artwork or official agency logos.
No NASA, JPL, USGS or ASU endorsement is implied. Preserve credit on redistribution.

The three unmodified `*-capabilities.xml` files were obtained from the product's
`source_url/1.0.0/WMTSCapabilities.xml`. `nac-metadata.html` was obtained from
https://trek.nasa.gov/moon/TrekWS/rest/cat/metadata/fgdc/html?label=LRO_NAC_Mosaic_SPole85.5_1mp .
Its SHA-256 is `31c752f759ad11da546e18808b6d15822dfbc66f7e67cd4de3b8bc9991855427`.
The catalog generator checks the saved official matrix definitions and derives the
public source resolutions. The original files are evidence, never executable app content.

Polar WMTS `EPSG:0` and meter-valued geographic bounding boxes are invalid. The NAC
catalog also has a malformed scale factor of zero. The FGDC standard parallel −90°,
central meridian 0°, false easting/northing 0, Moon sphere 1,737,400 m establish the
cartographic projection; they do not establish an exact DE421 / DE440 realization.
`projection-checks.json` contains executed PyProj checks of these cartographic
parameters only. No new physical image-to-DEM alignment has been measured.

See `docs/STEP_11_6_ORIGINAL_NASA_MAPS.md` for delivered versus original resolutions,
coverage, source qualifications, missing pixels, registration limits and executed QA.
