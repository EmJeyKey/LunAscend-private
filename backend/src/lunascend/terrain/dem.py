"""Hash-pinned lunar rasters, strict metadata verification and bounded window reads."""
from dataclasses import dataclass
from functools import lru_cache
from hashlib import file_digest
import json
import math
import os
from pathlib import Path
import numpy as np
import rasterio
from rasterio.windows import Window
from pyproj import CRS, Transformer
from lunascend.contracts.terrain import TerrainGrid
from .errors import TerrainError

ROOT = Path(__file__).resolve().parents[4]
MANIFEST = ROOT / "data/manifests/lola-site01.json"
MAX_WINDOW_PIXELS = 4_500_000


def projection_signature(crs: CRS) -> tuple:
    """Compare defining parameters, not arbitrary WKT datum/operation names.

    The source WKT says 'unknown' datum; DE421 identity comes from NASA's README,
    not a terrestrial datum inference or a PyProj datum transformation.
    """
    if not crs.is_projected or crs.coordinate_operation is None:
        return ()
    return (crs.coordinate_operation.method_name, crs.ellipsoid.semi_major_metre,
            crs.ellipsoid.semi_minor_metre, crs.prime_meridian.longitude,
            tuple((p.name, p.value, p.unit_conversion_factor) for p in crs.coordinate_operation.params),
            tuple(axis.unit_conversion_factor for axis in crs.axis_info))


@lru_cache(maxsize=4)
def verified_hash(path: str, size: int, mtime_ns: int) -> str:
    with Path(path).open("rb") as stream:
        return file_digest(stream, "sha256").hexdigest()


@dataclass(frozen=True)
class DatasetConfiguration:
    path: Path
    manifest: dict

    @classmethod
    def selected(cls, dataset_id: str) -> "DatasetConfiguration":
        try:
            manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
            if dataset_id != manifest["dataset_id"]:
                registry = json.loads((ROOT / 'data/manifests/polar-sites/registry.json').read_text(encoding='utf-8'))
                record = next((s for s in registry['sites'] if s['dataset_id'] == dataset_id), None)
                if record is None:
                    raise TerrainError("MISSING_DATA", "Unknown terrain dataset. No synthetic terrain is substituted.")
                manifest = json.loads((ROOT / record['manifest']).read_text(encoding='utf-8'))
                if manifest['dataset_id'] != dataset_id:
                    raise TerrainError('MISSING_DATA', 'Terrain registry identity mismatch.')
                return cls(ROOT / manifest['path'], manifest)
            root = Path(os.environ.get("LUNASCEND_TERRAIN_DIR", str(ROOT / "data/raw/lola-site01")))
            if not root.is_absolute():
                root = ROOT / root
            return cls(root / Path(manifest["path"]).name, manifest)
        except (OSError, ValueError, KeyError) as exc:
            raise TerrainError("MISSING_DATA", "Terrain manifest is missing or invalid.") from exc

    def verify(self) -> None:
        try:
            stat = self.path.stat()
            if stat.st_size != self.manifest["bytes"] or verified_hash(str(self.path.resolve()), stat.st_size, stat.st_mtime_ns) != self.manifest["sha256"]:
                raise TerrainError("MISSING_DATA", "Terrain checksum or file-size mismatch. Restore the pinned dataset.")
        except OSError as exc:
            raise TerrainError("MISSING_DATA", "Pinned terrain data is missing. Run the documented terrain download command.") from exc


