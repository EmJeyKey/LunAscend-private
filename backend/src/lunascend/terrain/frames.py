"""Explicit epoch-dependent frame bridge isolated from the ephemeris kernel pool."""
import json
import subprocess
import sys
import numpy as np
from lunascend.contracts.terrain import TerrainRequest
from .dem import ROOT, TerrainError


def frame_rotation(request: TerrainRequest) -> tuple[np.ndarray, dict]:
    if request.reference_frame == "MOON_ME_DE421":
        return np.eye(3), {"source_frame": "MOON_ME_DE421", "destination_frame": "MOON_ME_DE421", "method": "identity: same explicitly declared frame", "epoch_utc": None}
    try:
        result = subprocess.run([sys.executable, "-m", "lunascend.terrain._frame_worker"],
            input=json.dumps({"epoch_utc": request.coordinate_epoch_utc.isoformat()}),
            text=True, capture_output=True, timeout=30, cwd=ROOT / "backend", check=False)
        data = json.loads(result.stdout)
        if result.returncode or "error" in data:
            raise TerrainError(data.get("code", "FRAME_MISMATCH"), data.get("error", "Frame transformation failed."))
        matrix = np.asarray(data["matrix"], dtype=float)
        if matrix.shape != (3, 3) or not np.isfinite(matrix).all() or not np.allclose(matrix @ matrix.T, np.eye(3), atol=1e-12, rtol=0) or abs(np.linalg.det(matrix) - 1) > 1e-12:
            raise ValueError("Invalid rotation")
        return matrix, data
    except (OSError, subprocess.TimeoutExpired, ValueError, KeyError) as exc:
        raise TerrainError("FRAME_MISMATCH", "Verified epoch-dependent frame conversion is unavailable; no identity substitution is made.") from exc
