import { describe, it, expect } from "vitest";
import { MAX_PASTE_STEPS, PASTE_OFFSET_PX, pasteOffset, pasteStep, type Point } from "./pasteOffset";

const original: Point = { x: 100, y: 100 };
const at = (step: number, from: Point = original): Point => ({
  x: from.x + step * PASTE_OFFSET_PX,
  y: from.y + step * PASTE_OFFSET_PX,
});

describe("pasteStep", () => {
  it("moves a copy one step off its original", () => {
    expect(pasteStep([original], [original])).toBe(1);
  });

  it("steps further while earlier copies are still there", () => {
    expect(pasteStep([original], [original, at(1)])).toBe(2);
    expect(pasteStep([original], [original, at(1), at(2)])).toBe(3);
  });

  it("goes back to the first step once the copies are deleted", () => {
    // Copy, paste, delete the copy, paste again: only the original is left.
    expect(pasteStep([original], [original])).toBe(1);
  });

  it("uses a free step in a gap left by a deleted copy", () => {
    expect(pasteStep([original], [original, at(2)])).toBe(1);
  });

  it("does not move a copy that lands on empty ground, for example when the original is gone", () => {
    expect(pasteStep([original], [])).toBe(0);
  });

  it("moves a group until none of its shapes lands on an existing shape", () => {
    const a: Point = { x: 0, y: 0 };
    const b: Point = { x: 500, y: 0 };
    // b's first step is taken by something that sits there, so the whole group goes to step 2.
    expect(pasteStep([a, b], [a, b, at(1, b)])).toBe(2);
  });

  it("treats positions less than a pixel apart as the same spot", () => {
    expect(pasteStep([original], [{ x: 100.4, y: 99.6 }])).toBe(1);
  });

  it("stops at a limit instead of looping forever when every step is taken", () => {
    const taken = Array.from({ length: MAX_PASTE_STEPS + 5 }, (_, i) => at(i));
    expect(pasteStep([original], taken)).toBe(MAX_PASTE_STEPS);
  });
});

describe("pasteOffset", () => {
  it("is down and to the right, by one step each time", () => {
    expect(pasteOffset(0)).toEqual({ x: 0, y: 0 });
    expect(pasteOffset(1)).toEqual({ x: PASTE_OFFSET_PX, y: PASTE_OFFSET_PX });
    expect(pasteOffset(3)).toEqual({ x: PASTE_OFFSET_PX * 3, y: PASTE_OFFSET_PX * 3 });
  });

  it("never goes up or left", () => {
    expect(pasteOffset(-2)).toEqual({ x: 0, y: 0 });
  });
});
