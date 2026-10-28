import { afterEach, describe, expect, it } from "vitest";
import { Box, Editor, createShapeId, createTLStore, toRichText } from "tldraw";
import { bindingUtils, storeShapeUtils } from "../registry";
import { toggleGlue } from "./glueAction";

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

const glue = (editor: Editor, id: any, glued: boolean) =>
  editor.updateShape({ id, type: "paper", meta: { glued } });

function gluedPaper(editor: Editor, name = "p", x = 100, y = 100) {
  const id = createShapeId(name);
  editor.createShape({ id, type: "paper", x, y });
  glue(editor, id, true);
  return id;
}

describe("a glued paper", () => {
  it("cannot be moved, rotated or resized by any update", () => {
    const editor = makeEditor();
    const id = gluedPaper(editor);
    editor.updateShape({ id, type: "paper", x: 500, y: 500 });
    editor.updateShape({ id, type: "paper", rotation: 1 });
    editor.updateShape({ id, type: "paper", props: { w: 600, h: 700 } });
    const p = editor.getShape(id) as any;
    expect([p.x, p.y, p.rotation, p.props.w, p.props.h]).toEqual([100, 100, 0, 300, 380]);
  });

  it("does not move when nudged with the arrow keys", () => {
    const editor = makeEditor();
    const id = gluedPaper(editor);
    editor.nudgeShapes([id], { x: 10, y: 0 });
    expect(editor.getShape(id)!.x).toBe(100);
  });

  it("is still selectable and still takes text", () => {
    const editor = makeEditor();
    const id = gluedPaper(editor);
    editor.select(id);
    expect(editor.getOnlySelectedShapeId()).toBe(id);
    editor.updateShape({ id, type: "paper", props: { richText: toRichText("hello") } });
    expect(JSON.stringify((editor.getShape(id) as any).props.richText)).toContain("hello");
  });

  it("can be moved again once unglued", () => {
    const editor = makeEditor();
    const id = gluedPaper(editor);
    glue(editor, id, false);
    editor.updateShape({ id, type: "paper", x: 500 });
    expect(editor.getShape(id)!.x).toBe(500);
  });

  it("keeps its figures movable, and takes new ones", () => {
    const editor = makeEditor();
    const paper = gluedPaper(editor);
    const box = createShapeId("box");
    editor.createShape({ id: box, type: "geo", x: 120, y: 120, props: { w: 40, h: 40 } });
    expect(editor.getShape(box)!.parentId).toBe(paper);
    editor.updateShape({ id: box, type: "geo", x: 30, y: 30 });
    expect(editor.getShape(box)!.x).toBe(30);
    expect(editor.getShape(paper)!.x).toBe(100);
  });

  it("stays put while the other selected papers move", () => {
    const editor = makeEditor();
    const fixed = gluedPaper(editor, "fixed", 0, 0);
    const free = createShapeId("free");
    editor.createShape({ id: free, type: "paper", x: 500, y: 0 });
    editor.nudgeShapes([fixed, free], { x: 20, y: 0 });
    expect(editor.getShape(fixed)!.x).toBe(0);
    expect(editor.getShape(free)!.x).toBe(520);
  });

  it("can still be undone out of the glue, and a move made before gluing is undoable", () => {
    const editor = makeEditor();
    const id = createShapeId("p");
    editor.createShape({ id, type: "paper", x: 0, y: 0 });
    editor.markHistoryStoppingPoint("before move");
    editor.updateShape({ id, type: "paper", x: 200 });
    editor.markHistoryStoppingPoint("before glue");
    glue(editor, id, true);
    editor.undo();
    expect((editor.getShape(id) as any).meta.glued).toBeFalsy();
    editor.undo();
    expect(editor.getShape(id)!.x).toBe(0);
  });
});

