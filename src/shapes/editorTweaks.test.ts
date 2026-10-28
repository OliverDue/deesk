import { afterEach, describe, expect, it } from "vitest";
import { Box, Editor, createShapeId, createTLStore } from "tldraw";
import { installEditorTweaks } from "./editorTweaks";
import { bindingUtils, storeShapeUtils } from "./registry";

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
  editors.push(editor);
  return editor;
}

afterEach(() => {
  editors.forEach((e) => e.dispose());
  editors = [];
});

// Two boxes with an arrow anchored to both, and one arrow anchored to only the first.
function drawScene(editor: Editor) {
  const a = createShapeId("a");
  const b = createShapeId("b");
  const between = createShapeId("between");
  const loose = createShapeId("loose");
  editor.createShapes([
    { id: a, type: "geo", x: 0, y: 0, props: { w: 100, h: 100 } },
    { id: b, type: "geo", x: 300, y: 0, props: { w: 100, h: 100 } },
    { id: between, type: "arrow", x: 50, y: 50 },
    { id: loose, type: "arrow", x: 50, y: 200 },
  ]);
  const bind = (arrow: typeof a, to: typeof a, terminal: "start" | "end") => ({
    type: "arrow" as const,
    fromId: arrow,
    toId: to,
    props: {
      terminal,
      normalizedAnchor: { x: 0.5, y: 0.5 },
      isExact: false,
      isPrecise: false,
      snap: "none" as const,
    },
  });
  editor.createBindings([
    bind(between, a, "start"),
    bind(between, b, "end"),
    bind(loose, a, "start"),
  ]);
  return { a, b, between, loose };
}

describe("orphaned arrow cleanup", () => {
  it("deletes an arrow when both the shapes it connects are deleted together", () => {
    const editor = makeEditor();
    installEditorTweaks(editor);
    const { a, b, between } = drawScene(editor);
    editor.deleteShapes([a, b]);
    expect(editor.getShape(between)).toBeUndefined();
  });

  it("keeps an arrow while one of its anchors is left, and deletes it with the last one", () => {
    const editor = makeEditor();
    installEditorTweaks(editor);
    const { a, b, between } = drawScene(editor);
    editor.deleteShapes([a]);
    expect(editor.getShape(between)).toBeDefined();
    editor.deleteShapes([b]);
    expect(editor.getShape(between)).toBeUndefined();
  });

  it("deletes an arrow that was anchored at only one end when that anchor goes", () => {
    const editor = makeEditor();
    installEditorTweaks(editor);
    const { a, loose } = drawScene(editor);
    editor.deleteShapes([a]);
    expect(editor.getShape(loose)).toBeUndefined();
  });

  it("leaves arrows that were never anchored to anything", () => {
    const editor = makeEditor();
    installEditorTweaks(editor);
    const { a } = drawScene(editor);
    const free = createShapeId("free");
    editor.createShapes([{ id: free, type: "arrow", x: 500, y: 500 }]);
    editor.deleteShapes([a]);
    expect(editor.getShape(free)).toBeDefined();
  });

  it("deletes the arrow between figures when both papers are deleted", () => {
    const editor = makeEditor();
    installEditorTweaks(editor);
    const paperA = createShapeId("paperA");
    const paperB = createShapeId("paperB");
    const boxA = createShapeId("boxA");
    const boxB = createShapeId("boxB");
    const connector = createShapeId("connector");
    editor.createShapes([
      { id: paperA, type: "paper", x: 0, y: 0 },
      { id: paperB, type: "paper", x: 600, y: 0 },
      { id: boxA, type: "geo", parentId: paperA, x: 50, y: 50, props: { w: 80, h: 80 } },
      { id: boxB, type: "geo", parentId: paperB, x: 50, y: 50, props: { w: 80, h: 80 } },
      { id: connector, type: "arrow", x: 90, y: 90 },
    ]);
    const anchor = (to: typeof boxA, terminal: "start" | "end") => ({
      type: "arrow" as const,
      fromId: connector,
      toId: to,
      props: {
        terminal,
        normalizedAnchor: { x: 0.5, y: 0.5 },
        isExact: false,
        isPrecise: false,
        snap: "none" as const,
      },
    });
    editor.createBindings([anchor(boxA, "start"), anchor(boxB, "end")]);

    editor.deleteShapes([paperA, paperB]);

    expect(editor.getShape(boxA)).toBeUndefined();
    expect(editor.getShape(connector)).toBeUndefined();
  });

  it("is undone together with the deletion", () => {
    const editor = makeEditor();
    installEditorTweaks(editor);
    const { a, b, between } = drawScene(editor);
    editor.markHistoryStoppingPoint("delete");
    editor.deleteShapes([a, b]);
    expect(editor.getShape(between)).toBeUndefined();
    editor.undo();
    expect(editor.getShape(a)).toBeDefined();
    expect(editor.getShape(between)).toBeDefined();
  });
});

