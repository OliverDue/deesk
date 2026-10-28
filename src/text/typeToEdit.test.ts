import { describe, it, expect } from "vitest";
import { isTypeToEditKey, type KeyInfo } from "./typeToEdit";

const key = (k: string, extra: Partial<KeyInfo> = {}): KeyInfo => ({
  key: k,
  metaKey: false,
  ctrlKey: false,
  altKey: false,
  isComposing: false,
  ...extra,
});

describe("isTypeToEditKey", () => {
  it("starts writing on letters, digits and punctuation", () => {
    for (const k of ["a", "Z", "7", "#", "-", "?", "æ", "Ø", "å", "€"]) {
      expect(isTypeToEditKey(key(k))).toBe(true);
    }
  });

  it("starts writing on a character made with Option/Alt, such as @ on some keyboards", () => {
    expect(isTypeToEditKey(key("@", { altKey: true }))).toBe(true);
  });

  it("does not start writing for shortcuts with Cmd or Ctrl", () => {
    expect(isTypeToEditKey(key("c", { metaKey: true }))).toBe(false);
    expect(isTypeToEditKey(key("z", { ctrlKey: true }))).toBe(false);
  });

  it("does not start writing for keys that are not characters", () => {
    for (const k of ["Enter", "Escape", "Backspace", "Delete", "Tab", "ArrowUp", "Shift", "Dead"]) {
      expect(isTypeToEditKey(key(k))).toBe(false);
    }
  });

  it("leaves Space alone, because it pans the canvas", () => {
    expect(isTypeToEditKey(key(" "))).toBe(false);
  });

  it("does not interfere with text composition", () => {
    expect(isTypeToEditKey(key("a", { isComposing: true }))).toBe(false);
  });
});