class LunarDEM:
    def __init__(self, configuration: DatasetConfiguration):
        configuration.verify()
        self.configuration = configuration
        self.meta = configuration.manifest
        self.dataset = rasterio.open(configuration.path)
        try:
            self._validate()
            self.crs = CRS.from_wkt(self.dataset.crs.to_wkt())
            self.to_map = Transformer.from_crs(self.crs.geodetic_crs, self.crs, always_xy=True)
            self.to_geo = Transformer.from_crs(self.crs, self.crs.geodetic_crs, always_xy=True)
        except Exception:
            self.dataset.close()
            raise

    def _validate(self) -> None:
        ds, m = self.dataset, self.meta
        expected = CRS.from_user_input(m["projection"])
        if (not ds.crs or projection_signature(CRS.from_wkt(ds.crs.to_wkt())) != projection_signature(expected)
            or expected.ellipsoid.semi_major_metre != 1737400 or expected.ellipsoid.semi_minor_metre != 1737400
            or m["reference_frame"] != "MOON_ME_DE421" or m["units"] != "m" or m["reference_radius_m"] != 1737400
            or m["vertical_reference"] != "Height in meters above 1737400 m sphere"
            or ds.driver != "GTiff" or ds.count != 1 or ds.width != m["width"] or ds.height != m["height"]
            or not np.allclose(tuple(ds.transform)[:6], m["transform"], rtol=0, atol=1e-9)
            or ds.scales != (m["scale"],) or ds.offsets != (m["offset"],)
            or ds.transform.b != 0 or ds.transform.d != 0 or ds.transform.a <= 0 or ds.transform.e >= 0
            or (m["nodata"] == "NaN" and not (ds.nodata is not None and math.isnan(ds.nodata)))
            or (m["nodata"] != "NaN" and ds.nodata != m["nodata"])):
            raise TerrainError("FRAME_MISMATCH", "Raster CRS, vertical convention, scale, nodata or registration differs from the pinned manifest.")

    def __enter__(self) -> "LunarDEM": return self
    def __exit__(self, *args) -> None: self.dataset.close()

    def window_for(self, longitude: np.ndarray, latitude: np.ndarray) -> "TerrainWindow":
        x, y = self.to_map.transform(longitude, latitude)
        col, row = (~self.dataset.transform) @ (x, y)
        if not np.isfinite(col).all() or not np.isfinite(row).all():
            raise TerrainError("OUTSIDE_COVERAGE", "Coordinate cannot be projected into the lunar raster.")
        c0 = max(0, int(np.floor(np.min(col) - 1)))
        r0 = max(0, int(np.floor(np.min(row) - 1)))
        c1 = min(self.dataset.width, int(np.ceil(np.max(col) + 1)))
        r1 = min(self.dataset.height, int(np.ceil(np.max(row) + 1)))
        if c1 - c0 < 2 or r1 - r0 < 2:
            raise TerrainError("OUTSIDE_COVERAGE", "Requested region lies outside DEM coverage.")
        if (c1 - c0) * (r1 - r0) > MAX_WINDOW_PIXELS:
            raise TerrainError("RESOURCE_LIMIT", "Local raster window exceeds 4500000 pixels; reduce the analysis radius.")
        window = Window(c0, r0, c1 - c0, r1 - r0)
        raw = self.dataset.read(1, window=window, masked=True, out_dtype="float64")
        values = raw.filled(np.nan) * self.meta["scale"] + self.meta["offset"]
        return TerrainWindow(self, window, values)

    def elevation(self, longitude: float, latitude: float) -> float:
        window = self.window_for(np.array([longitude]), np.array([latitude]))
        heights, _, _ = window.sample(np.array([longitude]), np.array([latitude]))
        if not np.isfinite(heights[0]):
            raise TerrainError("OUTSIDE_COVERAGE", "Observer has no valid four-pixel DEM interpolation support.")
        return float(heights[0])


@dataclass
class TerrainWindow:
    dem: LunarDEM
    window: Window
    values: np.ndarray

    def sample(self, longitude: np.ndarray, latitude: np.ndarray) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
        x, y = self.dem.to_map.transform(longitude, latitude)
        col, row = (~self.dem.dataset.transform) @ (x, y)
        # GDAL's affine locates pixel corners; interpolation uses pixel centers.
        c = col - self.window.col_off - .5
        r = row - self.window.row_off - .5
        ci, ri = np.floor(c).astype(int), np.floor(r).astype(int)
        inside = (ci >= 0) & (ri >= 0) & (ci + 1 < self.values.shape[1]) & (ri + 1 < self.values.shape[0])
        cc, rr = np.clip(ci, 0, max(0, self.values.shape[1] - 2)), np.clip(ri, 0, max(0, self.values.shape[0] - 2))
        a, b = self.values[rr, cc], self.values[rr, cc + 1]
        d, e = self.values[rr + 1, cc], self.values[rr + 1, cc + 1]
        valid = inside & np.isfinite(a) & np.isfinite(b) & np.isfinite(d) & np.isfinite(e)
        dc, dr = c - ci, r - ri
        height = (1 - dr) * ((1 - dc) * a + dc * b) + dr * ((1 - dc) * d + dc * e)
        return np.where(valid, height, np.nan), inside, valid

    def grid(self) -> TerrainGrid:
        if self.values.size > 4096:
            raise TerrainError("RESOURCE_LIMIT", "Visualization grids are limited to 4096 original pixels; request a smaller window.")
        transform = self.dem.dataset.window_transform(self.window)
        origin_lon, origin_lat = self.dem.to_geo.transform(transform.c, transform.f)
        return TerrainGrid(crs_wkt=self.dem.dataset.crs.to_wkt(), reference_frame="MOON_ME_DE421",
            vertical_reference=self.dem.meta["vertical_reference"], reference_radius_m=1737400.0,
            upper_left_x_m=transform.c, upper_left_y_m=transform.f,
            upper_left_latitude_deg=float(origin_lat), upper_left_longitude_deg=float(origin_lon),
            pixel_spacing_x_m=transform.a, pixel_spacing_y_m=transform.e,
            heights_m=tuple(tuple(float(v) if np.isfinite(v) else None for v in row) for row in self.values),
            nodata_mask=tuple(tuple(not np.isfinite(v) for v in row) for row in self.values),
            terrain_source=self.dem.meta["dataset_id"])
