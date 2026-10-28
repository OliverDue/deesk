import { afterEach, describe, expect, it } from "vitest";
import { Box, Editor, createShapeId, createTLStore } from "tldraw";
import { bindingUtils, storeShapeUtils } from "../registry";
import { STICKER_DIAMETER, STICKER_TYPE, StickerColorStyle } from "./stickerTypes";

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
  editors.push(editor);
  return editor;
}

afterEach(() => {
  editors.forEach((e) => e.dispose());
  editors = [];
});

describe("sticker shape", () => {
  it("defaults to red and keeps a chosen colour", () => {
    const editor = makeEditor();
    const a = createShapeId("a");
    const b = createShapeId("b");
    editor.createShapes([
      { id: a, type: STICKER_TYPE, x: 0, y: 0 },
      { id: b, type: STICKER_TYPE, x: 50, y: 0, props: { color: "blue" } },
    ]);
    expect((editor.getShape(a) as any).props.color).toBe("red");
    expect((editor.getShape(b) as any).props.color).toBe("blue");
  });

  it("is a circle of the fixed diameter that cannot be resized", () => {
    const editor = makeEditor();
    const id = createShapeId("s");
    editor.createShape({ id, type: STICKER_TYPE, x: 10, y: 20 });
    const bounds = editor.getShapePageBounds(id)!;
    expect(bounds.w).toBe(STICKER_DIAMETER);
    expect(bounds.h).toBe(STICKER_DIAMETER);
    expect(editor.getShapeUtil(STICKER_TYPE).canResize(editor.getShape(id)!)).toBe(false);
  });

  it("is hit at its centre and not at the corner of its bounds", () => {
    const editor = makeEditor();
    const id = createShapeId("s");
    editor.createShape({ id, type: STICKER_TYPE, x: 100, y: 100 });
    const r = STICKER_DIAMETER / 2;
    expect(editor.getShapeAtPoint({ x: 100 + r, y: 100 + r })?.id).toBe(id);
    expect(editor.getShapeAtPoint({ x: 100 + 1, y: 100 + 1 })).toBeUndefined();
  });

  it("recolours the selected stickers through the style, and remembers it for the next one", () => {
    const editor = makeEditor();
    const id = createShapeId("s");
    editor.createShape({ id, type: STICKER_TYPE, x: 0, y: 0 });
    editor.select(id);
    editor.setStyleForSelectedShapes(StickerColorStyle, "green");
    editor.setStyleForNextShapes(StickerColorStyle, "green");
    expect((editor.getShape(id) as any).props.color).toBe("green");
    const next = createShapeId("next");
    editor.createShape({ id: next, type: STICKER_TYPE, x: 40, y: 0 });
    expect((editor.getShape(next) as any).props.color).toBe("green");
  });
});

describe("sticker on a paper", () => {
  function paperWithSticker(editor: Editor) {
    const paper = createShapeId("paper");
    const sticker = createShapeId("sticker");
    editor.createShape({ id: paper, type: "paper", x: 0, y: 0 });
    editor.createShape({ id: sticker, type: STICKER_TYPE, x: 40, y: 40 });
    return { paper, sticker };
  }

  it("placed on a paper becomes its figure and moves with it", () => {
    const editor = makeEditor();
    const { paper, sticker } = paperWithSticker(editor);
    expect(editor.getShape(sticker)!.parentId).toBe(paper);
    editor.updateShape({ id: paper, type: "paper", x: 500, y: 300 });
    const b = editor.getShapePageBounds(sticker)!;
    expect(b.x).toBe(540);
    expect(b.y).toBe(340);
  });

  it("overhangs the paper's edge instead of being clipped", () => {
    const editor = makeEditor();
    const { paper } = paperWithSticker(editor);
    const edge = createShapeId("edge");
    editor.createShape({ id: edge, type: STICKER_TYPE, x: 295, y: 10 });
    expect(editor.getShape(edge)!.parentId).toBe(paper);
    expect(editor.getShapeUtil("paper").shouldClipChild!(editor.getShape(edge)!)).toBe(false);
  });

  it("is copied together with its paper", () => {
    const editor = makeEditor();
    const { paper } = paperWithSticker(editor);
    const content = editor.getContentFromCurrentPage([paper])!;
    expect(content.shapes.map((s) => s.type).sort()).toEqual(["paper", STICKER_TYPE]);
  });

  it("is released when moved off the paper and taken in when moved on", () => {
    const editor = makeEditor();
    const { paper, sticker } = paperWithSticker(editor);
    editor.reparentShapes([sticker], editor.getCurrentPageId());
    expect(editor.getShape(sticker)!.parentId).not.toBe(paper);
    editor.getShapeUtil("paper").onDragShapesIn!(editor.getShape(paper) as any, [editor.getShape(sticker)!], {} as any);
    expect(editor.getShape(sticker)!.parentId).toBe(paper);
  });
});
