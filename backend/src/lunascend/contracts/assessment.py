"""Interpretation of existing results; no new physical models."""
from typing import Literal
from pydantic import Field, model_validator, field_validator
from datetime import datetime
from math import isfinite
from copy import deepcopy
from .common import Contract
from .models import ScenarioResult
from .resilience import MissionConstraints, ConstraintResult

class AssessmentRequest(Contract):
    result: ScenarioResult | None = None
    requirements: MissionConstraints = MissionConstraints()
    require_power: bool = True
    require_communication: bool = False
    sample_index: int = Field(default=0, ge=0, le=10000)

    @field_validator("result", mode="before")
    @classmethod
    def accept_serialized_computed_durations(cls, value):
        if not isinstance(value, dict):
            return value
        value = deepcopy(value)
        collections = [value.get("visibility_windows") or ()]
        if value.get("communication"):
            collections.append(value["communication"].get("windows") or ())
        for windows in collections:
            for window in windows:
                if "duration_s" in window:
                    duration = window.pop("duration_s")
                    expected = (datetime.fromisoformat(window["end_utc"])-datetime.fromisoformat(window["start_utc"])).total_seconds()
                    if not isinstance(duration, (int,float)) or not isfinite(duration) or abs(duration-expected)>1e-6:
                        raise ValueError("Serialized window duration does not match its UTC bounds")
        return value

    @model_validator(mode="after")
    def scientific_only(self):
        if self.result is not None and self.result.provider_mode != "scientific":
            raise ValueError("Mission assessment accepts scientific results only")
        return self

class Interpretation(Contract):
    topic: str
    meaning: str
    finding: str
    consequence: str
    next_action: str
    limitation: str
    provenance_ids: tuple[str, ...] = ()

class MissionAssessment(Contract):
    model_version: Literal["mission-assessment-v1"] = "mission-assessment-v1"
    classification: Literal["analysis_not_run", "does_not_meet_requirements", "insufficient_data", "conditional", "meets_all_evaluated_mandatory_requirements"]
    constraints: tuple[ConstraintResult, ...] = ()
    interpretations: tuple[Interpretation, ...] = ()
    limitations: tuple[str, ...] = ()
