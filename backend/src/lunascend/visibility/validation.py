"""Reproduce the actual NASA Site01 example; numerical evidence, not independent validation."""
import json
import time
import tracemalloc
from pathlib import Path
from lunascend.contracts import ScenarioRequest
from lunascend.ephemeris.kernels import PROJECT_ROOT, file_sha256
from .engine import analyze_visibility


def record() -> dict:
    request = ScenarioRequest.model_validate_json((PROJECT_ROOT / "backend/examples/terrain-visibility-request.json").read_text(encoding="utf-8"))
    tracemalloc.start()
    start = time.perf_counter()
    result = analyze_visibility(request)
    elapsed = time.perf_counter() - start
    _, peak = tracemalloc.get_traced_memory()
    tracemalloc.stop()
    source_paths = [*Path(__file__).parent.glob("*.py"),
        PROJECT_ROOT / "backend/src/lunascend/contracts/models.py",
        PROJECT_ROOT / "backend/src/lunascend/providers/scientific.py",
        * (PROJECT_ROOT / "backend/src/lunascend/terrain").glob("*.py")]
    return {"report_id": "step-7.5-site01-center-v1", "classification": "Executed NASA data; independently unvalidated",
        "runtime_s": elapsed, "python_tracked_peak_bytes": peak,
        "memory_scope": "Parent Python/NumPy tracemalloc only; excludes GDAL native caches and isolated child process RSS.",
        "horizon_profiles_computed": 1, "source_sha256": {str(p.relative_to(PROJECT_ROOT)).replace('\\', '/'): file_sha256(p) for p in sorted(source_paths)},
        "result": result.model_dump(mode="json")}


if __name__ == "__main__":
    report = record()
    destination = PROJECT_ROOT / "docs/validation/step-7.5-results.json"
    destination.write_text(json.dumps(report, indent=2, allow_nan=False) + "\n", encoding="utf-8")
    print(json.dumps({"report": str(destination.relative_to(PROJECT_ROOT)), "runtime_s": report["runtime_s"],
        "python_tracked_peak_bytes": report["python_tracked_peak_bytes"]}))
