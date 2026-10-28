import { afterEach, describe, expect, it } from "vitest";
import { Box, Editor, createShapeId, createTLStore, toRichText } from "tldraw";
import { bindingUtils, storeShapeUtils } from "../registry";
import { installPinSync, placePin } from "./pinSync";
import { PIN_BINDING, PIN_DIAMETER, PIN_TYPE } from "./pinTypes";

let editors: Editor[] = [];

function makeEditor(): Editor {
  const store = createTLStore({ shapeUtils: storeShapeUtils, bindingUtils });
  const container = document.createElement("div");
  document.body.appendChild(container);
  const editor = new Editor({
    store,
    shapeUtils: storeShapeUtils,
    bindingUtils,
    tools: [],
    getContainer: () => container,
  });
  editor.updateViewportScreenBounds(new Box(0, 0, 1200, 800));
  installPinSync(editor);
  editors.push(editor);
  return editor;
}

afterEach(() => {
  editors.forEach((e) => e.dispose());
  editors = [];
});

const paper = (editor: Editor, name: string, x: number, y: number) => {
  const id = createShapeId(name);
  editor.createShape({ id, type: "paper", x, y });
  return id;
};
const pinnedBy = (editor: Editor, id: any) => editor.getBindingsToShape(id, PIN_BINDING).length;

describe("placing a pin", () => {
  it("pins every paper under it, and none outside", () => {
    const editor = makeEditor();
    const a = paper(editor, "a", 0, 0);
    const b = paper(editor, "b", 100, 100);
    const far = paper(editor, "far", 2000, 0);
    const pin = placePin(editor, { x: 200, y: 200 });
    expect(editor.getShape(pin)!.type).toBe(PIN_TYPE);
    expect(pinnedBy(editor, a)).toBe(1);
    expect(pinnedBy(editor, b)).toBe(1);
    expect(pinnedBy(editor, far)).toBe(0);
  });

  it("is centred on the click and stays a desk shape, not a figure of the paper", () => {
    const editor = makeEditor();
    const a = paper(editor, "a", 0, 0);
    const pin = placePin(editor, { x: 200, y: 200 });
    const b = editor.getShapePageBounds(pin)!;
    expect(b.center.x).toBeCloseTo(200);
    expect(b.center.y).toBeCloseTo(200);
    expect(editor.getShape(pin)!.parentId).toBe(editor.getCurrentPageId());
    expect(editor.getShape(pin)!.parentId).not.toBe(a);
  });

  it("is allowed on bare desk and pins nothing", () => {
    const editor = makeEditor();
    const a = paper(editor, "a", 0, 0);
    placePin(editor, { x: 1500, y: 1500 });
    expect(pinnedBy(editor, a)).toBe(0);
  });

  it("is a red pin of a fixed size", () => {
    const editor = makeEditor();
    const pin = placePin(editor, { x: 0, y: 0 });
    expect(editor.getShapePageBounds(pin)!.w).toBe(PIN_DIAMETER);
    expect(editor.getShapeUtil(PIN_TYPE).canResize(editor.getShape(pin)!)).toBe(false);
  });
});

describe("a pinned paper", () => {
  function pinnedPaper(editor: Editor) {
    const a = paper(editor, "a", 100, 100);
    const pin = placePin(editor, { x: 200, y: 200 });
    return { a, pin };
  }

  it("cannot be moved, rotated or resized by any update or nudge", () => {
    const editor = makeEditor();
    const { a } = pinnedPaper(editor);
    editor.updateShape({ id: a, type: "paper", x: 500, y: 500 });
    editor.updateShape({ id: a, type: "paper", rotation: 1 });
    editor.updateShape({ id: a, type: "paper", props: { w: 600, h: 700 } });
    editor.nudgeShapes([a], { x: 10, y: 0 });
    const p = editor.getShape(a) as any;
    expect([p.x, p.y, p.rotation, p.props.w, p.props.h]).toEqual([100, 100, 0, 300, 380]);
  });

  it("is still selectable and still takes text", () => {
    const editor = makeEditor();
    const { a } = pinnedPaper(editor);
    editor.select(a);
    expect(editor.getOnlySelectedShapeId()).toBe(a);
    editor.updateShape({ id: a, type: "paper", props: { richText: toRichText("hello") } });
    expect(JSON.stringify((editor.getShape(a) as any).props.richText)).toContain("hello");
  });

  it("stays put while other selected papers move", () => {
    const editor = makeEditor();
    const { a } = pinnedPaper(editor);
    const free = paper(editor, "free", 900, 0);
    editor.nudgeShapes([a, free], { x: 20, y: 0 });
    expect(editor.getShape(a)!.x).toBe(100);
    expect(editor.getShape(free)!.x).toBe(920);
  });

  it("is released when the pin is deleted, and pinned again by undo", () => {
    const editor = makeEditor();
    const { a, pin } = pinnedPaper(editor);
    editor.markHistoryStoppingPoint("before delete");
    editor.deleteShapes([pin]);
    expect(pinnedBy(editor, a)).toBe(0);
    editor.updateShape({ id: a, type: "paper", x: 500 });
    expect(editor.getShape(a)!.x).toBe(500);
    editor.undo();
    expect(pinnedBy(editor, a)).toBe(0 + 1);
    expect(editor.getShape(pin)).toBeDefined();
  });

  it("leaves the pin loose, with no stray binding, when the paper is deleted", () => {
    const editor = makeEditor();
    const { a, pin } = pinnedPaper(editor);
    editor.deleteShapes([a]);
    expect(editor.getShape(pin)).toBeDefined();
    expect(editor.getBindingsFromShape(pin, PIN_BINDING)).toHaveLength(0);
  });

  it("stays fixed while pinned even after being unglued", () => {
    const editor = makeEditor();
    const { a } = pinnedPaper(editor);
    editor.updateShape({ id: a, type: "paper", meta: { glued: true } });
    editor.updateShape({ id: a, type: "paper", meta: { glued: false } });
    editor.updateShape({ id: a, type: "paper", x: 400 });
    expect(editor.getShape(a)!.x).toBe(100);
  });
});

