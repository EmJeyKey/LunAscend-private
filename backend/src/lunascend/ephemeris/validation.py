"""Fetch explicit Horizons references, then compare locally using the fixed plan."""

import argparse
import csv
from datetime import datetime, timezone
from hashlib import sha256
import io
import json
from math import atan2, cos, degrees, hypot, radians, sin
from pathlib import Path
import re
import urllib.parse
import urllib.request

import numpy as np

from lunascend.contracts import LunarSite
from .engine import ENGINE_VERSION, FRAME, REALIZATION, REPORT_ID, REPORT_PATH, SURFACE, case_key, directions, utc_to_et
from .kernels import KernelConfiguration, PROJECT_ROOT, file_sha256

REFERENCE_DIR = PROJECT_ROOT / "data/fixtures/horizons"
PLAN_PATH = PROJECT_ROOT / "docs/validation/STEP_3_PLAN.md"
GEOMETRIC_TOLERANCE_DEG = .0001
APPARENT_BASE_TOLERANCE_DEG = .002
EPOCHS = tuple(datetime(2026, 11, day, hour, tzinfo=timezone.utc) for day, hour in ((14, 0), (14, 12), (15, 0)))


def validation_sites() -> tuple[LunarSite, ...]:
    return tuple(LunarSite(
        site_id=name, name=f"Synthetic {name} validation observer", latitude_deg=latitude,
        longitude_deg=longitude, surface_elevation_m=0,
        coordinate_reference=dict(latitude_type="planetocentric", frame_id=FRAME,
            frame_realization=REALIZATION, reference_surface=SURFACE, reference_radius_m=1737400),
    ) for name, latitude, longitude in (("south-polar", -89, 42), ("mid-latitude", -45, 15), ("near-equatorial", 1, 5)))


def query_parameters(site: LunarSite, body: str, kind: str) -> dict[str, str]:
    params = {
        "format": "json", "COMMAND": "'10'" if body == "sun" else "'399'",
        "CENTER": "'coord@301'", "COORD_TYPE": "'GEODETIC'",
        "SITE_COORD": f"'{site.longitude_deg},{site.latitude_deg},0'",
        "OBJ_DATA": "'YES'", "MAKE_EPHEM": "'YES'", "CSV_FORMAT": "'YES'",
        "START_TIME": "'2026-11-14 00:00:00'", "STOP_TIME": "'2026-11-15 00:01:00'",
        "STEP_SIZE": "'12 h'", "TIME_TYPE": "'UT'", "TIME_DIGITS": "'FRACSEC'",
        "REF_SYSTEM": "'ICRF'", "CAL_FORMAT": "'CAL'", "EXTRA_PREC": "'YES'",
    }
    if kind == "geometric":
        params.update(EPHEM_TYPE="'VECTORS'", REF_PLANE="'FRAME'", VEC_TABLE="'1'",
                      VEC_CORR="'NONE'", OUT_UNITS="'KM-S'")
    else:
        params.update(EPHEM_TYPE="'OBSERVER'", QUANTITIES="'4'", APPARENT="'AIRLESS'", ELEV_CUT="'-90'")
    return params


def reference_paths(site: LunarSite, body: str, kind: str) -> tuple[Path, Path]:
    prefix = REFERENCE_DIR / f"{site.site_id}-{body}-{kind}"
    return Path(str(prefix) + ".request.json"), Path(str(prefix) + ".response.json")


