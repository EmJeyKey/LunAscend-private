"""Bounded terrain-only v1 API; existing scenario endpoints remain unchanged."""
from math import ceil
from typing import Annotated, Literal
from pydantic import Field, field_validator, model_validator
from .common import Contract, Number, NonNegative, Text, UTCDateTime
from .models import DataProvenance, HorizonProfile


class TerrainRequest(Contract):
    schema_version: Literal["1.0"] = "1.0"
    dataset_id: Text
    site_id: Text = "terrain-observer"
    latitude_deg: Annotated[Number, Field(ge=-90, le=90)]
    longitude_deg: Number
    reference_frame: Literal["MOON_ME_DE421", "MOON_ME_DE440_ME421"]
    coordinate_epoch_utc: UTCDateTime | None = None
    observer_height_m: Annotated[NonNegative, Field(le=10000)] = 0.0
    reference_radius_m: Literal[1737400.0] = 1737400.0
    azimuth_samples: Annotated[int, Field(strict=True, ge=4, le=720)] = 360
    max_search_radius_m: Annotated[Number, Field(ge=1, le=50000)] = 2500.0
    radial_step_m: Annotated[Number, Field(ge=1, le=1000)] = 5.0

    @field_validator("longitude_deg")
    @classmethod
    def wrap_longitude(cls, value: float) -> float:
        return (value + 180.0) % 360.0 - 180.0

    @model_validator(mode="after")
    def bounded(self) -> "TerrainRequest":
        if self.radial_step_m > self.max_search_radius_m:
            raise ValueError("Radial step exceeds search radius")
        if self.azimuth_samples * (ceil(self.max_search_radius_m / self.radial_step_m) + 1) > 500000:
            raise ValueError("Terrain workload exceeds 500000 samples")
        if self.reference_frame != "MOON_ME_DE421" and self.coordinate_epoch_utc is None:
            raise ValueError("DE440/ME421 conversion requires an explicit coordinate epoch")
        if self.coordinate_epoch_utc is not None and self.coordinate_epoch_utc.year < 1972:
            raise ValueError("UTC coordinate epochs before 1972 are unsupported, consistent with the geometry engine")
        if abs(self.latitude_deg) == 90:
            raise ValueError("Azimuth is undefined at the exact pole; choose a nonpolar observer")
        return self


class TerrainGrid(Contract):
    crs_wkt: str
    reference_frame: Text
    vertical_reference: Text
    reference_radius_m: Number
    upper_left_x_m: Number
    upper_left_y_m: Number
    upper_left_latitude_deg: Number
    upper_left_longitude_deg: Number
    pixel_spacing_x_m: Number
    pixel_spacing_y_m: Number
    # Pixel-center heights; null and mask mean unknown, never zero terrain.
    heights_m: tuple[tuple[Number | None, ...], ...]
    nodata_mask: tuple[tuple[bool, ...], ...]
    terrain_source: Text

    @model_validator(mode="after")
    def coherent_grid(self) -> "TerrainGrid":
        width = len(self.heights_m[0]) if self.heights_m else 0
        if not width or len(self.nodata_mask) != len(self.heights_m):
            raise ValueError("Grid dimensions must match nodata mask")
        for heights, mask in zip(self.heights_m, self.nodata_mask):
            if len(heights) != width or len(mask) != width or any((value is None) != missing for value, missing in zip(heights, mask)):
                raise ValueError("Grid shape or nodata mask is inconsistent")
        return self


class TerrainResult(Contract):
    schema_version: Literal["1.0"] = "1.0"
    request: TerrainRequest
    horizon: HorizonProfile
    surface_elevation_m: Number
    dataset_observer_latitude_deg: Number
    dataset_observer_longitude_deg: Number
    dataset_reference_frame: Literal["MOON_ME_DE421"] = "MOON_ME_DE421"
    frame_transform: dict
    sampling_details: dict
    provenance: tuple[DataProvenance, ...]
    warnings: tuple[Text, ...]
