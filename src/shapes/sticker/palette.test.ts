import { describe, it, expect } from "vitest";
import { STICKER_COLORS, STICKER_COLOR_KEYS, STICKER_DEFAULT_COLOR, stickerColor } from "./palette";

describe("sticker palette", () => {
  it("has the six colours, green, yellow and red first", () => {
    expect(STICKER_COLOR_KEYS).toEqual(["green", "yellow", "red", "orange", "blue", "purple"]);
  });

  it("gives every colour a fill and a darker-looking rim as hex values", () => {
    for (const c of STICKER_COLORS) {
      expect(c.fill).toMatch(/^#[0-9a-f]{6}$/i);
      expect(c.rim).toMatch(/^#[0-9a-f]{6}$/i);
      expect(c.rim).not.toBe(c.fill);
    }
  });

  it("looks a colour up by key and falls back to the default for an unknown one", () => {
    expect(stickerColor("blue").key).toBe("blue");
    expect(stickerColor("nope").key).toBe(STICKER_DEFAULT_COLOR);
  });
});
