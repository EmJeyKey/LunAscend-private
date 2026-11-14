"""Coordinate anchor for context imagery; no image registration is implied."""
from typing import Annotated, Literal
from datetime import datetime
from pydantic import Field, field_validator
from .common import Contract, Number, Text, UTCDateTime


class ImageAnchorRequest(Contract):
    latitude_deg: Annotated[Number, Field(gt=-90, lt=90)]
    longitude_deg: Annotated[Number, Field(ge=-180, le=180)]
    coordinate_epoch_utc: UTCDateTime

    @field_validator('coordinate_epoch_utc')
    @classmethod
    def supported_epoch(cls, value: datetime) -> datetime:
        if value.year < 1972:
            raise ValueError('UTC coordinate epochs before 1972 are unsupported')
        return value


class ImageAnchorResponse(Contract):
    request: ImageAnchorRequest
    latitude_deg: Annotated[Number, Field(ge=-90, le=90)]
    longitude_deg: Annotated[Number, Field(ge=-180, le=180)]
    reference_frame: Literal['MOON_ME_DE421'] = 'MOON_ME_DE421'
    frame_transform: dict
    registration_verified: Literal[False] = False
    qualification: Text
