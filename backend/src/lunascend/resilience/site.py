"""Reuse the verified isolated NAIF bridge, without touching ephemeris pool."""
from lunascend.contracts.terrain import TerrainRequest
from lunascend.terrain.frames import frame_rotation
from lunascend.terrain.geometry import local_basis, unit_lonlat
from lunascend.contracts.models import LunarSite
from datetime import datetime


def shift_coordinates(site: LunarSite, original: datetime, shifted: datetime) -> tuple[float,float]:
    def rotation(epoch):
        return frame_rotation(TerrainRequest(dataset_id='lola-site01-5m-v2020',site_id=site.site_id,
            latitude_deg=site.latitude_deg,longitude_deg=site.longitude_deg,reference_frame='MOON_ME_DE440_ME421',
            coordinate_epoch_utc=epoch,observer_height_m=site.observer_height_m,azimuth_samples=4,
            max_search_radius_m=1.0,radial_step_m=1.0))[0]
    native = rotation(original) @ local_basis(site.latitude_deg,site.longitude_deg)[0]
    lon,lat = unit_lonlat(rotation(shifted).T @ native)
    return float(lat),float(lon)
