"""Bounded visualization products, distinct from scientific horizon resolution."""
from typing import Annotated, Literal
from pydantic import Field, field_validator, model_validator
from .common import Contract, Number, NonNegative, Text, UTCDateTime
from .terrain import TerrainRequest

Vector3 = tuple[Number, Number, Number]


class MeshRequest(Contract):
    dataset_id: Text = 'lola-site01-5m-v2020'
    site_id: Text = 'viewer-site'
    latitude_deg: Annotated[Number, Field(gt=-90, lt=90)]
    longitude_deg: Number
    reference_frame: Literal['MOON_ME_DE421', 'MOON_ME_DE440_ME421']
    coordinate_epoch_utc: UTCDateTime | None = None
    observer_height_m: Annotated[NonNegative, Field(le=10000)] = 0.0
    half_extent_m: Annotated[Number, Field(ge=50, le=4000)] = 1000.0
    max_grid_side: Literal[33, 65, 129] = 65

    @field_validator('longitude_deg')
    @classmethod
    def wrap(cls, value: float) -> float:
        return (value+180.0)%360.0-180.0

    def terrain_anchor(self) -> TerrainRequest:
        return TerrainRequest(dataset_id=self.dataset_id, site_id=self.site_id,
            latitude_deg=self.latitude_deg, longitude_deg=self.longitude_deg,
            reference_frame=self.reference_frame, coordinate_epoch_utc=self.coordinate_epoch_utc,
            observer_height_m=self.observer_height_m, azimuth_samples=4,
            max_search_radius_m=1.0, radial_step_m=1.0)

    @model_validator(mode='after')
    def frame_epoch(self) -> 'MeshRequest':
        self.terrain_anchor()  # Shared frame/epoch validation; no horizon calculation.
        return self


class TerrainMesh(Contract):
    model_version: Literal['lola-render-mesh-v1'] = 'lola-render-mesh-v1'
    request: MeshRequest
    reference_frame: Literal['MOON_ME_DE421'] = 'MOON_ME_DE421'
    reference_radius_m: Literal[1737400.0] = 1737400.0
    vertical_reference: Text
    elevation_units: Literal['m'] = 'm'
    crs_wkt: str
    source_url: Text
    source_sha256: Text
    source_pixel_spacing_m: Number
    source_window_shape: tuple[int, int]
    grid_shape: tuple[int, int]
    source_stride_pixels: int
    projected_x_m: tuple[Number, ...]
    projected_y_m: tuple[Number, ...]
    requested_bounds_m: tuple[Number, Number, Number, Number]
    dataset_bounds_m: tuple[Number, Number, Number, Number]
    native_latitude_deg: Number
    native_longitude_deg: Number
    surface_elevation_m: Number
    observer_scene_m: Vector3
    body_origin_m: Vector3
    # Rows of the proper rotation: native body XYZ -> scene east, up, minus north.
    body_to_scene: tuple[Vector3, Vector3, Vector3]
    frame_transform: dict
    positions_m: tuple[Vector3 | None, ...]
    radial_vectors_scene: tuple[Vector3, ...]
    latitude_deg: tuple[Number, ...]
    longitude_deg: tuple[Number, ...]
    elevation_m: tuple[Number | None, ...]
    indices: tuple[int, ...]
    boundary_edges: tuple[tuple[int, int], ...]
    original_elevation_range_m: tuple[Number, Number]
    mesh_elevation_range_m: tuple[Number, Number]
    nodata_pixels: int
    omitted_cells: int
    warnings: tuple[Text, ...]

    @model_validator(mode='after')
    def coherent(self) -> 'TerrainMesh':
        n = self.grid_shape[0]*self.grid_shape[1]
        if n > 16641 or n != len(self.positions_m) or any(len(a)!=n for a in
            (self.radial_vectors_scene,self.latitude_deg,self.longitude_deg,self.elevation_m)):
            raise ValueError('Inconsistent or excessive mesh arrays')
        if len(self.projected_x_m)!=self.grid_shape[1] or len(self.projected_y_m)!=self.grid_shape[0]:
            raise ValueError('Mesh axis dimensions do not match')
        if len(self.indices)%3 or len(self.indices)>98304 or any(i<0 or i>=n or self.positions_m[i] is None for i in self.indices):
            raise ValueError('Invalid or unsupported triangle indices')
        return self


class InspectionRequest(Contract):
    anchor: MeshRequest
    latitude_deg: Annotated[Number, Field(gt=-90, lt=90)]
    longitude_deg: Annotated[Number, Field(ge=-180, lt=180)]


class TerrainInspection(Contract):
    reference_frame: Literal['MOON_ME_DE421'] = 'MOON_ME_DE421'
    latitude_deg: Number
    longitude_deg: Number
    elevation_m: Number
    distance_from_site_m: NonNegative
    input_frame_latitude_deg: Number
    input_frame_longitude_deg: Number
    input_reference_frame: Text
    coordinate_epoch_utc: UTCDateTime | None
    dataset_id: Text
    source_sha256: Text
    method: Literal['bilinear original DEM; four finite neighbors'] = 'bilinear original DEM; four finite neighbors'
