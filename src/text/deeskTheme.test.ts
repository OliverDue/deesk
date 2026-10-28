import { describe, it, expect } from "vitest";
import { DEFAULT_THEME } from "tldraw";
import { PAPER_FONT_FAMILY } from "../shapes/paper/paperTypes";
import { deeskTheme } from "./deeskTheme";

describe("deeskTheme", () => {
  it("gives text in boxes the same font as the text on papers", () => {
    expect(deeskTheme.fonts.draw.fontFamily).toBe(PAPER_FONT_FAMILY);
    expect(deeskTheme.fonts.sans.fontFamily).toBe(PAPER_FONT_FAMILY);
  });

  it("still defines every font style tldraw offers", () => {
    for (const style of ["draw", "sans", "serif", "mono"] as const) {
      expect(deeskTheme.fonts[style].fontFamily.length).toBeGreaterThan(0);
    }
  });

  it("uses only fonts already on the computer, so nothing is downloaded", () => {
    for (const style of ["draw", "sans", "serif", "mono"] as const) {
      expect(deeskTheme.fonts[style].faces ?? []).toEqual([]);
    }
  });

  it("changes nothing but the fonts", () => {
    expect(deeskTheme.colors).toBe(DEFAULT_THEME.colors);
    expect(deeskTheme.fontSize).toBe(DEFAULT_THEME.fontSize);
    expect(deeskTheme.id).toBe(DEFAULT_THEME.id);
  });
});
