// Zoom levels are tldraw zoom: 1 = 100%.
export const SOFT_MIN_ZOOM = 0.1;
export const SOFT_MAX_ZOOM = 4;
export const HARD_MIN_ZOOM = 0.05;
export const HARD_MAX_ZOOM = 8;

export const SPRING_IDLE_MS = 350;
export const SPRING_REST_FACTOR = 0.85;
export const SPRING_DURATION_MS = 450;

// tldraw clamps the camera to the first and last step, so the hard limits go at the ends.
export const ZOOM_STEPS = [
  HARD_MIN_ZOOM,
  SOFT_MIN_ZOOM,
  0.25,
  0.5,
  1,
  2,
  SOFT_MAX_ZOOM,
  HARD_MAX_ZOOM,
];
