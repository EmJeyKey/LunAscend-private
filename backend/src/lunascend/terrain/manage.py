"""Explicit bounded official-data acquisition. HTTP requests never download data."""
import argparse
from hashlib import file_digest
import json
from pathlib import Path
import urllib.request
from lunascend.ephemeris.kernels import KernelConfiguration

ROOT = Path(__file__).resolve().parents[4]


def download_record(path: Path, url: str, expected_hash: str, size: int) -> None:
    if not url.startswith(("https://pgda.gsfc.nasa.gov/", "https://naif.jpl.nasa.gov/")):
        raise ValueError("Only pinned official NASA/NAIF downloads are supported")
    if path.exists():
        with path.open("rb") as stream:
            if path.stat().st_size == size and file_digest(stream, "sha256").hexdigest() == expected_hash:
                return
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".part")
    try:
        with urllib.request.urlopen(url, timeout=60) as response, temporary.open("wb") as out:
            received = 0
            while chunk := response.read(1024 * 1024):
                received += len(chunk)
                if received > size:
                    raise ValueError("Download exceeds pinned file size")
                out.write(chunk)
        with temporary.open("rb") as stream:
            if received != size or file_digest(stream, "sha256").hexdigest() != expected_hash:
                raise ValueError("Downloaded bytes do not match pinned SHA-256 and size")
        temporary.replace(path)
    finally:
        temporary.unlink(missing_ok=True)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=("download", "verify", "inspect"))
    action = parser.parse_args().action
    from .dem import DatasetConfiguration, LunarDEM, MANIFEST
    meta = json.loads(MANIFEST.read_text(encoding="utf-8"))
    config = DatasetConfiguration.selected(meta["dataset_id"])
    extra = json.loads((ROOT / "data/manifests/terrain-frame-kernels.json").read_text(encoding="utf-8"))["kernels"]
    kernels = KernelConfiguration.from_environment()
    if action == "download":
        download_record(config.path, meta["source_url"], meta["sha256"], meta["bytes"])
        download_record(config.path.parent / "README", meta["readme_url"], meta["readme_sha256"], 1829)
        for record in extra:
            download_record(kernels.kernel_dir / record["filename"], record["url"], record["sha256"], record["bytes"])
    with LunarDEM(config) as dem:
        for record in extra:
            path = kernels.kernel_dir / record["filename"]
            with path.open("rb") as stream:
                if path.stat().st_size != record["bytes"] or file_digest(stream, "sha256").hexdigest() != record["sha256"]:
                    raise ValueError("Frame bridge kernel verification failed")
        print("Verified DEM metadata/checksum and terrain frame-kernel checksums.")
        if action == "inspect":
            ds = dem.dataset
            print(json.dumps({"dataset": meta["dataset_id"], "crs_wkt": ds.crs.to_wkt(),
                "transform": list(ds.transform)[:6], "shape": [ds.height, ds.width], "bounds_m": list(ds.bounds),
                "nodata": meta["nodata"], "scale": ds.scales[0], "offset": ds.offsets[0], "units": meta["units"]}, indent=2))


if __name__ == "__main__": main()
