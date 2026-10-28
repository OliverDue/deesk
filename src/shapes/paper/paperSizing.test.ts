import { afterEach, describe, expect, it } from "vitest";
import { Box, Editor, createShapeId, createTLStore } from "tldraw";
import { bindingUtils, storeShapeUtils } from "../registry";

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

// Drags the paper's right edge to `scaleX` of its width, the way the resize handle does.
function shrinkWidth(editor: Editor, id: any, scaleX: number) {
  const shape = editor.getShape(id)!;
  editor.resizeShape(id, { x: scaleX, y: 1 }, {
    initialShape: shape,
    initialBounds: editor.getShapeGeometry(shape).bounds,
    initialPageTransform: editor.getShapePageTransform(shape),
    scaleOrigin: { x: shape.x, y: shape.y },
    scaleAxisRotation: 0,
    mode: "resize_bounds",
  } as any);
}

describe("resizing a paper with a sticker on it", () => {
  it("stops at the sticker's far edge, like it does for a box", () => {
    const editor = makeEditor();
    const paper = createShapeId("paper");
    editor.createShape({ id: paper, type: "paper", x: 0, y: 0 });
    editor.createShape({ id: createShapeId("sticker"), type: "sticker", x: 200, y: 50 });
    shrinkWidth(editor, paper, 0.3);
    expect((editor.getShape(paper) as any).props.w).toBe(228);
  });

  it("is free to shrink down to the minimum without one", () => {
    const editor = makeEditor();
    const paper = createShapeId("paper");
    editor.createShape({ id: paper, type: "paper", x: 0, y: 0 });
    shrinkWidth(editor, paper, 0.3);
    expect((editor.getShape(paper) as any).props.w).toBe(120);
  });

  it("does not jump bigger for a sticker that already overhangs the edge", () => {
    const editor = makeEditor();
    const paper = createShapeId("paper");
    editor.createShape({ id: paper, type: "paper", x: 0, y: 0 });
    editor.createShape({ id: createShapeId("sticker"), type: "sticker", x: 290, y: 50 });
    shrinkWidth(editor, paper, 0.9);
    expect((editor.getShape(paper) as any).props.w).toBe(300);
  });
});
