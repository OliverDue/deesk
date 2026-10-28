import { describe, expect, it } from "vitest";
import { papersUnderPin, pinChanges, pointInFrame, type PaperFrame } from "./pin";

const frame = (over: Partial<PaperFrame> = {}): PaperFrame => ({
  id: "a",
  x: 100,
  y: 100,
  rotation: 0,
  w: 300,
  h: 380,
  ...over,
});

describe("pointInFrame", () => {
  it("is true inside and false outside an unrotated paper", () => {
    expect(pointInFrame({ x: 200, y: 200 }, frame())).toBe(true);
    expect(pointInFrame({ x: 50, y: 200 }, frame())).toBe(false);
    expect(pointInFrame({ x: 200, y: 500 }, frame())).toBe(false);
  });

  it("counts the edge as inside", () => {
    expect(pointInFrame({ x: 100, y: 100 }, frame())).toBe(true);
    expect(pointInFrame({ x: 400, y: 480 }, frame())).toBe(true);
  });

  it("follows a rotated paper: a quarter turn about its top-left corner", () => {
    const f = frame({ rotation: Math.PI / 2 });
    // The paper now extends left of x = 100 (its width runs down, its height runs left).
    expect(pointInFrame({ x: 0, y: 200 }, f)).toBe(true);
    expect(pointInFrame({ x: 200, y: 200 }, f)).toBe(false);
  });

  it("is not fooled by the corner of an unrotated box that a tilted paper does not cover", () => {
    const f = frame({ x: 0, y: 0, w: 200, h: 40, rotation: Math.PI / 4 });
    expect(pointInFrame({ x: 190, y: 5 }, f)).toBe(false);
    expect(pointInFrame({ x: 100, y: 100 }, f)).toBe(true);
  });
});

describe("papersUnderPin", () => {
  it("returns every paper under the point, overlapping or not", () => {
    const frames = [
      frame({ id: "a" }),
      frame({ id: "b", x: 150, y: 150 }),
      frame({ id: "far", x: 2000, y: 2000 }),
    ];
    expect(papersUnderPin({ x: 200, y: 200 }, frames)).toEqual(["a", "b"]);
  });

  it("returns nothing on bare desk or with no papers", () => {
    expect(papersUnderPin({ x: 0, y: 0 }, [frame()])).toEqual([]);
    expect(papersUnderPin({ x: 0, y: 0 }, [])).toEqual([]);
  });
});

describe("pinChanges", () => {
  it("adds the new papers and removes the ones left behind", () => {
    expect(pinChanges(["a", "b"], ["b", "c"])).toEqual({ add: ["c"], remove: ["a"] });
  });

  it("changes nothing when the sets match", () => {
    expect(pinChanges(["a"], ["a"])).toEqual({ add: [], remove: [] });
  });
});