def fetch_references() -> None:
    REFERENCE_DIR.mkdir(parents=True, exist_ok=True)
    for site in validation_sites():
        for body in ("sun", "earth"):
            for kind in ("geometric", "apparent"):
                request_path, response_path = reference_paths(site, body, kind)
                params = query_parameters(site, body, kind)
                if request_path.exists() and response_path.exists():
                    saved = json.loads(request_path.read_text(encoding="utf-8"))
                    if saved["parameters"] == params and saved["response_sha256"] == file_sha256(response_path):
                        print(f"Using saved reference {response_path.name}")
                        continue
                    raise RuntimeError(f"Saved reference integrity/settings mismatch: {response_path.name}")
                url = "https://ssd.jpl.nasa.gov/api/horizons.api?" + urllib.parse.urlencode(params)
                with urllib.request.urlopen(url, timeout=120) as response:
                    raw = response.read()
                payload = json.loads(raw)
                if "error" in payload or "$$SOE" not in payload.get("result", ""):
                    raise RuntimeError(f"Horizons did not return the requested ephemeris: {payload.get('error', payload)}")
                response_path.write_bytes(raw)
                request_path.write_text(json.dumps({
                    "endpoint": "https://ssd.jpl.nasa.gov/api/horizons.api", "parameters": params,
                    "retrieved_at_utc": datetime.now(timezone.utc).isoformat(),
                    "response_sha256": sha256(raw).hexdigest(),
                }, indent=2) + "\n", encoding="utf-8")
                print(f"Saved {response_path.name}")


def read_reference(site: LunarSite, body: str, kind: str) -> tuple[str, list[list[str]]]:
    request_path, response_path = reference_paths(site, body, kind)
    request = json.loads(request_path.read_text(encoding="utf-8"))
    if request["parameters"] != query_parameters(site, body, kind) or request["response_sha256"] != file_sha256(response_path):
        raise RuntimeError("Reference settings or response checksum mismatch")
    text = json.loads(response_path.read_text(encoding="utf-8"))["result"]
    # Do not silently accept a different observer/shape/orientation model.
    if not re.search(r"Center body name:\s+Moon\s+\(301\)", text):
        raise RuntimeError("Horizons observer center is not the Moon")
    if not re.search(r"Center pole/equ\s*:\s*(?:MOON_ME|MEAN_ME \(high precision\))", text):
        raise RuntimeError("Horizons did not use its high-accuracy Moon ME frame")
    if not re.search(r"Center radii\s*:\s*1737\.4,\s*1737\.4,\s*1737\.4", text):
        raise RuntimeError("Horizons Moon reference radii differ from the declared model")
    table = text.split("$$SOE", 1)[1].split("$$EOE", 1)[0].strip()
    rows = [[field.strip() for field in row] for row in csv.reader(io.StringIO(table)) if row]
    if len(rows) != len(EPOCHS):
        raise RuntimeError("Unexpected number of Horizons epochs")
    return text, rows


def row_epoch(row: list[str], kind: str) -> datetime:
    text = row[1] if kind == "geometric" else row[0]
    return datetime.strptime(text.removeprefix("A.D. "), "%Y-%b-%d %H:%M:%S.%f").replace(tzinfo=timezone.utc)


def local_angles(vector, site: LunarSite) -> tuple[float, float]:
    """Independent ENU projection, not azlcpo. Vector is already observer-relative."""
    latitude, longitude = radians(site.latitude_deg), radians(site.longitude_deg)
    east = np.array([-sin(longitude), cos(longitude), 0])
    north = np.array([-sin(latitude) * cos(longitude), -sin(latitude) * sin(longitude), cos(latitude)])
    up = np.array([cos(latitude) * cos(longitude), cos(latitude) * sin(longitude), sin(latitude)])
    e, n, u = float(east @ vector), float(north @ vector), float(up @ vector)
    return degrees(atan2(e, n)) % 360, degrees(atan2(u, hypot(e, n)))


def wrapped_difference(a: float, b: float) -> float:
    return abs((a - b + 180) % 360 - 180)


