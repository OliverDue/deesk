import { describe, it, expect } from "vitest";
import { TABLE_COLOR, applyTheme } from "./theme";

describe("theme", () => {
  it("uses the table colour from the spec", () => {
    expect(TABLE_COLOR).toBe("#FFF6D8");
  });

  it("applies the table colour as a CSS variable", () => {
    const el = document.createElement("div");
    applyTheme(el);
    expect(el.style.getPropertyValue("--deesk-table")).toBe("#FFF6D8");
  });

  it("is idempotent when applied twice", () => {
    const el = document.createElement("div");
    applyTheme(el);
    applyTheme(el);
    expect(el.style.getPropertyValue("--deesk-table")).toBe("#FFF6D8");
  });
});