// Two papers, a box on each, and an arrow anchored to both boxes.
function drawTwoPapers(editor: Editor) {
  const paperA = createShapeId("paperA");
  const paperB = createShapeId("paperB");
  const boxA = createShapeId("boxA");
  const boxB = createShapeId("boxB");
  const connector = createShapeId("connector");
  editor.createShapes([
    { id: paperA, type: "paper", x: 0, y: 0 },
    { id: paperB, type: "paper", x: 600, y: 0 },
    { id: boxA, type: "geo", parentId: paperA, x: 50, y: 50, props: { w: 100, h: 100, fill: "none" } },
    { id: boxB, type: "geo", parentId: paperB, x: 50, y: 50, props: { w: 100, h: 100, fill: "none" } },
    { id: connector, type: "arrow", x: 100, y: 100 },
  ]);
  const anchor = (to: typeof boxA, terminal: "start" | "end") => ({
    type: "arrow" as const,
    fromId: connector,
    toId: to,
    props: {
      terminal,
      normalizedAnchor: { x: 0.5, y: 0.5 },
      isExact: false,
      isPrecise: false,
      snap: "none" as const,
    },
  });
  editor.createBindings([anchor(boxA, "start"), anchor(boxB, "end")]);
  return { paperA, paperB, boxA, boxB, connector };
}

describe("aiming at a figure on a paper", () => {
  // The arrow tool asks for the shape under the pointer like this.
  const aim = (editor: Editor, point: { x: number; y: number }) =>
    editor.getShapeAtPoint(point, { hitInside: true, margin: [8, 0] });

  it("finds a hollow box on a paper anywhere inside it, not only at its outline", () => {
    const editor = makeEditor();
    editor.updateViewportScreenBounds(new Box(0, 0, 1200, 800));
    installEditorTweaks(editor);
    const { boxA } = drawTwoPapers(editor);
    expect(aim(editor, { x: 100, y: 100 })?.id).toBe(boxA);
  });

  it("(without the tweak, tldraw returns the paper: this is the bug it fixes)", () => {
    const editor = makeEditor();
    editor.updateViewportScreenBounds(new Box(0, 0, 1200, 800));
    const { paperA } = drawTwoPapers(editor);
    expect(aim(editor, { x: 100, y: 100 })?.id).toBe(paperA);
  });

  it("still finds the paper itself when the pointer is on the bare sheet", () => {
    const editor = makeEditor();
    editor.updateViewportScreenBounds(new Box(0, 0, 1200, 800));
    installEditorTweaks(editor);
    const { paperA } = drawTwoPapers(editor);
    expect(aim(editor, { x: 250, y: 300 })?.id).toBe(paperA);
  });
});

describe("copying papers", () => {
  it("also copies the arrow connecting figures on the copied papers", () => {
    const editor = makeEditor();
    installEditorTweaks(editor);
    const { paperA, paperB, connector } = drawTwoPapers(editor);
    const content = editor.getContentFromCurrentPage([paperA, paperB]);
    expect(content?.shapes.map((s) => s.id)).toContain(connector);
    expect(content?.bindings).toHaveLength(2);
  });

  it("(without the tweak, tldraw leaves the arrow behind: this is the bug it fixes)", () => {
    const editor = makeEditor();
    const { paperA, paperB, connector } = drawTwoPapers(editor);
    const content = editor.getContentFromCurrentPage([paperA, paperB]);
    expect(content?.shapes.map((s) => s.id)).not.toContain(connector);
  });

  it("does not copy an arrow that also connects to something not being copied", () => {
    const editor = makeEditor();
    installEditorTweaks(editor);
    const { paperA, connector } = drawTwoPapers(editor);
    const content = editor.getContentFromCurrentPage([paperA]);
    expect(content?.shapes.map((s) => s.id)).not.toContain(connector);
  });
});

