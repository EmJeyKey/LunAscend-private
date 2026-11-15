"""Version 1 scientific contracts; these validate data, not lunar physics."""

from math import ceil
from typing import Annotated, Literal

from pydantic import Field, computed_field, field_validator, model_validator
from .engineering import PowerConfiguration, CommunicationConfiguration, EnergyCase, AccessSample

from .common import (
    AnalysisError, Azimuth, CalculationStatus, Contract, Elevation, Metric,
    NonNegative, Number, Positive, ProviderMode, Text, UTCDateTime, ValidationStatus,
)


class CoordinateReference(Contract):
    body: Literal["MOON"] = "MOON"
    latitude_type: Literal["planetocentric", "planetographic"]
    longitude_convention: Literal["east_positive"] = "east_positive"
    frame_id: Text
    frame_realization: Text
    reference_surface: Text
    reference_radius_m: Positive | None = None


class LunarSite(Contract):
    site_id: Text
    name: Text
    latitude_deg: Annotated[Number, Field(ge=-90, le=90)]
    longitude_deg: Number
    surface_elevation_m: Number | None = None
    observer_height_m: NonNegative = 0.0
    description: Text | None = None
    coordinate_reference: CoordinateReference

    @field_validator("longitude_deg")
    @classmethod
    def canonical_longitude(cls, value: float) -> float:
        return (value + 180.0) % 360.0 - 180.0


class TerrainVisibilitySettings(Contract):
    dataset_id: Text
    coordinate_epoch_utc: UTCDateTime
    azimuth_samples: Annotated[int, Field(strict=True, ge=4, le=720)] = 360
    max_search_radius_m: Annotated[Number, Field(ge=1, le=50000)] = 2500.0
    radial_step_m: Annotated[Number, Field(ge=1, le=5)] = 5.0

    @model_validator(mode="after")
    def workload(self) -> "TerrainVisibilitySettings":
        if self.radial_step_m > self.max_search_radius_m or self.azimuth_samples * (ceil(self.max_search_radius_m / self.radial_step_m) + 1) > 500000:
            raise ValueError("Terrain visibility exceeds the bounded radial/azimuth workload")
        return self


class AnalysisSettings(Contract):
    terrain_enabled: bool = False
    power_enabled: bool = False
    communication_enabled: bool = False
    horizon_mode: Literal["terrain", "geometric_approximation"] = "geometric_approximation"
    disk_policy: Literal["center"] = "center"
    correction_mode: Literal["NONE"] = "NONE"
    sun_clearance_deg: Annotated[NonNegative, Field(le=90)] = 0.0
    earth_clearance_deg: Annotated[NonNegative, Field(le=90)] = 0.0
    terrain_options: TerrainVisibilitySettings | None = None
    power_options: PowerConfiguration | None = None
    communication_options: CommunicationConfiguration | None = None

    @model_validator(mode="after")
    def terrain_policy(self) -> "AnalysisSettings":
        if self.terrain_options is not None and not self.terrain_enabled:
            raise ValueError("Terrain options require terrain_enabled")
        if self.horizon_mode == "terrain" and not self.terrain_enabled:
            raise ValueError("Terrain horizon requires terrain_enabled")
        return self


class AnalysisInterval(Contract):
    start_utc: UTCDateTime
    end_utc: UTCDateTime

    @model_validator(mode="after")
    def chronological(self) -> "AnalysisInterval":
        if self.end_utc <= self.start_utc:
            raise ValueError("end_utc must be after start_utc")
        return self


class ScenarioRequest(AnalysisInterval):
    schema_version: Literal["1.0"] = "1.0"
    site: LunarSite
    provider_mode: ProviderMode
    sample_step_s: Positive
    settings: AnalysisSettings = Field(default_factory=AnalysisSettings)

    @model_validator(mode="after")
    def bounded_request(self) -> "ScenarioRequest":
        span = (self.end_utc - self.start_utc).total_seconds()
        if span > 366 * 86400:
            raise ValueError("Analysis interval exceeds the 366-day limit")
        if self.sample_step_s < 0.001:
            raise ValueError("Sampling interval must be at least 0.001 seconds")
        if ceil(span / self.sample_step_s) + 1 > 10001:
            raise ValueError("Request exceeds the 10001-sample limit (including endpoints)")
        return self


