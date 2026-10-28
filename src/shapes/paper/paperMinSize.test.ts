import { describe, it, expect } from "vitest";
import { boundsInParent, contentMinSize } from "./paperMinSize";

describe("boundsInParent", () => {
  it("moves a shape's bounds by its position", () => {
    expect(boundsInParent({ x: 0, y: 0, w: 100, h: 50 }, { x: 30, y: 20, rotation: 0 })).toEqual({
      x: 30,
      y: 20,
      w: 100,
      h: 50,
    });
  });

  it("includes the offset of the bounds inside the shape", () => {
    expect(boundsInParent({ x: 10, y: 5, w: 100, h: 50 }, { x: 30, y: 20, rotation: 0 })).toEqual({
      x: 40,
      y: 25,
      w: 100,
      h: 50,
    });
  });

  it("covers a rotated shape", () => {
    // A quarter turn maps (x, y) to (-y, x): a 10 x 20 box becomes 20 wide and 10 tall.
    const b = boundsInParent({ x: 0, y: 0, w: 10, h: 20 }, { x: 0, y: 0, rotation: Math.PI / 2 });
    expect(b.x).toBeCloseTo(-20);
    expect(b.y).toBeCloseTo(0);
    expect(b.w).toBeCloseTo(20);
    expect(b.h).toBeCloseTo(10);
  });
});

describe("contentMinSize", () => {
  const min = { w: 120, h: 120 };

  it("is the minimum size when there are no figures", () => {
    expect(contentMinSize([], min)).toEqual(min);
  });

  it("reaches the farthest right and bottom edge of the figures", () => {
    const figures = [
      { x: 250, y: 100, w: 100, h: 50 },
      { x: 10, y: 300, w: 20, h: 20 },
    ];
    expect(contentMinSize(figures, min)).toEqual({ w: 350, h: 320 });
  });

  it("never goes below the minimum size", () => {
    expect(contentMinSize([{ x: 5, y: 5, w: 10, h: 10 }], min)).toEqual(min);
  });

  it("ignores a figure that lies wholly left of or above the paper", () => {
    expect(contentMinSize([{ x: -50, y: -50, w: 30, h: 30 }], min)).toEqual(min);
  });
});