describe("moving a pin", () => {
  it("is allowed, and pins the papers it lands on instead of the ones it left", () => {
    const editor = makeEditor();
    const a = paper(editor, "a", 0, 0);
    const b = paper(editor, "b", 1000, 0);
    const pin = placePin(editor, { x: 100, y: 100 });
    expect(pinnedBy(editor, a)).toBe(1);
    editor.updateShape({ id: pin, type: PIN_TYPE, x: 1100, y: 100 });
    expect(editor.getShape(pin)!.x).toBe(1100);
    expect(pinnedBy(editor, a)).toBe(0);
    expect(pinnedBy(editor, b)).toBe(1);
    editor.updateShape({ id: a, type: "paper", x: 50 });
    expect(editor.getShape(a)!.x).toBe(50);
  });

  it("works for arrow-key nudges too", () => {
    const editor = makeEditor();
    const a = paper(editor, "a", 0, 0);
    const pin = placePin(editor, { x: 5, y: 100 });
    expect(pinnedBy(editor, a)).toBe(1);
    editor.nudgeShapes([pin], { x: -50, y: 0 });
    expect(pinnedBy(editor, a)).toBe(0);
  });

  it("releases and pins nothing when dropped on bare desk", () => {
    const editor = makeEditor();
    const a = paper(editor, "a", 0, 0);
    const pin = placePin(editor, { x: 100, y: 100 });
    editor.updateShape({ id: pin, type: PIN_TYPE, x: 3000, y: 3000 });
    expect(pinnedBy(editor, a)).toBe(0);
  });
});

describe("copies", () => {
  it("of a pinned paper alone are not pinned", () => {
    const editor = makeEditor();
    const a = paper(editor, "a", 0, 0);
    placePin(editor, { x: 100, y: 100 });
    const content = editor.getContentFromCurrentPage([a])!;
    editor.putContentOntoCurrentPage(content, { point: { x: 900, y: 900 }, select: true });
    const copy = editor.getCurrentPageShapes().find((s) => s.type === "paper" && s.id !== a)!;
    expect(pinnedBy(editor, copy.id)).toBe(0);
  });

  it("of a pin together with its paper stay paired, and the paper stays fixed", () => {
    const editor = makeEditor();
    const a = paper(editor, "a", 0, 0);
    const pin = placePin(editor, { x: 100, y: 100 });
    const content = editor.getContentFromCurrentPage([a, pin])!;
    editor.putContentOntoCurrentPage(content, { point: { x: 900, y: 900 }, select: true });
    const copy = editor.getCurrentPageShapes().find((s) => s.type === "paper" && s.id !== a)!;
    expect(pinnedBy(editor, copy.id)).toBe(1);
    expect(pinnedBy(editor, a)).toBe(1);
    // The copy landed where it was pasted, not stuck on the original.
    expect(copy.x).not.toBe(0);
  });

  it("of a pin and its paper by duplicate stay paired too", () => {
    const editor = makeEditor();
    const a = paper(editor, "a", 0, 0);
    const pin = placePin(editor, { x: 100, y: 100 });
    editor.duplicateShapes([a, pin], { x: 600, y: 0 });
    const copy = editor.getCurrentPageShapes().find((s) => s.type === "paper" && s.id !== a)!;
    expect(copy.x).toBe(600);
    expect(pinnedBy(editor, copy.id)).toBe(1);
  });
});
