"""Circular linear model, masked directions and conservative sampled intervals."""
from bisect import bisect_left
from datetime import timedelta
from lunascend.contracts.models import (
    HorizonProfile, TerrainBodyVisibility, TerrainTransition,
    TerrainVisibilityObservation, VisibilityWindow,
)

DECISIVE = {"modeled_obstruction", "conditional_clearance"}


def classify(profile: HorizonProfile, azimuth_deg: float | None, elevation_deg: float | None) -> TerrainBodyVisibility:
    azimuth = azimuth_deg % 360 if azimuth_deg is not None else None
    elevation = elevation_deg
    common = dict(azimuth_deg=azimuth, elevation_deg=elevation)
    if azimuth is None or elevation is None:
        return TerrainBodyVisibility(**common, classification="unavailable", coverage="unknown", reason="Required body azimuth or elevation is unavailable.")
    az = profile.azimuth_deg
    if len(az) < 2 or not profile.ray_coverage:
        return TerrainBodyVisibility(**common, classification="unavailable", coverage="unknown", reason="No documented horizon samples or coverage.")
    index = bisect_left(az, azimuth % 360)
    if index < len(az) and abs(az[index] - azimuth % 360) < 1e-10:
        left = right = index
        fraction = 0.0
    else:
        left, right = (index - 1) % len(az), index % len(az)
        fraction = ((azimuth - az[left]) % 360) / ((az[right] - az[left]) % 360)
    a, b = profile.elevation_deg[left], profile.elevation_deg[right]
    if a is None or b is None:
        return TerrainBodyVisibility(**common, classification="indeterminate", coverage="unknown", reason="Horizon interpolation crosses an unknown direction; no gap filling.")
    horizon = a + (b - a) * fraction
    clearance = elevation - horizon
    full = all(profile.ray_coverage[i] == "sampled_radius" for i in (left, right))
    coverage = "sampled_radius" if full else "partial"
    if abs(clearance) <= 1e-10:
        label, reason = "indeterminate", "Body center lies on the modeled horizon; numerical equality is not clearance."
    elif clearance < 0:
        label, reason = "modeled_obstruction", "Center below the known circular-linear modeled obstruction; unresolved terrain cannot certify physical accuracy."
    elif full:
        label, reason = "conditional_clearance", "Center clears the evaluated finite sampled terrain only; farther and unresolved terrain remain unknown."
    else:
        label, reason = "indeterminate", "Positive known-sample clearance cannot resolve missing radial terrain."
    return TerrainBodyVisibility(**common, horizon_elevation_deg=horizon, clearance_deg=clearance,
        classification=label, coverage=coverage, reason=reason)


def windows(rows: tuple[TerrainVisibilityObservation, ...], provenance_ids: tuple[str, ...]):
    """Piecewise-linear decisive segments only; all unknown-adjacent segments stay unknown."""
    output, transitions = [], []
    if len(rows) < 2:
        return (), ()
    for target in ("sun", "earth", "joint"):
        segments = []
        for a, b in zip(rows, rows[1:]):
            start, end = a.time_utc, b.time_utc
            dt = (end - start).total_seconds()
            if target == "joint":
                # Joint intervals are built below by intersecting the qualified body intervals.
                continue
            x, y = getattr(a, target), getattr(b, target)
            cx, cy = x.classification, y.classification
            if cx == cy:
                segments.append((start, end, cx, "sampled_support", dt))
            elif (cx in DECISIVE and cy in DECISIVE and x.coverage == y.coverage == "sampled_radius"
                  and x.clearance_deg is not None and y.clearance_deg is not None
                  and x.clearance_deg * y.clearance_deg < 0):
                fraction = -x.clearance_deg / (y.clearance_deg - x.clearance_deg)
                crossing = start + timedelta(seconds=dt * fraction)
                transitions.append(TerrainTransition(target=target, bracket_start_utc=start, bracket_end_utc=end,
                    estimate_utc=crossing, from_classification=cx, to_classification=cy, resolution_s=dt))
                segments.extend(((start, crossing, cx, "piecewise_linear_clearance", dt), (crossing, end, cy, "piecewise_linear_clearance", dt)))
            else:
                segments.append((start, end, "indeterminate", "sampled_support", dt))
        merged = []
        for start, end, label, method, dt in segments:
            if merged and merged[-1][1] == start and merged[-1][2:4] == (label, method):
                previous = merged.pop()
                merged.append((previous[0], end, label, method, max(previous[4], dt)))
            else:
                merged.append((start, end, label, method, dt))
        output.extend(VisibilityWindow(target=target, classification=label, start_utc=start, end_utc=end,
            status="partial", start_censored=start == rows[0].time_utc, end_censored=end == rows[-1].time_utc,
            resolution_s=dt, method=method, provenance_ids=provenance_ids,
            assumptions=("Approximate sampled support, not proof of continuous visibility; crossings can occur between samples.",
                         "Center targets; finite terrain coverage; unresolved terrain and angular sampling uncertainty remain."))
            for start, end, label, method, dt in merged if end > start)
    suns = [w for w in output if w.target == "sun" and w.classification == "conditional_clearance"]
    earths = [w for w in output if w.target == "earth" and w.classification == "conditional_clearance"]
    for sun in suns:
        for earth in earths:
            start, end = max(sun.start_utc, earth.start_utc), min(sun.end_utc, earth.end_utc)
            if end > start:
                output.append(VisibilityWindow(target="joint", classification="conditional_clearance", start_utc=start, end_utc=end,
                    status="partial", resolution_s=max(sun.resolution_s, earth.resolution_s), method="sampled_support",
                    start_censored=start == rows[0].time_utc, end_censored=end == rows[-1].time_utc,
                    provenance_ids=provenance_ids, assumptions=sun.assumptions))
    return tuple(output), tuple(transitions)
