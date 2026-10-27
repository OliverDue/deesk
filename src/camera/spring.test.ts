import { describe, it, expect } from "vitest";
import { springTarget, zoomAbout, type Camera, type Point } from "./spring";
import {
  SOFT_MAX_ZOOM,
  SOFT_MIN_ZOOM,
  SPRING_IDLE_MS,
  SPRING_REST_FACTOR,
} from "./springConfig";

describe("springTarget", () => {
  it("does nothing inside the soft limits, however long the user is idle", () => {
    for (const z of [SOFT_MIN_ZOOM, 0.5, 1, 2, SOFT_MAX_ZOOM]) {
      expect(springTarget(z, SPRING_IDLE_MS * 10)).toBeNull();
    }
  });

  it("waits until the user has stopped zooming", () => {
    expect(springTarget(SOFT_MAX_ZOOM * 1.5, SPRING_IDLE_MS - 1)).toBeNull();
    expect(springTarget(SOFT_MIN_ZOOM / 1.5, SPRING_IDLE_MS - 1)).toBeNull();
  });

  it("eases back to just inside the upper limit", () => {
    expect(springTarget(SOFT_MAX_ZOOM * 1.5, SPRING_IDLE_MS)).toBeCloseTo(
      SOFT_MAX_ZOOM * SPRING_REST_FACTOR,
    );
  });

  it("eases back to just inside the lower limit", () => {
    expect(springTarget(SOFT_MIN_ZOOM / 1.5, SPRING_IDLE_MS)).toBeCloseTo(
      SOFT_MIN_ZOOM / SPRING_REST_FACTOR,
    );
  });

  it("always lands inside the soft limits and moves back toward them", () => {
    for (const z of [0.01, 0.05, 0.09, 4.01, 5, 8, 50]) {
      const target = springTarget(z, SPRING_IDLE_MS);
      expect(target).not.toBeNull();
      expect(target as number).toBeGreaterThanOrEqual(SOFT_MIN_ZOOM);
      expect(target as number).toBeLessThanOrEqual(SOFT_MAX_ZOOM);
      if (z > SOFT_MAX_ZOOM) expect(target as number).toBeLessThan(z);
      else expect(target as number).toBeGreaterThan(z);
    }
  });

  it("ignores impossible zoom values", () => {
    for (const z of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(springTarget(z, SPRING_IDLE_MS * 10)).toBeNull();
    }
  });
});

describe("zoomAbout", () => {
  // tldraw maps a page point to the screen as (page + camera) * zoom.
  const toScreen = (c: Camera, p: Point): Point => ({ x: (p.x + c.x) * c.z, y: (p.y + c.y) * c.z });

  it("keeps the page point under the chosen screen point fixed", () => {
    const camera: Camera = { x: -120, y: 75, z: 8 };
    const centre: Point = { x: 640, y: 400 };
    const page: Point = { x: centre.x / camera.z - camera.x, y: centre.y / camera.z - camera.y };

    const next = zoomAbout(camera, centre, 3.4);
    const after = toScreen(next, page);

    expect(next.z).toBe(3.4);
    expect(after.x).toBeCloseTo(centre.x);
    expect(after.y).toBeCloseTo(centre.y);
  });

  it("works when zooming out as well", () => {
    const camera: Camera = { x: 30, y: -10, z: 0.05 };
    const centre: Point = { x: 500, y: 300 };
    const page: Point = { x: centre.x / camera.z - camera.x, y: centre.y / camera.z - camera.y };

    const after = toScreen(zoomAbout(camera, centre, 0.12), page);

    expect(after.x).toBeCloseTo(centre.x);
    expect(after.y).toBeCloseTo(centre.y);
  });

  it("returns the same camera when the zoom is unchanged", () => {
    const camera: Camera = { x: 1, y: 2, z: 1 };
    expect(zoomAbout(camera, { x: 10, y: 10 }, 1)).toBe(camera);
  });

  it("returns the same camera for an invalid zoom", () => {
    const camera: Camera = { x: 1, y: 2, z: 1 };
    for (const z of [0, -2, Number.NaN]) {
      expect(zoomAbout(camera, { x: 10, y: 10 }, z)).toBe(camera);
    }
  });
});
