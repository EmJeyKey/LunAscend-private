"""Reproduce the bounded imagery catalog from saved official WMTS evidence."""
from pathlib import Path
from hashlib import sha256
import json
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
EVIDENCE = ROOT / 'data/fixtures/imagery'
NS = {'w': 'http://www.opengis.net/wmts/1.0', 'o': 'http://www.opengis.net/ows/1.1'}
PRODUCTS = (
    ('wac-global', 'LRO_WAC_Mosaic_Global_303ppd_v02', 'global-capabilities.xml', 'EQ', 'geographic', [-180, -90, 180, 90], 'jpg', 100, '2009–2011'),
    ('wac-south', 'LRO_WAC_Mosaic_SPole60_100m_v02', 'wac-polar-capabilities.xml', 'SP', 'south-polar', [-1095700, -1095600, 1095600, 1095700], 'png', 100, '2009–2011'),
    ('nac-south', 'LRO_NAC_Mosaic_SPole85.5_1mp', 'nac-polar-capabilities.xml', 'SP', 'south-polar', [-136526, -136526, 136526, 136526], 'png', 1, '2009–2011; USGS publication 2011-09-21'),
)


def build() -> dict:
    layers = []
    for key, product, name, region, projection, bounds, extension, nominal, acquisition in PRODUCTS:
        payload = (EVIDENCE / name).read_bytes()
        root = ET.fromstring(payload)
        layer = root.find('w:Contents/w:Layer', NS)
        matrix = root.find('w:Contents/w:TileMatrixSet', NS)
        assert layer is not None and matrix is not None
        assert layer.findtext('o:Identifier', namespaces=NS) == product
        assert matrix.findtext('o:Identifier', namespaces=NS) == 'default028mm'
        levels = []
        for tile in matrix.findall('w:TileMatrix', NS):
            level = int(tile.findtext('o:Identifier', namespaces=NS))
            width = int(float(tile.findtext('w:MatrixWidth', namespaces=NS)))
            height = int(float(tile.findtext('w:MatrixHeight', namespaces=NS)))
            assert width == 2 ** (level + 1) and height == 2 ** level
            assert tile.findtext('w:TileWidth', namespaces=NS) == '256'
            assert tile.findtext('w:TileHeight', namespaces=NS) == '256'
            resolution = 180 / (256 * 2 ** level) if projection == 'geographic' else float(tile.findtext('w:ScaleDenominator', namespaces=NS)) * .00028
            levels.append({'level': level, 'width': width, 'height': height, 'resolution': resolution})
        layers.append(dict(id=key, product=product,
            title={'wac-global': 'LROC WAC global mosaic v2', 'wac-south': 'LROC WAC south-polar mosaic v2', 'nac-south': 'USGS LROC NAC south-polar mosaic (2011)'}[key],
            provider='NASA Moon Trek · NASA / GSFC / ASU' + (' · USGS / LMMP' if key == 'nac-south' else ''),
            projection=projection, units='degrees' if projection == 'geographic' else 'm',
            radius_m=1737400, origin=[-180, 90] if projection == 'geographic' else [-1095930, 1095930],
            bounds=bounds, levels=levels, extension=extension, nominal_source_m_per_pixel=nominal,
            acquisition=acquisition, source_url=f'https://trek.nasa.gov/tiles/Moon/{region}/{product}',
            capabilities_sha256=sha256(payload).hexdigest(),
            frame='Moon cartographic sphere; exact DE421 / DE440 realization not specified by imagery metadata',
            registration='Context imagery only. No verified image-to-Site01 DEM tie; local 3D draping disabled.',
            coverage='Global' if key == 'wac-global' else 'South of approximately 60° S' if key == 'wac-south' else 'South of approximately 85.5° S, with source gaps / acquisition shadows',
            usage='Public NASA / USGS science product; credit NASA / GSFC / Arizona State University' + (' and USGS / LMMP' if key == 'nac-south' else '') + '. No agency endorsement.',
        ))
    return {'version': 'lunar-imagery-v1', 'tile_size': 256, 'layers': layers,
        'seed_tiles': json.loads((EVIDENCE / 'seed-tiles.json').read_text(encoding='utf-8')),
        'projection_note': 'Spherical south polar stereographic: radius 1737400 m, latitude of origin −90°, central meridian 0°, scale 1, false E/N 0. Global grid is lunar geographic, not Earth Web Mercator.',
        'metadata_qualification': 'Polar WMTS EPSG:0 / geographic bounds and NAC catalog scale_factor=0 are malformed. Projection uses the official FGDC standard parallel −90° and lunar radius, not those invalid fields. No exact realization or local registration is inferred.'}


if __name__ == '__main__':
    path = ROOT / 'data/manifests/lunar-imagery.json'
    path.write_text(json.dumps(build(), ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(path.relative_to(ROOT))
