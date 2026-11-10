"""Explicit hardware assumptions and conditional engineering model outputs (SI/Wh)."""
from typing import Annotated, Literal
from pydantic import Field, model_validator
from .common import Contract, Number, NonNegative, Positive, UTCDateTime, Text

Fraction = Annotated[Number, Field(ge=0, le=1)]
Efficiency = Annotated[Number, Field(gt=0, le=1)]
Percent = Annotated[Number, Field(ge=0, le=100)]


class PowerConfiguration(Contract):
    panel_area_m2: Annotated[NonNegative, Field(le=1000000)]
    panel_efficiency: Fraction
    solar_irradiance_w_m2: Annotated[NonNegative, Field(le=10000)] = 1361.0
    orientation_mode: Literal["fixed_horizontal", "ideal_sun_tracking"] = "fixed_horizontal"
    system_efficiency: Fraction = 0.9
    derating_factor: Fraction = 1.0
    baseline_load_w: Annotated[NonNegative, Field(le=1000000000)]
    heater_load_w: Annotated[NonNegative, Field(le=1000000000)] = 0.0
    battery_capacity_wh: Annotated[Positive, Field(le=1000000000000)]
    initial_soc_pct: Percent = 100.0
    minimum_soc_pct: Percent = 10.0
    charging_efficiency: Efficiency = 0.95
    discharging_efficiency: Efficiency = 0.95

    @model_validator(mode="after")
    def reserve(self) -> "PowerConfiguration":
        if self.initial_soc_pct < self.minimum_soc_pct:
            raise ValueError("Initial charge must not be below the configured minimum reserve")
        return self


class CommunicationConfiguration(Contract):
    minimum_earth_clearance_deg: Annotated[NonNegative, Field(le=90)] = 0.0


class EnergyTotals(Contract):
    solar_generated_wh: NonNegative | None = None
    electrical_demand_wh: NonNegative
    direct_solar_to_load_wh: NonNegative | None = None
    battery_charged_wh: NonNegative | None = None
    battery_discharged_wh: NonNegative | None = None
    charging_loss_wh: NonNegative | None = None
    discharging_loss_wh: NonNegative | None = None
    curtailed_surplus_wh: NonNegative | None = None
    final_battery_energy_wh: NonNegative | None = None
    minimum_battery_energy_wh: NonNegative | None = None
    minimum_soc_pct: Percent | None = None
    unmet_load_wh: NonNegative | None = None
    energy_balance_residual_wh: Number | None = None


class BatterySample(Contract):
    time_utc: UTCDateTime
    solar_generation_w: NonNegative | None = None
    load_w: NonNegative
    battery_energy_wh: NonNegative | None = None
    soc_pct: Percent | None = None
    environmental_status: Text


class DepletionInterval(Contract):
    start_utc: UTCDateTime
    end_utc: UTCDateTime
    unmet_load_wh: Positive
    method: Literal["interval_containing_unmet_load"] = "interval_containing_unmet_load"


class EnergyCase(Contract):
    assumption: Literal["conservative", "optimistic"]
    status: Literal["calculated", "partial", "unavailable"]
    passes_configured_model: bool | None
    coverage_fraction: Fraction
    covered_duration_s: NonNegative
    unknown_duration_s: NonNegative
    max_sample_step_s: Positive | None = None
    totals: EnergyTotals
    samples: tuple[BatterySample, ...]
    potential_depletion_intervals: tuple[DepletionInterval, ...] = ()
    assumptions: tuple[Text, ...]


AccessClassification = Literal["modeled_obstruction", "below_clearance_requirement", "conditional_access", "indeterminate", "unavailable"]


class AccessSample(Contract):
    time_utc: UTCDateTime
    earth_clearance_deg: Number | None
    terrain_classification: Text
    classification: AccessClassification
    coverage: Text
