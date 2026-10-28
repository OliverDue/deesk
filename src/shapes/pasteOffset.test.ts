import { describe, it, expect } from "vitest";
import { PASTE_OFFSET_PX, createPasteCounter, pasteOffset } from "./pasteOffset";

describe("pasteOffset", () => {
  it("moves a first paste down and to the right", () => {
    expect(pasteOffset(1)).toEqual({ x: PASTE_OFFSET_PX, y: PASTE_OFFSET_PX });
  });

  it("steps further for each further paste of the same copy", () => {
    expect(pasteOffset(2)).toEqual({ x: PASTE_OFFSET_PX * 2, y: PASTE_OFFSET_PX * 2 });
    expect(pasteOffset(5)).toEqual({ x: PASTE_OFFSET_PX * 5, y: PASTE_OFFSET_PX * 5 });
  });

  it("never offsets by nothing, so a copy can never land exactly on its original", () => {
    for (const n of [-3, 0, Number.NaN]) {
      const { x, y } = pasteOffset(n);
      expect(x).toBeGreaterThan(0);
      expect(y).toBeGreaterThan(0);
    }
  });
});

describe("createPasteCounter", () => {
  it("counts 1, 2, 3 for pastes of the same copy", () => {
    const counter = createPasteCounter();
    expect([counter.next("a"), counter.next("a"), counter.next("a")]).toEqual([1, 2, 3]);
  });

  it("starts again at 1 when a different copy is pasted", () => {
    const counter = createPasteCounter();
    counter.next("a");
    counter.next("a");
    expect(counter.next("b")).toBe(1);
    expect(counter.next("a")).toBe(1);
  });
});
