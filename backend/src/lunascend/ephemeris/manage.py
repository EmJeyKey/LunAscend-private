"""Explicit, hash-checked kernel restoration and coverage inspection."""

import argparse
import json
from pathlib import Path
import urllib.request

from .kernels import KernelConfiguration, file_sha256


def download(configuration: KernelConfiguration) -> None:
    records = configuration.manifest()["kernels"]
    configuration.kernel_dir.mkdir(parents=True, exist_ok=True)
    for record in records:
        path = configuration.kernel_dir / record["filename"]
        if path.exists():
            if file_sha256(path) != record["sha256"]:
                raise RuntimeError(f"Existing kernel hash mismatch: {record['filename']}. Move the damaged file aside before restoring.")
            print(f"Verified existing {record['filename']}; download skipped.")
            continue
        temporary = path.with_suffix(path.suffix + ".part")
        try:
            with urllib.request.urlopen(record["url"], timeout=120) as source, temporary.open("wb") as destination:
                while chunk := source.read(1024 * 1024):
                    destination.write(chunk)
            if file_sha256(temporary) != record["sha256"]:
                raise RuntimeError(f"Downloaded kernel hash mismatch: {record['filename']}")
            temporary.replace(path)
            print(f"Downloaded and verified {record['filename']}.")
        finally:
            temporary.unlink(missing_ok=True)


def inspect(configuration: KernelConfiguration) -> dict:
    with configuration.loaded() as loaded:
        return {
            "kernel_fingerprint": loaded.fingerprint,
            "frame_id": "MOON_ME_DE440_ME421",
            "coverage_et_s": loaded.coverage_et,
            "coverage_utc": [(loaded.spice.et2utc(a, "ISOC", 6) + "Z", loaded.spice.et2utc(b, "ISOC", 6) + "Z")
                             for a, b in loaded.coverage_et],
            "toolkit": loaded.spice.tkvrsn("TOOLKIT"),
            "kernels": [{"filename": row["filename"], "sha256": row["sha256"]} for row in loaded.records],
        }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=("download", "verify"))
    args = parser.parse_args()
    configuration = KernelConfiguration.from_environment()
    if args.command == "download":
        download(configuration)
    print(json.dumps(inspect(configuration), indent=2))


if __name__ == "__main__":
    main()
