import { describe, it, expect } from "vitest";
import { checkboxIndexAt, toggleTaskItem, type Box } from "./taskItems";

const text = (t: string) => ({ type: "text", text: t });
const paragraph = (t: string) => ({ type: "paragraph", content: [text(t)] });
const item = (t: string, checked?: boolean, ...nested: unknown[]) => ({
  type: "taskItem",
  attrs: checked === undefined ? {} : { checked },
  content: [paragraph(t), ...nested],
});
const list = (...items: unknown[]) => ({ type: "taskList", content: items });
const doc = (...content: unknown[]) => ({ type: "doc", content });

const checkedFlags = (richText: unknown): boolean[] => {
  const flags: boolean[] = [];
  const walk = (node: any) => {
    if (node?.type === "taskItem") flags.push(!!node.attrs?.checked);
    (node?.content ?? []).forEach(walk);
  };
  walk(richText);
  return flags;
};

describe("toggleTaskItem", () => {
  it("ticks the chosen item and leaves the others", () => {
    const rt = doc(list(item("a", false), item("b", false), item("c", false)));
    expect(checkedFlags(toggleTaskItem(rt, 1))).toEqual([false, true, false]);
  });

  it("unticks a ticked item", () => {
    const rt = doc(list(item("a", true), item("b", true)));
    expect(checkedFlags(toggleTaskItem(rt, 0))).toEqual([false, true]);
  });

  it("treats an item with no checked value as unticked", () => {
    const rt = doc(list(item("a")));
    expect(checkedFlags(toggleTaskItem(rt, 0))).toEqual([true]);
  });

  it("counts nested items depth-first, top to bottom", () => {
    // a, b, b1, b2, c  -> indexes 0, 1, 2, 3, 4
    const rt = doc(
      list(item("a", false), item("b", false, list(item("b1", false), item("b2", false))), item("c", false)),
    );
    expect(checkedFlags(toggleTaskItem(rt, 2))).toEqual([false, false, true, false, false]);
    expect(checkedFlags(toggleTaskItem(rt, 3))).toEqual([false, false, false, true, false]);
    expect(checkedFlags(toggleTaskItem(rt, 4))).toEqual([false, false, false, false, true]);
  });

  it("counts only task items, not other content before them", () => {
    const rt = doc(
      { type: "heading", attrs: { level: 1 }, content: [text("Title")] },
      paragraph("intro"),
      { type: "bulletList", content: [{ type: "listItem", content: [paragraph("x")] }] },
      list(item("a", false), item("b", false)),
    );
    expect(checkedFlags(toggleTaskItem(rt, 1))).toEqual([false, true]);
  });

  it("keeps the text of the toggled item", () => {
    const rt = doc(list(item("keep me", false)));
    const toggled = toggleTaskItem(rt, 0) as any;
    expect(toggled.content[0].content[0].content[0].content[0].text).toBe("keep me");
  });

  it("returns the same document when there is no such item", () => {
    const rt = doc(list(item("a", false)));
    expect(toggleTaskItem(rt, 5)).toBe(rt);
    expect(toggleTaskItem(rt, -1)).toBe(rt);
    expect(toggleTaskItem(doc(paragraph("no boxes")), 0)).toEqual(doc(paragraph("no boxes")));
  });

  it("never changes the document it was given", () => {
    const rt = doc(list(item("a", false)));
    const before = JSON.stringify(rt);
    toggleTaskItem(rt, 0);
    expect(JSON.stringify(rt)).toBe(before);
  });
});

describe("checkboxIndexAt", () => {
  const boxes: Box[] = [
    { left: 10, top: 10, right: 30, bottom: 30 },
    { left: 10, top: 50, right: 30, bottom: 70 },
  ];

  it("finds the box under the pointer", () => {
    expect(checkboxIndexAt({ x: 20, y: 20 }, boxes)).toBe(0);
    expect(checkboxIndexAt({ x: 20, y: 60 }, boxes)).toBe(1);
  });

  it("returns -1 when the pointer is not over a box", () => {
    expect(checkboxIndexAt({ x: 100, y: 20 }, boxes)).toBe(-1);
    expect(checkboxIndexAt({ x: 20, y: 40 }, boxes)).toBe(-1);
    expect(checkboxIndexAt({ x: 20, y: 20 }, [])).toBe(-1);
  });

  it("includes the edges, and allows a little slop around the box", () => {
    expect(checkboxIndexAt({ x: 30, y: 30 }, boxes)).toBe(0);
    expect(checkboxIndexAt({ x: 33, y: 20 }, boxes, 4)).toBe(0);
    expect(checkboxIndexAt({ x: 36, y: 20 }, boxes, 4)).toBe(-1);
  });
});
