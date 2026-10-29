"""Shared immutable boundary types. Units belong in field names."""

from datetime import datetime, timezone
from typing import Annotated, Generic, Literal, TypeVar

from pydantic import (
    AfterValidator, AwareDatetime, BaseModel, BeforeValidator, ConfigDict,
    Field, model_validator,
)


class Contract(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False, frozen=True)


def require_timestamp(value: object) -> object:
    if not isinstance(value, (str, datetime)):
        raise ValueError("Use a timezone-aware ISO 8601 timestamp, not epoch seconds")
    return value


UTCDateTime = Annotated[
    AwareDatetime,
    BeforeValidator(require_timestamp),
    AfterValidator(lambda value: value.astimezone(timezone.utc)),
]
Text = Annotated[str, Field(min_length=1, max_length=500, pattern=r"\S")]
Number = Annotated[float, Field(strict=True, allow_inf_nan=False)]
NonNegative = Annotated[Number, Field(ge=0)]
Positive = Annotated[Number, Field(gt=0)]
Azimuth = Annotated[Number, Field(ge=0, lt=360)]
Elevation = Annotated[Number, Field(ge=-90, le=90)]
ProviderMode = Literal["mock", "scientific"]
CalculationStatus = Literal[
    "unavailable", "not_requested", "illustrative", "calculated", "partial"
]
ValidationStatus = Literal["mock", "unvalidated", "reference_compared", "validated"]
T = TypeVar("T")


class Metric(Contract, Generic[T]):
    value: T | None = None
    status: Literal["available", "unavailable", "not_requested", "partial"] = "unavailable"
    reason: Text | None = None
    provenance_ids: tuple[Text, ...] = ()
    validation: ValidationStatus = "unvalidated"
    validation_report_id: Text | None = None

    @model_validator(mode="after")
    def consistent_availability(self) -> "Metric[T]":
        if self.status in ("available", "partial") and self.value is None:
            raise ValueError("Available metrics require a value")
        if self.status in ("unavailable", "not_requested") and self.value is not None:
            raise ValueError("Unavailable metrics cannot contain values")
        if self.validation in ("reference_compared", "validated") and not self.validation_report_id:
            raise ValueError("Scientific validation requires an executed report reference")
        return self


class AnalysisError(Contract):
    code: Literal[
        "INVALID_REQUEST", "PROVIDER_UNAVAILABLE", "MISSING_DATA", "OUTSIDE_COVERAGE",
        "FRAME_MISMATCH", "UNSUPPORTED_TIME", "RESOURCE_LIMIT", "CALCULATION_FAILED",
    ]
    message: Text
    field: Text | None = None
    module: Text | None = None
    recoverable: bool = False
    details: dict[str, str] = Field(default_factory=dict)


class ErrorResponse(Contract):
    errors: tuple[AnalysisError, ...]