def compare_references(configuration: KernelConfiguration | None = None, *, write_report: bool = True) -> dict:
    evaluations, reference_metadata, compared_cases = [], [], set()
    with (configuration or KernelConfiguration.from_environment()).loaded() as loaded:
        for site in validation_sites():
            for body in ("sun", "earth"):
                for kind in ("geometric", "apparent"):
                    text, rows = read_reference(site, body, kind)
                    request_path, response_path = reference_paths(site, body, kind)
                    reference_metadata.append({
                        "request_file": request_path.relative_to(PROJECT_ROOT).as_posix(),
                        "response_file": response_path.relative_to(PROJECT_ROOT).as_posix(),
                        "response_sha256": file_sha256(response_path),
                        "model_header": [line.strip() for line in text.splitlines()
                                         if any(label in line for label in ("Center body name:", "Center pole/equ", "Center radii", "Target body name:"))],
                    })
                    for epoch, row in zip(EPOCHS, rows):
                        if row_epoch(row, kind) != epoch:
                            raise RuntimeError("Reference epoch does not match the designated UTC epoch")
                        et = utc_to_et(epoch, loaded.spice)
                        loaded.require_coverage(et, et)
                        correction = "NONE" if kind == "geometric" else "CN+S"
                        computed = directions(site, et, loaded, correction)
                        if kind == "geometric":
                            vector = np.array([float(value) for value in row[2:5]])
                            vector = loaded.spice.pxform("J2000", FRAME, et) @ vector
                            reference_az, reference_el = local_angles(vector, site)
                            az_limit = el_limit = GEOMETRIC_TOLERANCE_DEG
                        else:
                            numeric = [float(value) for value in row[3:] if value]
                            reference_az, reference_el = numeric[-2:]
                            el_limit = APPARENT_BASE_TOLERANCE_DEG
                            az_limit = el_limit / max(abs(cos(radians(reference_el))), .1)
                        az = computed[f"{body}_azimuth_deg"]
                        el = computed[f"{body}_elevation_deg"]
                        az_difference = wrapped_difference(az, reference_az)
                        el_difference = abs(el - reference_el)
                        passed = az_difference <= az_limit and el_difference <= el_limit
                        evaluations.append({
                            "site_id": site.site_id, "utc": epoch.isoformat(), "target": body, "comparison": kind,
                            "spice_correction": correction, "computed_azimuth_deg": az, "computed_elevation_deg": el,
                            "reference_azimuth_deg": reference_az, "reference_elevation_deg": reference_el,
                            "azimuth_difference_deg": az_difference, "elevation_difference_deg": el_difference,
                            "azimuth_tolerance_deg": az_limit, "elevation_tolerance_deg": el_limit, "passed": passed,
                        })
                        compared_cases.add(case_key(site, epoch))
        summaries = {}
        for kind in ("geometric", "apparent"):
            subset = [row for row in evaluations if row["comparison"] == kind]
            summaries[kind] = {
                "comparisons": len(subset),
                "max_absolute_azimuth_difference_deg": max(row["azimuth_difference_deg"] for row in subset),
                "max_absolute_elevation_difference_deg": max(row["elevation_difference_deg"] for row in subset),
                "all_passed": all(row["passed"] for row in subset),
            }
        report = {
            "report_id": REPORT_ID, "engine_version": ENGINE_VERSION,
            "executed_at_utc": datetime.now(timezone.utc).isoformat(),
            "overall_passed": all(row["passed"] for row in evaluations),
            "kernel_fingerprint": loaded.fingerprint, "kernel_hashes": {row["filename"]: row["sha256"] for row in loaded.records},
            "spiceypy_version": loaded.spice.__version__, "toolkit": loaded.spice.tkvrsn("TOOLKIT"), "numpy_version": np.__version__,
            "plan_sha256": file_sha256(PLAN_PATH), "validation_script_sha256": file_sha256(Path(__file__)),
            "engine_sha256": file_sha256(Path(__file__).with_name("engine.py")),
            "reference_compared_cases": sorted(compared_cases), "summary": summaries,
            "limitations": ["Finite synthetic site/epoch grid, not global physical accuracy or site certification.",
                            "Geometric vector projection shares NAIF rotation; direct apparent comparison independently checks orientation.",
                            "Horizons and SPICE share JPL ephemeris heritage; apparent models differ in gravitational light deflection."],
            "references": reference_metadata, "evaluations": evaluations,
        }
    if write_report:
        REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
        REPORT_PATH.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    return report


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=("fetch", "compare"))
    args = parser.parse_args()
    if args.command == "fetch":
        fetch_references()
    else:
        report = compare_references()
        print(json.dumps(report["summary"], indent=2))
        if not report["overall_passed"]:
            raise SystemExit("Independent comparison criteria were not met. Inspect the saved report.")


if __name__ == "__main__":
    main()