describe("copies of a glued paper", () => {
  it("start unglued when duplicated", () => {
    const editor = makeEditor();
    const id = gluedPaper(editor);
    editor.duplicateShapes([id], { x: 50, y: 50 });
    const papers = editor.getCurrentPageShapes().filter((s) => s.type === "paper");
    expect(papers).toHaveLength(2);
    const copy = papers.find((s) => s.id !== id)! as any;
    expect(copy.meta.glued).toBeFalsy();
    expect((editor.getShape(id) as any).meta.glued).toBe(true);
  });

  it("start unglued when pasted from copied content", () => {
    const editor = makeEditor();
    const id = gluedPaper(editor);
    const content = editor.getContentFromCurrentPage([id])!;
    editor.putContentOntoCurrentPage(content, { point: { x: 600, y: 600 }, select: true });
    const copy = editor.getCurrentPageShapes().find((s) => s.type === "paper" && s.id !== id)! as any;
    expect(copy.meta.glued).toBeFalsy();
  });

  it("keep their glue when a deleted glued paper is brought back by undo", () => {
    const editor = makeEditor();
    const id = gluedPaper(editor);
    editor.markHistoryStoppingPoint("before delete");
    editor.deleteShapes([id]);
    editor.undo();
    expect((editor.getShape(id) as any).meta.glued).toBe(true);
  });
});

describe("toggleGlue", () => {
  const order = (editor: Editor) =>
    editor.getSortedChildIdsForParent(editor.getCurrentPageId());

  it("glues the papers and sends them to the back", () => {
    const editor = makeEditor();
    const a = createShapeId("a");
    const b = createShapeId("b");
    const box = createShapeId("box");
    editor.createShapes([
      { id: a, type: "paper", x: 0, y: 0 },
      { id: box, type: "geo", x: 900, y: 0 },
      { id: b, type: "paper", x: 400, y: 0 },
    ]);
    toggleGlue(editor, [editor.getShape(b)!]);
    expect((editor.getShape(b) as any).meta.glued).toBe(true);
    expect(order(editor)[0]).toBe(b);
  });

  it("does not reorder when it unglues", () => {
    const editor = makeEditor();
    const a = createShapeId("a");
    const b = createShapeId("b");
    editor.createShapes([
      { id: a, type: "paper", x: 0, y: 0 },
      { id: b, type: "paper", x: 400, y: 0 },
    ]);
    toggleGlue(editor, [editor.getShape(b)!]);
    const before = order(editor);
    toggleGlue(editor, [editor.getShape(b)!]);
    expect((editor.getShape(b) as any).meta.glued).toBeFalsy();
    expect(order(editor)).toEqual(before);
  });

  it("keeps a connecting arrow above the paper that was sent back", () => {
    const editor = makeEditor();
    const a = createShapeId("a");
    const b = createShapeId("b");
    const arrow = createShapeId("arrow");
    editor.createShapes([
      { id: a, type: "paper", x: 0, y: 0 },
      { id: b, type: "paper", x: 500, y: 0 },
      { id: arrow, type: "arrow", x: 150, y: 190 },
    ]);
    const bind = (to: typeof a, terminal: "start" | "end") => ({
      type: "arrow" as const,
      fromId: arrow,
      toId: to,
      props: { terminal, normalizedAnchor: { x: 0.5, y: 0.5 }, isExact: false, isPrecise: false, snap: "none" as const },
    });
    editor.createBindings([bind(a, "start"), bind(b, "end")]);
    toggleGlue(editor, [editor.getShape(b)!]);
    const o = order(editor);
    expect(o.indexOf(arrow)).toBeGreaterThan(o.indexOf(a));
    expect(o.indexOf(arrow)).toBeGreaterThan(o.indexOf(b));
  });

  it("undoes the glue and the new order together", () => {
    const editor = makeEditor();
    const a = createShapeId("a");
    const b = createShapeId("b");
    editor.createShapes([
      { id: a, type: "paper", x: 0, y: 0 },
      { id: b, type: "paper", x: 400, y: 0 },
    ]);
    const before = order(editor);
    toggleGlue(editor, [editor.getShape(b)!]);
    editor.undo();
    expect(order(editor)).toEqual(before);
    expect((editor.getShape(b) as any).meta.glued).toBeFalsy();
  });
});
