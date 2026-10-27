import {
  SOFT_MAX_ZOOM,
  SOFT_MIN_ZOOM,
  SPRING_IDLE_MS,
  SPRING_REST_FACTOR,
} from "./springConfig";

export interface Camera {
  x: number;
  y: number;
  z: number;
}

export interface Point {
  x: number;
  y: number;
}

// Where the zoom should ease back to, or null when nothing should happen.
export function springTarget(zoom: number, msSinceLastChange: number): number | null {
  if (!Number.isFinite(zoom) || zoom <= 0) return null;
  if (msSinceLastChange < SPRING_IDLE_MS) return null;
  if (zoom > SOFT_MAX_ZOOM) return SOFT_MAX_ZOOM * SPRING_REST_FACTOR;
  if (zoom < SOFT_MIN_ZOOM) return SOFT_MIN_ZOOM / SPRING_REST_FACTOR;
  return null;
}

// Change the zoom while keeping the page point under `screenPoint` where it is.
// tldraw maps a page point to the screen as (page + camera) * zoom.
export function zoomAbout(camera: Camera, screenPoint: Point, newZoom: number): Camera {
  if (!Number.isFinite(newZoom) || newZoom <= 0 || newZoom === camera.z) return camera;
  return {
    x: screenPoint.x / newZoom - screenPoint.x / camera.z + camera.x,
    y: screenPoint.y / newZoom - screenPoint.y / camera.z + camera.y,
    z: newZoom,
  };
}