describe("removing the tweaks", () => {
  it("puts tldraw's own behaviour back", () => {
    const editor = makeEditor();
    const off = installEditorTweaks(editor);
    off();
    const { a, b, between } = drawScene(editor);
    editor.deleteShapes([a, b]);
    expect(editor.getShape(between)).toBeDefined();
  });
});

describe("the stacking order of an arrow when its anchors come and go", () => {
  // A lower paper and a higher paper, a box on each, and an arrow above both papers anchored
  // to the two boxes. tldraw stacks an arrow directly above the highest shape it is anchored
  // to, so when only the box on the lower paper is left as an anchor, tldraw drops the arrow
  // to just above the lower paper: behind the higher one.
  function drawStack(editor: Editor) {
    const lowerPaper = createShapeId("lowerPaper");
    const higherPaper = createShapeId("higherPaper");
    const lowerBox = createShapeId("lowerBox");
    const higherBox = createShapeId("higherBox");
    const arrow = createShapeId("arrow");
    editor.createShapes([
      { id: lowerPaper, type: "paper", x: 0, y: 0 },
      { id: higherPaper, type: "paper", x: 600, y: 0 },
    ]);
    editor.createShapes([
      { id: lowerBox, type: "geo", parentId: lowerPaper, x: 50, y: 50, props: { w: 100, h: 100 } },
      { id: higherBox, type: "geo", parentId: higherPaper, x: 50, y: 50, props: { w: 100, h: 100 } },
      { id: arrow, type: "arrow", x: 100, y: 100 },
    ]);
    const anchor = (to: typeof lowerBox, terminal: "start" | "end") => ({
      type: "arrow" as const,
      fromId: arrow,
      toId: to,
      props: {
        terminal,
        normalizedAnchor: { x: 0.5, y: 0.5 },
        isExact: false,
        isPrecise: false,
        snap: "none" as const,
      },
    });
    editor.createBindings([anchor(lowerBox, "start"), anchor(higherBox, "end")]);
    return { lowerPaper, higherPaper, lowerBox, higherBox, arrow };
  }

  const position = (editor: Editor, id: ReturnType<typeof createShapeId>) =>
    editor.getCurrentPageShapesSorted().findIndex((s) => s.id === id);

  it("brings a deleted box and arrow back in front of the paper with a single undo", () => {
    const editor = makeEditor();
    installEditorTweaks(editor);
    const { higherPaper, lowerBox, higherBox, arrow } = drawStack(editor);
    expect(position(editor, arrow)).toBeGreaterThan(position(editor, higherPaper));

    editor.markHistoryStoppingPoint("delete the box on the higher paper");
    editor.deleteShapes([higherBox]);
    editor.markHistoryStoppingPoint("delete the box on the lower paper");
    editor.deleteShapes([lowerBox]);
    expect(editor.getShape(arrow)).toBeUndefined();

    editor.undo();

    expect(editor.getShape(lowerBox)).toBeDefined();
    expect(editor.getShape(arrow)).toBeDefined();
    expect(position(editor, arrow)).toBeGreaterThan(position(editor, higherPaper));
  });

  it("does not let an arrow sink behind a paper when it is anchored to a box again", () => {
    const editor = makeEditor();
    installEditorTweaks(editor);
    const { higherPaper, higherBox, arrow } = drawStack(editor);

    editor.markHistoryStoppingPoint("delete");
    editor.deleteShapes([higherBox]);
    editor.undo();

    expect(editor.getShape(arrow)).toBeDefined();
    expect(position(editor, arrow)).toBeGreaterThan(position(editor, higherPaper));
  });
});