class DataProvenance(Contract):
    id: Text
    provider_name: Text
    provider_mode: ProviderMode
    data_source: Text
    source_version: Text | None = None
    calculation_method: Text
    reference_frame: Text | None = None
    terrain_dataset: Text | None = None
    validation_status: ValidationStatus = "unvalidated"
    validation_report_id: Text | None = None
    assumptions: tuple[Text, ...] = ()
    source_url: Text | None = None
    sha256: Annotated[str, Field(pattern=r"^[a-f0-9]{64}$")] | None = None

    @model_validator(mode="after")
    def validation_evidence(self) -> "DataProvenance":
        if self.provider_mode == "mock" and self.validation_status != "mock":
            raise ValueError("Mock provenance must remain labeled mock")
        if self.provider_mode == "scientific" and self.validation_status == "mock":
            raise ValueError("Scientific provenance cannot be labeled mock")
        if self.validation_status in ("reference_compared", "validated") and not self.validation_report_id:
            raise ValueError("Validation requires an executed report reference")
        return self


class ScientificProduct(Contract):
    status: CalculationStatus = "unavailable"
    provenance_ids: tuple[Text, ...] = ()
    assumptions: tuple[Text, ...] = ()

    @model_validator(mode="after")
    def consistent_metrics(self) -> "ScientificProduct":
        metrics = [getattr(self, name) for name in type(self).model_fields
                   if isinstance(getattr(self, name), Metric)]
        if self.status in ("unavailable", "not_requested") and any(m.value is not None for m in metrics):
            raise ValueError("Unavailable products cannot contain measurements")
        if self.status == "illustrative" and any(m.value is not None and m.validation != "mock" for m in metrics):
            raise ValueError("Illustrative metrics must be labeled mock")
        if self.status == "calculated" and any(m.validation == "mock" for m in metrics):
            raise ValueError("Calculated products cannot contain mock metrics")
        return self


class EphemerisObservation(ScientificProduct):
    time_utc: UTCDateTime
    reference_frame: Text
    correction_mode: Literal["NONE"] = "NONE"
    sun_azimuth_deg: Metric[Azimuth] = Field(default_factory=Metric)
    sun_elevation_deg: Metric[Elevation] = Field(default_factory=Metric)
    earth_azimuth_deg: Metric[Azimuth] = Field(default_factory=Metric)
    earth_elevation_deg: Metric[Elevation] = Field(default_factory=Metric)

    @model_validator(mode="after")
    def measurement_status(self) -> "EphemerisObservation":
        metrics = (self.sun_azimuth_deg, self.sun_elevation_deg,
                   self.earth_azimuth_deg, self.earth_elevation_deg)
        if self.status in ("unavailable", "not_requested") and any(m.value is not None for m in metrics):
            raise ValueError("Unavailable observations cannot contain measurements")
        if self.status == "illustrative" and any(m.value is not None and m.validation != "mock" for m in metrics):
            raise ValueError("Illustrative measurements must be labeled mock")
        if self.status == "calculated" and any(m.validation == "mock" for m in metrics):
            raise ValueError("Calculated observations cannot contain mock metrics")
        return self


class HorizonProfile(ScientificProduct):
    site_id: Text
    reference_frame: Text
    azimuth_deg: tuple[Azimuth, ...] = ()
    elevation_deg: tuple[Elevation | None, ...] = ()
    terrain_source: Text | None = None
    spatial_resolution_m: Positive | None = None
    # Optional v1 extension: finite sampled terrain is never a global horizon certificate.
    obstruction_distance_m: tuple[NonNegative | None, ...] = ()
    sampled_distance_m: tuple[NonNegative, ...] = ()
    first_missing_distance_m: tuple[NonNegative | None, ...] = ()
    ray_coverage: tuple[Literal["sampled_radius", "boundary", "nodata", "boundary_and_nodata", "unknown"], ...] = ()
    valid_sample_fraction: tuple[Annotated[Number, Field(ge=0, le=1)], ...] = ()
    observer_height_m: NonNegative | None = None
    surface_elevation_m: Number | None = None
    reference_radius_m: Positive | None = None
    max_search_radius_m: Positive | None = None
    radial_step_m: Positive | None = None
    azimuth_step_deg: Positive | None = None
    global_horizon_complete: Literal[False] | None = None

    @model_validator(mode="after")
    def matching_samples(self) -> "HorizonProfile":
        if len(self.azimuth_deg) != len(self.elevation_deg):
            raise ValueError("Horizon arrays must have equal lengths")
        if any(b <= a for a, b in zip(self.azimuth_deg, self.azimuth_deg[1:])):
            raise ValueError("Horizon azimuths must be strictly increasing")
        if self.status in ("unavailable", "not_requested") and any(v is not None for v in self.elevation_deg):
            raise ValueError("Unavailable horizon cannot contain terrain measurements")
        for values in (self.obstruction_distance_m, self.sampled_distance_m, self.first_missing_distance_m, self.ray_coverage, self.valid_sample_fraction):
            if values and len(values) != len(self.azimuth_deg):
                raise ValueError("Optional horizon arrays must match azimuth length")
        if self.global_horizon_complete is False and self.status == "calculated":
            raise ValueError("Finite-radius profiles must remain partial")
        return self


