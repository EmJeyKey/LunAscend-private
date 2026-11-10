"""Shared validated sampling support. Never reconstruct missing environmental states."""
from dataclasses import dataclass
from datetime import datetime
from lunascend.contracts.models import TerrainVisibility, TerrainVisibilityObservation
from lunascend.ephemeris.kernels import GeometryError


@dataclass(frozen=True)
class Segment:
    start: datetime
    end: datetime
    left: TerrainVisibilityObservation | None
    right: TerrainVisibilityObservation | None

    @property
    def seconds(self) -> float:
        return (self.end-self.start).total_seconds()


def segments(terrain: TerrainVisibility, start: datetime, end: datetime, expected_step_s: float) -> tuple[Segment, ...]:
    rows = terrain.observations
    if any(not start <= row.time_utc <= end for row in rows) or any(b.time_utc <= a.time_utc for a,b in zip(rows,rows[1:])):
        raise GeometryError("INVALID_REQUEST", "Engineering observations must be strictly ordered and inside the requested UTC interval.")
    if not rows:
        return (Segment(start,end,None,None),)
    output = []
    if rows[0].time_utc > start:
        output.append(Segment(start,rows[0].time_utc,None,rows[0]))
    for a,b in zip(rows,rows[1:]):
        gap = (b.time_utc-a.time_utc).total_seconds() > expected_step_s + max(1e-5,expected_step_s*1e-8)
        output.append(Segment(a.time_utc,b.time_utc,None if gap else a,None if gap else b))
    if rows[-1].time_utc < end:
        output.append(Segment(rows[-1].time_utc,end,rows[-1],None))
    return tuple(output)
