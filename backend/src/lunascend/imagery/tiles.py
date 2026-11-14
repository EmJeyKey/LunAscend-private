"""Allowlisted WMTS adapter with bounded downloads and a disposable offline tile cache."""
from hashlib import sha256
import json
from pathlib import Path
from threading import Lock
from urllib.request import HTTPRedirectHandler, Request, build_opener
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[4]
CATALOG = json.loads((ROOT / 'data/manifests/lunar-imagery.json').read_text(encoding='utf-8'))
LAYERS = {layer['id']: layer for layer in CATALOG['layers']}
MAX_TILE_BYTES = 2_000_000
MAX_CACHE_BYTES = 64_000_000
_cache_lock = Lock()


class ImageryUnavailable(Exception):
    pass


class OfficialRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        target = urlsplit(newurl)
        if target.scheme != 'https' or target.hostname != 'trek.nasa.gov' or target.port not in (None, 443):
            raise ImageryUnavailable('Image service redirected outside the verified host.')
        return super().redirect_request(req, fp, code, msg, headers, newurl)


def tile_identity(layer_id: str, level: int, row: int, column: int) -> tuple[dict, str]:
    layer = LAYERS.get(layer_id)
    if layer is None or not 0 <= level < len(layer['levels']):
        raise ValueError('Unknown imagery layer or unsupported source resolution.')
    grid = layer['levels'][level]
    if not 0 <= row < grid['height'] or not 0 <= column < grid['width']:
        raise ValueError('Tile address is outside the published matrix.')
    spacing = grid['resolution'] * 256
    left, top = layer['origin'][0] + column * spacing, layer['origin'][1] - row * spacing
    x0, y0, x1, y1 = layer['bounds']
    if left >= x1 or left + spacing <= x0 or top <= y0 or top - spacing >= y1:
        raise ValueError('Tile is outside published image coverage.')
    return layer, f'{layer["source_url"]}/1.0.0/default/default028mm/{level}/{row}/{column}.{layer["extension"]}'


def valid_image(payload: bytes, extension: str) -> bool:
    # Reject HTML/error bodies and unsupported image formats before caching or serving.
    if extension == 'png':
        return len(payload) > 32 and payload[:8] == b'\x89PNG\r\n\x1a\n' and int.from_bytes(payload[16:20], 'big') == 256 and int.from_bytes(payload[20:24], 'big') == 256
    if len(payload) <= 32 or payload[:3] != b'\xff\xd8\xff' or payload[-2:] != b'\xff\xd9':
        return False
    position = 2
    for _ in range(128):
        if position + 4 >= len(payload) or payload[position] != 255:
            return False
        marker = payload[position + 1]
        length = int.from_bytes(payload[position + 2:position + 4], 'big')
        if length < 2 or position + 2 + length > len(payload):
            return False
        if marker in (192, 193, 194):  # Baseline / extended / progressive SOF.
            return length >= 8 and int.from_bytes(payload[position + 5:position + 7], 'big') == 256 and int.from_bytes(payload[position + 7:position + 9], 'big') == 256
        position += 2 + length
    return False


def fetch_official(url: str) -> bytes:
    with build_opener(OfficialRedirect()).open(Request(url, headers={'User-Agent': 'LunAscend educational imagery viewer'}), timeout=12) as response:
        payload = response.read(MAX_TILE_BYTES + 1)
    if len(payload) > MAX_TILE_BYTES:
        raise ImageryUnavailable('Image tile exceeds the bounded download size.')
    return payload


def get_tile(layer_id: str, level: int, row: int, column: int, *, cache_dir: Path | None = None, fetcher=fetch_official) -> tuple[bytes, str, bool]:
    layer, url = tile_identity(layer_id, level, row, column)
    seed = next((s for s in CATALOG['seed_tiles'] if s['key'] == f'{layer_id}/{level}/{row}/{column}'), None)
    if seed:
        payload = (ROOT / 'data/fixtures/imagery' / seed['file']).read_bytes()
        if sha256(payload).hexdigest() != seed['sha256'] or not valid_image(payload, layer['extension']):
            raise ImageryUnavailable('Bundled source tile checksum mismatch.')
        return payload, 'image/jpeg' if layer['extension'] == 'jpg' else 'image/png', True
    cache = cache_dir if cache_dir is not None else ROOT / 'data/cache/lunar-imagery'
    # Include pinned source metadata in identity; a catalog change cannot reuse stale products.
    identity = sha256((layer['capabilities_sha256'] + url).encode()).hexdigest()
    path = cache / f'{identity}.{layer["extension"]}'
    with _cache_lock:
        if path.is_file():
            payload = path.read_bytes() if path.stat().st_size <= MAX_TILE_BYTES else b''
            if len(payload) <= MAX_TILE_BYTES and valid_image(payload, layer['extension']):
                path.touch()
                return payload, 'image/jpeg' if layer['extension'] == 'jpg' else 'image/png', True
            path.unlink()
    try:
        payload = fetcher(url)
        if len(payload) > MAX_TILE_BYTES or not valid_image(payload, layer['extension']):
            raise ImageryUnavailable('Unsupported or invalid image response; no substitute imagery supplied.')
        with _cache_lock:
            cache.mkdir(parents=True, exist_ok=True)
            # Atomic replacement prevents an interrupted write from becoming a cached tile.
            temporary = cache / f'{identity}.part'
            temporary.write_bytes(payload)
            temporary.replace(path)
            files = sorted(cache.glob('*.*'), key=lambda p: p.stat().st_mtime, reverse=True)
            total = 0
            for index, item in enumerate(files):
                total += item.stat().st_size
                if total > MAX_CACHE_BYTES or index >= 1024:
                    item.unlink(missing_ok=True)
    except (OSError, ValueError) as exc:
        raise ImageryUnavailable('Official imagery unavailable. Cached imagery and local DEM/science remain independent.') from exc
    return payload, 'image/jpeg' if layer['extension'] == 'jpg' else 'image/png', False