class VisibilityWindow(AnalysisInterval, ScientificProduct):
    target: Literal["sun", "earth", "joint"]
    classification: Literal[
        "visible", "obstructed", "borderline", "unknown",
        "sunlight_only", "earth_only", "both", "neither",
        "modeled_obstruction", "conditional_clearance", "indeterminate", "unavailable",
        "below_clearance_requirement", "conditional_access",
    ]
    start_censored: bool = False
    end_censored: bool = False
    resolution_s: Positive | None = None
    method: Literal["sampled_support", "piecewise_linear_clearance", "left_sample_hold"] | None = None

    @computed_field
    @property
    def duration_s(self) -> float:
        """Nominal UTC civil seconds; leap-second physics is deferred to Step 3."""
        return (self.end_utc - self.start_utc).total_seconds()

    @model_validator(mode="after")
    def classification_status(self) -> "VisibilityWindow":
        joint = {"sunlight_only", "earth_only", "both", "neither"}
        if self.target != "joint" and self.classification in joint:
            raise ValueError("Joint classifications require target=joint")
        if self.target == "joint" and self.classification in {"visible", "obstructed"}:
            raise ValueError("Joint windows require a joint classification")
        if self.status in ("unavailable", "not_requested") and self.classification != "unknown":
            raise ValueError("Unavailable windows must be unknown")
        return self


class PowerAnalysis(ScientificProduct):
    configuration: PowerConfiguration | None = None
    cases: tuple[EnergyCase, ...] = ()
    outcome: Literal["pass_both", "pass_optimistic_only", "fail_both", "indeterminate", "unavailable"] | None = None
    solar_generation_w: Metric[NonNegative] = Field(default_factory=Metric)
    consumption_w: Metric[NonNegative] = Field(default_factory=Metric)
    net_power_w: Metric[Number] = Field(default_factory=Metric)
    battery_capacity_wh: Positive | None = None
    stored_energy_wh: Metric[NonNegative] = Field(default_factory=Metric)
    energy_shortage: Metric[bool] = Field(default_factory=Metric)
    unmet_energy_wh: Metric[NonNegative] = Field(default_factory=Metric)

    @model_validator(mode="after")
    def battery_bounds(self) -> "PowerAnalysis":
        energy = self.stored_energy_wh.value
        if energy is not None and self.battery_capacity_wh is not None and energy > self.battery_capacity_wh:
            raise ValueError("Stored energy exceeds battery capacity")
        return self


class CommunicationAnalysis(ScientificProduct):
    configuration: CommunicationConfiguration | None = None
    access_samples: tuple[AccessSample, ...] = ()
    covered_duration_s: NonNegative = 0.0
    unknown_duration_s: NonNegative = 0.0
    coverage_fraction: Annotated[Number, Field(ge=0, le=1)] = 0.0
    max_sample_step_s: Positive | None = None
    earth_visibility_duration_s: Metric[NonNegative] = Field(default_factory=Metric)
    windows: tuple[VisibilityWindow, ...] | None = None
    longest_interruption_s: Metric[NonNegative] = Field(default_factory=Metric)
    link_budget_db: Metric[Number] = Field(default_factory=Metric)
    link_availability: Literal["not_modeled"] = "not_modeled"

    @field_validator("windows")
    @classmethod
    def earth_windows(cls, value: tuple[VisibilityWindow, ...] | None) -> tuple[VisibilityWindow, ...] | None:
        if value is not None and any(w.target != "earth" for w in value):
            raise ValueError("Communication windows must target Earth")
        return value


class ScenarioComparison(Contract):
    scenario_id: Text
    landing_delay_s: Number
    sunlight_duration_delta_s: Metric[Number] = Field(default_factory=Metric)
    earth_visibility_duration_delta_s: Metric[Number] = Field(default_factory=Metric)
    power_feasibility_changed: Metric[bool] = Field(default_factory=Metric)
    comparison_metrics: dict[str, Metric[Number]] = Field(default_factory=dict)


