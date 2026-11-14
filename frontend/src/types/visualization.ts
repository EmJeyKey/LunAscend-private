export type Vector3 = [number,number,number]
export interface MeshRequest {
  dataset_id:string;site_id:string;latitude_deg:number;longitude_deg:number
  reference_frame:'MOON_ME_DE440_ME421'|'MOON_ME_DE421';coordinate_epoch_utc:string|null
  observer_height_m:number;half_extent_m:number;max_grid_side:33|65|129
}
export interface TerrainMesh {
  model_version:'lola-render-mesh-v1';request:MeshRequest;reference_frame:'MOON_ME_DE421';reference_radius_m:1737400
  vertical_reference:string;elevation_units:'m';crs_wkt:string;source_url:string;source_sha256:string;source_pixel_spacing_m:number
  source_window_shape:[number,number];grid_shape:[number,number];source_stride_pixels:number
  projected_x_m:number[];projected_y_m:number[];requested_bounds_m:[number,number,number,number];dataset_bounds_m:[number,number,number,number]
  native_latitude_deg:number;native_longitude_deg:number;surface_elevation_m:number;observer_scene_m:Vector3;body_origin_m:Vector3
  body_to_scene:[Vector3,Vector3,Vector3];frame_transform:Record<string,unknown>
  positions_m:(Vector3|null)[];radial_vectors_scene:Vector3[];latitude_deg:number[];longitude_deg:number[];elevation_m:(number|null)[]
  indices:number[];boundary_edges:[number,number][];original_elevation_range_m:[number,number];mesh_elevation_range_m:[number,number]
  nodata_pixels:number;omitted_cells:number;warnings:string[]
}
export interface TerrainInspection {
  reference_frame:'MOON_ME_DE421';latitude_deg:number;longitude_deg:number;elevation_m:number;distance_from_site_m:number
  input_frame_latitude_deg:number;input_frame_longitude_deg:number;input_reference_frame:string;coordinate_epoch_utc:string|null
  dataset_id:string;source_sha256:string;method:'bilinear original DEM; four finite neighbors'
}
export interface DirectionOverlay {sun:Vector3|null;earth:Vector3|null;origin:Vector3;surfaceSun?:boolean;surfaceEarth?:boolean}
export interface SurfaceBearing {azimuth:number;elevation:number}
export interface RenderStats {draws:number;meshBuilds:number;vertexUpdates:number;triangles:number;bufferBytes:number;lastDrawMs:number;meshBuildMs:number}
