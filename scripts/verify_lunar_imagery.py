"""Bounded live adapter evidence; never reruns or modifies scientific engines."""
from hashlib import sha256
import json
from pathlib import Path
from time import perf_counter
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
BASE = 'http://127.0.0.1:8000/api/v1/imagery'


def main() -> None:
    catalog = json.loads((ROOT / 'data/manifests/lunar-imagery.json').read_text(encoding='utf-8'))
    with urlopen(BASE + '/catalog', timeout=5) as response:
        assert json.load(response) == catalog
    original = json.loads((ROOT / 'docs/validation/step-10-results.json').read_text())['mesh']
    request = {key: original['request'][key] for key in ('latitude_deg', 'longitude_deg', 'coordinate_epoch_utc')}
    with urlopen(Request(BASE + '/anchor', data=json.dumps(request).encode(), headers={'Content-Type': 'application/json'}), timeout=40) as response:
        anchor = json.load(response)
    assert anchor['registration_verified'] is False
    residuals = {key: anchor[key] - original['native_' + key] for key in ('latitude_deg', 'longitude_deg')}
    assert all(abs(value) < 1e-10 for value in residuals.values())
    checks = []
    for key in ('wac-global/0/0/0', 'wac-global/1/1/1', 'wac-global/3/4/6', 'wac-south/0/0/0', 'wac-south/2/1/1', 'nac-south/10/517/506', 'nac-south/11/1035/1013', 'nac-south/11/1035/1014'):
        start = perf_counter()
        with urlopen(BASE + '/tiles/' + key, timeout=40) as response:
            payload = response.read(2_000_001)
            assert len(payload) <= 2_000_000 and response.headers.get('Content-Type') in ('image/png', 'image/jpeg')
            checks.append(dict(key=key, bytes=len(payload), sha256=sha256(payload).hexdigest(),
                media_type=response.headers.get('Content-Type'), origin=response.headers.get('X-LunAscend-Imagery'), elapsed_s=round(perf_counter()-start, 4)))
    report = dict(scope='Executed loopback imagery API, actual source bytes and reuse of exact existing frame bridge. Not local image registration or new scientific validation.',
        catalog_version=catalog['version'], request=request,
        native_anchor={key: anchor[key] for key in ('latitude_deg', 'longitude_deg', 'reference_frame', 'registration_verified', 'qualification')},
        native_anchor_difference_from_saved_step10_deg=residuals,
        tiles=checks, limitations=['Source imagery exact dynamical realization remains unspecified.', 'No measured image-to-Site01 DEM tie; photographic local draping remains incomplete.', 'Live tiles are not a frozen complete archive. Only bundled seed bytes and source metadata are pinned.', 'Browser checks and test counts are documented separately.'])
    destination = ROOT / 'docs/validation/step-11.6-imagery-check.json'
    destination.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(dict(tiles=len(checks), native_anchor_difference_deg=residuals, registration_verified=False)))


if __name__ == '__main__':
    main()
