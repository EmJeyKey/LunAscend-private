"""One-shot, isolated SPICE pool owner. Never imported by the ASGI process.

Separate process avoids modifying the validated ephemeris module or its global pool.
"""
import json
import sys
from datetime import datetime, timezone
from hashlib import file_digest
from pathlib import Path
from lunascend.ephemeris.kernels import KernelConfiguration, GeometryError, PROJECT_ROOT


def main() -> None:
    try:
        import spiceypy as spice
        from spiceypy.utils.exceptions import SpiceyError
        request = json.loads(sys.stdin.read())
        config = KernelConfiguration.from_environment()
        records, _ = config.verify()
        extra = json.loads((PROJECT_ROOT / "data/manifests/terrain-frame-kernels.json").read_text(encoding="utf-8"))["kernels"]
        for record in extra:
            path = config.kernel_dir / record["filename"]
            if Path(record["filename"]).name != record["filename"]:
                raise ValueError("Unsafe kernel filename")
            with path.open("rb") as stream:
                if file_digest(stream, "sha256").hexdigest() != record["sha256"]:
                    raise ValueError("Kernel checksum mismatch")
        spice.kclear()
        try:
            # Load old then current FK; only exact DE-specific names are used below.
            for record in (*extra, *records):
                spice.furnsh(str(config.kernel_dir / record["filename"]))
            epoch = datetime.fromisoformat(request["epoch_utc"]).astimezone(timezone.utc)
            et = spice.str2et(epoch.strftime("%Y-%m-%dT%H:%M:%S.%f"))
            matrix = spice.pxform("MOON_ME_DE440_ME421", "MOON_ME_DE421", et)
            print(json.dumps({"source_frame": "MOON_ME_DE440_ME421", "destination_frame": "MOON_ME_DE421",
                "method": "SPICE pxform; isolated pool; exact DE-specific frames", "epoch_utc": request["epoch_utc"],
                "matrix": matrix.tolist(), "kernels": [{k: record[k] for k in ("filename", "url", "sha256")} for record in (*records, *extra)]}))
        finally:
            spice.kclear()
    except ImportError:
        print(json.dumps({"code": "PROVIDER_UNAVAILABLE", "error": "Install the science extra for DE421/DE440 frame conversion."})); sys.exit(1)
    except SpiceyError:
        print(json.dumps({"code": "OUTSIDE_COVERAGE", "error": "Frame transformation is unavailable at this coordinate epoch."})); sys.exit(1)
    except (OSError, ValueError, KeyError, GeometryError):
        print(json.dumps({"code": "MISSING_DATA", "error": "Frame kernel manifests or pinned kernels are missing or invalid."})); sys.exit(1)
    except Exception:
        print(json.dumps({"code": "OUTSIDE_COVERAGE", "error": "Frame transformation is unavailable at this coordinate epoch."})); sys.exit(1)


if __name__ == "__main__": main()