class ResilienceAnalysis(ScientificProduct):
    baseline_scenario_id: Text
    alternatives: tuple[ScenarioComparison, ...] | None = None


VisibilityClassification = Literal["modeled_obstruction", "conditional_clearance", "indeterminate", "unavailable"]


class TerrainBodyVisibility(Contract):
    azimuth_deg: Azimuth | None = None
    elevation_deg: Elevation | None = None
    horizon_elevation_deg: Elevation | None = None
    clearance_deg: Number | None = None
    classification: VisibilityClassification
    coverage: Literal["sampled_radius", "partial", "unknown"]
    reason: Text


class TerrainVisibilityObservation(Contract):
    time_utc: UTCDateTime
    reference_frame: Literal["MOON_ME_DE421"] = "MOON_ME_DE421"
    sun: TerrainBodyVisibility
    earth: TerrainBodyVisibility
    status: Literal["partial", "unavailable"] = "partial"


class TerrainTransition(Contract):
    target: Literal["sun", "earth"]
    bracket_start_utc: UTCDateTime
    bracket_end_utc: UTCDateTime
    estimate_utc: UTCDateTime
    from_classification: VisibilityClassification
    to_classification: VisibilityClassification
    method: Literal["piecewise_linear_clearance"] = "piecewise_linear_clearance"
    resolution_s: Positive


class TerrainVisibility(Contract):
    model_version: Literal["terrain-center-visibility-v1"] = "terrain-center-visibility-v1"
    validation_status: Literal["unvalidated"] = "unvalidated"
    disk_policy: Literal["center"] = "center"
    global_visibility_confirmed: Literal[False] = False
    dataset_id: Text
    surface_elevation_m: Number
    observer_height_m: NonNegative
    observer_radius_m: Positive
    native_latitude_deg: Number
    native_longitude_deg: Number
    max_search_radius_m: Positive
    azimuth_step_deg: Positive
    radial_step_m: Positive
    observations: tuple[TerrainVisibilityObservation, ...]
    transitions: tuple[TerrainTransition, ...] = ()
    observer_geometry: tuple[dict, ...] = ()
    provenance_ids: tuple[Text, ...]
    assumptions: tuple[Text, ...]


class ProductAvailability(Contract):
    code: Literal["calculated", "geometric_only", "terrain_qualified", "not_requested",
                  "dataset_not_installed", "dataset_unavailable", "outside_dataset_coverage", "reference_frame_error",
                  "missing_observer_information", "missing_user_settings", "calculation_failed", "unsupported"]
    reason: Text


class ScenarioResult(Contract):
    schema_version: Literal["1.0"] = "1.0"
    scenario_id: Text
    request: ScenarioRequest
    provider_mode: ProviderMode
    model_version: Text
    status: Literal["complete", "partial", "failed", "unavailable"]
    observations: tuple[EphemerisObservation, ...] | None = None
    horizon: HorizonProfile | None = None
    visibility_windows: tuple[VisibilityWindow, ...] | None = None
    terrain_visibility: TerrainVisibility | None = None
    power: PowerAnalysis | None = None
    communication: CommunicationAnalysis | None = None
    resilience: ResilienceAnalysis | None = None
    provenance: tuple[DataProvenance, ...]
    errors: tuple[AnalysisError, ...] = ()
    warnings: tuple[Text, ...] = ()
    availability: dict[str, ProductAvailability] = Field(default_factory=dict)

    @model_validator(mode="after")
    def coherent_result(self) -> "ScenarioResult":
        if self.provider_mode != self.request.provider_mode:
            raise ValueError("Result provider must match the explicit request")
        if not self.provenance or any(p.provider_mode != self.provider_mode for p in self.provenance):
            raise ValueError("Result requires matching provider provenance")
        if self.status in ("failed", "unavailable"):
            if not self.errors:
                raise ValueError("Failed/unavailable results require a structured error")
            if any(v is not None for v in (self.observations, self.horizon, self.visibility_windows,
                                           self.power, self.communication, self.resilience, self.terrain_visibility)):
                raise ValueError("Failed/unavailable results cannot contain scientific products")
        for observation in self.observations or ():
            if not self.request.start_utc <= observation.time_utc <= self.request.end_utc:
                raise ValueError("Observation lies outside requested interval")
        for window in self.visibility_windows or ():
            if window.start_utc < self.request.start_utc or window.end_utc > self.request.end_utc:
                raise ValueError("Visibility window lies outside requested interval")
        return self
