"""Pinned local kernels. Network acquisition is an explicit CLI operation."""

from contextlib import contextmanager
from dataclasses import dataclass
from hashlib import file_digest, sha256
import importlib
import json
import os
from pathlib import Path
import threading
from typing import Any, Iterator

from lunascend.contracts import AnalysisError

PROJECT_ROOT = Path(__file__).resolve().parents[4]
MANIFEST_PATH = PROJECT_ROOT / "data/manifests/spice-kernels.json"
FRAME = "MOON_ME_DE440_ME421"
RADIUS_M = 1737400.0
SPICE_LOCK = threading.RLock()


class GeometryError(Exception):
    def __init__(self, code: str, message: str, **details: str) -> None:
        self.error = AnalysisError(code=code, message=message, module="ephemeris",
                                   recoverable=code in ("MISSING_DATA", "PROVIDER_UNAVAILABLE"),
                                   details=details)
        super().__init__(message)


def file_sha256(path: Path) -> str:
    with path.open("rb") as stream:
        return file_digest(stream, "sha256").hexdigest()


@dataclass(frozen=True)
class LoadedKernels:
    spice: Any
    records: tuple[dict, ...]
    fingerprint: str
    coverage_et: tuple[tuple[float, float], ...]

    def require_coverage(self, start_et: float, end_et: float) -> None:
        if not any(a <= start_et <= end_et <= b for a, b in self.coverage_et):
            raise GeometryError("OUTSIDE_COVERAGE", "Requested dates are outside the verified SPK/PCK intersection.")


@dataclass(frozen=True)
class KernelConfiguration:
    kernel_dir: Path
    manifest_path: Path = MANIFEST_PATH

    @classmethod
    def from_environment(cls) -> "KernelConfiguration":
        directory = Path(os.environ.get("LUNASCEND_KERNEL_DIR", "data/kernels"))
        if not directory.is_absolute():
            directory = PROJECT_ROOT / directory
        return cls(directory.resolve())

    def manifest(self) -> dict:
        try:
            data = json.loads(self.manifest_path.read_text(encoding="utf-8-sig"))
            if data["frame_id"] != FRAME or data["reference_radius_m"] != RADIUS_M or len(data["kernels"]) != 5:
                raise ValueError("Unexpected kernel-set metadata")
            for record in data["kernels"]:
                if (Path(record["filename"]).name != record["filename"]
                        or not record["url"].startswith("https://naif.jpl.nasa.gov/")
                        or not isinstance(record["sha256"], str) or len(record["sha256"]) != 64):
                    raise ValueError("Invalid kernel record")
            return data
        except (OSError, ValueError, KeyError, TypeError, AssertionError) as exc:
            raise GeometryError("MISSING_DATA", "Kernel manifest is missing, incomplete or invalid.") from exc

    def verify(self) -> tuple[tuple[dict, ...], str]:
        records = tuple(self.manifest()["kernels"])
        for record in records:
            path = self.kernel_dir / record["filename"]
            try:
                actual = file_sha256(path)
            except OSError as exc:
                raise GeometryError("MISSING_DATA", f"Required kernel is missing or unreadable: {record['filename']}",
                                    filename=record["filename"], reason="missing_kernel") from exc
            if actual != record["sha256"]:
                raise GeometryError("MISSING_DATA", f"Kernel integrity check failed: {record['filename']}",
                                    filename=record["filename"], reason="checksum_mismatch")
        identity = [(item["filename"], item["sha256"]) for item in records]
        fingerprint = sha256(json.dumps(identity, separators=(",", ":")).encode()).hexdigest()
        return records, fingerprint

    @contextmanager
    def loaded(self) -> Iterator[LoadedKernels]:
        try:
            spice = importlib.import_module("spiceypy")
        except ImportError as exc:
            raise GeometryError("PROVIDER_UNAVAILABLE", "Install the locked science extra to enable SPICE geometry.") from exc
        # SPICE's kernel pool is process-global, not thread-local. This module owns it.
        # Load once per complete analysis, never once per sample.
        with SPICE_LOCK:
            records, fingerprint = self.verify()
            spice.kclear()
            try:
                for item in records:
                    spice.furnsh(str(self.kernel_dir / item["filename"]))
                window = spice.spkcov(str(self.kernel_dir / "de440s.bsp"), 301)
                for body in (3, 10, 399):
                    window = spice.wnintd(window, spice.spkcov(str(self.kernel_dir / "de440s.bsp"), body))
                window = spice.wnintd(window, spice.pckcov(str(self.kernel_dir / "moon_pa_de440_200625.bpc"), 31008))
                if spice.namfrm(FRAME) != 31009:
                    raise GeometryError("FRAME_MISMATCH", "The selected lunar frame is not available.")
                radii = spice.bodvrd("MOON", "RADII", 3)[1]
                if any(abs(float(value) * 1000 - RADIUS_M) > 1e-6 for value in radii):
                    raise GeometryError("FRAME_MISMATCH", "Loaded Moon radii do not match the declared spherical model.")
                coverage = tuple(tuple(map(float, spice.wnfetd(window, i))) for i in range(spice.wncard(window)))
                yield LoadedKernels(spice, records, fingerprint, coverage)
            finally:
                spice.kclear()
