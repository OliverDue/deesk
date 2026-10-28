import { describe, it, expect } from "vitest";
import { toRichText } from "tldraw";
import { isBlankRichText } from "./blankRichText";

const doc = (...content: unknown[]) => ({ type: "doc", content });
const text = (t: string) => ({ type: "text", text: t });
const paragraph = (...content: unknown[]) => ({ type: "paragraph", content });

describe("isBlankRichText", () => {
  it("is blank for a fresh paper", () => {
    expect(isBlankRichText(toRichText(""))).toBe(true);
  });

  it("is blank for empty paragraphs", () => {
    expect(isBlankRichText(doc({ type: "paragraph" }, paragraph()))).toBe(true);
  });

  it("is blank when the only text is whitespace", () => {
    expect(isBlankRichText(doc(paragraph(text("   ")), paragraph(text("\n"))))).toBe(true);
  });

  it("is not blank when there is any visible text", () => {
    expect(isBlankRichText(toRichText("a"))).toBe(false);
    expect(isBlankRichText(toRichText("first\nsecond"))).toBe(false);
  });

  it("finds text inside headings and lists", () => {
    const heading = { type: "heading", attrs: { level: 1 }, content: [text("Title")] };
    const list = {
      type: "bulletList",
      content: [{ type: "listItem", content: [paragraph(text("item"))] }],
    };
    expect(isBlankRichText(doc(heading))).toBe(false);
    expect(isBlankRichText(doc(list))).toBe(false);
  });

  it("treats unusable input as blank, and never throws", () => {
    for (const value of [null, undefined, 42, "text", {}, { content: "nope" }]) {
      expect(isBlankRichText(value)).toBe(true);
    }
  });
});
