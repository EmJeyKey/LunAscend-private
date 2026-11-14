"""Bounded, explicit mission requirements; no suitability score."""
from datetime import timedelta
from typing import Annotated, Literal
from pydantic import Field, model_validator
from .common import Contract, Number, NonNegative, Positive, UTCDateTime, Text
from .models import ScenarioRequest, ScenarioResult, LunarSite


class MissionConstraints(Contract):
    minimum_sun_clearance_fraction: Annotated[Number, Field(ge=0, le=1)] | None = None
    maximum_slope_deg: Annotated[Number, Field(ge=0, le=90)] | None = None
    maximum_unmet_load_wh: NonNegative = 0.0
    minimum_soc_pct: Annotated[NonNegative, Field(le=100)] = 10.0
    require_conservative_pass: bool = True
    allow_optimistic_only: bool = False
    minimum_earth_clearance_deg: Annotated[NonNegative, Field(le=90)] = 1.0
    maximum_dte_interruption_s: NonNegative = 3600.0
    minimum_dte_access_s: NonNegative = 3600.0
    required_duration_s: Positive | None = None
    allowed_site_ids: Annotated[tuple[Text, ...], Field(max_length=3)] = ()
    maximum_distance_m: NonNegative | None = None


class OpportunityRequest(Contract):
    baseline: ScenarioRequest
    earliest_utc: UTCDateTime
    latest_utc: UTCDateTime
    step_hours: Annotated[Positive, Field(ge=1, le=720)] = 24.0
    # Coordinates of every additional site are declared at the baseline start epoch.
    sites: Annotated[tuple[LunarSite, ...], Field(max_length=2)] = ()
    constraints: MissionConstraints = Field(default_factory=MissionConstraints)

    @model_validator(mode="after")
    def bounded(self) -> "OpportunityRequest":
        r = self.baseline
        if r.provider_mode != "scientific" or not r.settings.terrain_enabled:
            raise ValueError("Opportunity evaluation requires explicit scientific terrain data; mock candidates are excluded")
        if not r.settings.power_enabled or not r.settings.communication_enabled:
            raise ValueError("Enable both power and DTE with explicit hardware settings before evaluating resilience")
        if r.settings.power_options is None or r.settings.communication_options is None:
            raise ValueError("Power and DTE require explicit configuration; no default hardware is inferred")
        if not r.settings.terrain_options or r.settings.terrain_options.coordinate_epoch_utc != r.start_utc:
            raise ValueError("Site coordinates must be declared at the baseline start epoch")
        if self.latest_utc < self.earliest_utc or self.latest_utc-self.earliest_utc > timedelta(days=30):
            raise ValueError("Search dates must be ordered and span at most 30 days")
        if abs((self.earliest_utc-r.start_utc).total_seconds()) > 30*86400 or abs((self.latest_utc-r.start_utc).total_seconds()) > 30*86400:
            raise ValueError("Search dates must lie within 30 days of the baseline")
        # Count with the same microsecond-resolution step used by the generator.
        n = (self.latest_utc-self.earliest_utc) // timedelta(hours=self.step_hours)+1
        if n*(len(self.sites)+1) > 12:
            raise ValueError("At most 12 site/date candidates per search")
        if (r.end_utc-r.start_utc).total_seconds()/r.sample_step_s > 168 or (r.end_utc-r.start_utc).total_seconds() > 7*86400:
            raise ValueError("Resilience intervals are limited to 7 days and 169 samples")
        ids = [r.site.site_id, *(s.site_id for s in self.sites)]
        if len(set(ids)) != len(ids):
            raise ValueError("Candidate site IDs must be unique")
        return self


class ConstraintResult(Contract):
    constraint_id: Text
    threshold: Number
    actual: Number | None
    units: Text
    status: Literal["pass", "fail", "indeterminate"]
    explanation: Text
    provenance_ids: tuple[Text, ...]
    limitations: tuple[Text, ...]


class ComparedMetric(Contract):
    units: Text
    baseline: Number | None
    candidate: Number | None
    delta: Number | None


class Opportunity(Contract):
    request_id: Text
    request: ScenarioRequest | None
    site: LunarSite
    start_utc: UTCDateTime
    result: ScenarioResult | None
    errors: tuple[Text, ...] = ()
    date_shift_s: Number
    distance_from_baseline_m: NonNegative | None = None
    classification: Literal["meets_tested_requirements", "conditionally_promising", "fails_modeled_requirement", "insufficient_evidence"]
    constraints: tuple[ConstraintResult, ...]
    differences: dict[str, ComparedMetric]
    explanations: tuple[Text, ...]


class OpportunityResponse(Contract):
    model_version: Literal["mission-resilience-v1"] = "mission-resilience-v1"
    baseline: ScenarioResult
    opportunities: tuple[Opportunity, ...]
    completed: int
    failed: int
    indeterminate: int
    cancelled: bool
    elapsed_s: NonNegative
    cache_hits: int
    horizon_reuses: int
    limitations: tuple[Text, ...]
