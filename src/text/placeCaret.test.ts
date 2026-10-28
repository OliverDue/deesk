import { describe, it, expect } from "vitest";
import { coversWholeDocument } from "./placeCaret";

// In a one-paragraph document with 3 characters the content size is 5, and text
// positions run from 1 to 4.
describe("coversWholeDocument", () => {
  it("is true for a select-all", () => {
    expect(coversWholeDocument(0, 5, 5)).toBe(true);
    expect(coversWholeDocument(1, 4, 5)).toBe(true);
  });

  it("is false for a cursor", () => {
    expect(coversWholeDocument(3, 3, 5)).toBe(false);
    expect(coversWholeDocument(1, 1, 5)).toBe(false);
  });

  it("is false for a selection of only part of the text", () => {
    expect(coversWholeDocument(2, 4, 5)).toBe(false);
    expect(coversWholeDocument(1, 3, 5)).toBe(false);
  });

  it("is false for an empty document", () => {
    expect(coversWholeDocument(0, 0, 2)).toBe(false);
  });
});
