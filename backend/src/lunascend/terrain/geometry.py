"""Spherical, observer-centered terrain geometry. SI meters and degrees."""
import numpy as np

RADIUS_M = 1737400.0


def local_basis(latitude_deg: float, longitude_deg: float) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    lat, lon = np.deg2rad([latitude_deg, longitude_deg])
    up = np.array([np.cos(lat) * np.cos(lon), np.cos(lat) * np.sin(lon), np.sin(lat)])
    east = np.array([-np.sin(lon), np.cos(lon), 0.0])
    north = np.cross(up, east)
    return up, east, north


def ray_units(latitude_deg: float, longitude_deg: float, azimuth_deg: np.ndarray,
              distance_m: np.ndarray, radius_m: float = RADIUS_M) -> np.ndarray:
    """Great circles on reference sphere; azimuth clockwise from local north."""
    up, east, north = local_basis(latitude_deg, longitude_deg)
    az = np.deg2rad(azimuth_deg)
    tangent = np.cos(az)[:, None] * north + np.sin(az)[:, None] * east
    delta = distance_m / radius_m
    return np.cos(delta)[None, :, None] * up + np.sin(delta)[None, :, None] * tangent[:, None, :]


def unit_lonlat(vectors: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    return np.rad2deg(np.arctan2(vectors[..., 1], vectors[..., 0])), np.rad2deg(np.arctan2(vectors[..., 2], np.hypot(vectors[..., 0], vectors[..., 1])))


def apparent_elevation(distance_m: np.ndarray, terrain_height_m: np.ndarray,
                       surface_elevation_m: float, observer_height_m: float,
                       radius_m: float = RADIUS_M) -> np.ndarray:
    """Exact spherical radial geometry, with a cancellation-safe vertical component.

    dot(Pterrain-Pobserver, up) = (R+z)cos(d/R)-(R+z0+h).
    Horizontal norm = (R+z)sin(d/R). Invalid heights propagate as NaN.
    """
    delta = distance_m / radius_m
    vertical = terrain_height_m - surface_elevation_m - observer_height_m - 2 * (radius_m + terrain_height_m) * np.sin(delta / 2) ** 2
    horizontal = (radius_m + terrain_height_m) * np.sin(delta)
    return np.rad2deg(np.arctan2(vertical, horizontal))
