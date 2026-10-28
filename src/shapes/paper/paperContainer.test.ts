import { describe, it, expect } from "vitest";
import { paperAccepts, paperClipRect, paperClips, paperKeepsInside } from "./paperContainer";

describe("paperAccepts", () => {
  it("accepts the figure types you draw on a paper", () => {
    for (const type of ["geo", "arrow", "draw", "line", "highlight", "text", "note", "image"]) {
      expect(paperAccepts(type, false)).toBe(true);
    }
  });

  it("never accepts another paper, so papers do not nest", () => {
    expect(paperAccepts("paper", false)).toBe(false);
  });

  it("accepts nothing while locked", () => {
    expect(paperAccepts("geo", true)).toBe(false);
    expect(paperAccepts("arrow", true)).toBe(false);
  });
});

describe("paperClips", () => {
  it("clips figures at the paper's edge", () => {
    for (const type of ["geo", "line", "text", "note", "image"]) {
      expect(paperClips(type)).toBe(true);
    }
  });

  it("lets arrows run past the edge, so connectors can reach other papers", () => {
    expect(paperClips("arrow")).toBe(false);
  });

  it("lets stickers overhang the paper's edge, like real ones", () => {
    expect(paperClips("sticker")).toBe(false);
    expect(paperAccepts("sticker", false)).toBe(true);
  });

  it("lets freehand strokes run past the edge too, while staying part of the paper", () => {
    expect(paperClips("draw")).toBe(false);
    expect(paperClips("highlight")).toBe(false);
  });
});

describe("paperClipRect", () => {
  it("is the paper's rectangle, clockwise from the top-left corner", () => {
    expect(paperClipRect(300, 380)).toEqual([
      { x: 0, y: 0 },
      { x: 300, y: 0 },
      { x: 300, y: 380 },
      { x: 0, y: 380 },
    ]);
  });

  it("follows the size, so resizing the paper moves the clip edge", () => {
    expect(paperClipRect(120, 120)[2]).toEqual({ x: 120, y: 120 });
  });
});

describe("paperKeepsInside", () => {
  it("covers the clipped figures, which the paper may not shrink away from", () => {
    for (const type of ["geo", "line", "text", "note", "image"]) {
      expect(paperKeepsInside(type)).toBe(true);
    }
  });

  it("covers stickers, although they may overhang", () => {
    expect(paperKeepsInside("sticker")).toBe(true);
  });

  it("leaves out arrows and strokes, which may run past the edge freely", () => {
    for (const type of ["arrow", "draw", "highlight"]) {
      expect(paperKeepsInside(type)).toBe(false);
    }
  });
});
