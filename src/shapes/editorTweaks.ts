import type { Editor, TLShape, TLShapeId } from "tldraw";
import { PAPER_TYPE } from "./paper/paperTypes";
import { arrowsToDelete, connectingArrowIds } from "./arrowRules";

// Small changes to how tldraw's editor behaves, each in its own function, each undone by the
// function it returns. They exist because papers are containers, and tldraw's defaults were
// made for plain shapes and frames. If tldraw changes the behaviour they work around,
// remove the matching one.

// 1. Aiming an arrow at a box that sits on a paper.
//
// tldraw finds "the shape under the pointer" from the top down. A hollow box is only a
// fallback candidate, and the moment the search reaches a filled shape below it (the paper's
// sheet) it returns that and never goes back to the fallback. So on a paper you had to aim at
// the box's outline, while on the bare desk anywhere over the box works. When the search ends on
// a paper, look again without it, and prefer a figure of that paper if one is under the pointer.
function installFigureHitTest(editor: Editor): () => void {
  const original = editor.getShapeAtPoint;
  editor.getShapeAtPoint = function (point, opts = {}) {
    const hit = original.call(editor, point, opts);
    if (!opts.hitInside || !hit || hit.type !== PAPER_TYPE) return hit;

    const figure = original.call(editor, point, {
      ...opts,
      filter: (shape: TLShape) => shape.id !== hit.id && (opts.filter ? opts.filter(shape) : true),
    });
    return figure && editor.hasAncestor(figure, hit.id) ? figure : hit;
  };
  return () => {
    editor.getShapeAtPoint = original;
  };
}

// 2. Copying papers copies the arrows between their figures.
//
// tldraw copies exactly the selected shapes and their children, so an arrow connecting a
// figure on one copied paper to a figure on another was left behind. Add the arrows whose
// two ends are both anchored inside what is being copied.
function installCopyWithConnectors(editor: Editor): () => void {
  const original = editor.getContentFromCurrentPage;
  editor.getContentFromCurrentPage = function (shapes) {
    const ids = shapes.map((s: TLShape | TLShapeId) => (typeof s === "string" ? s : s.id));
    if (ids.length === 0) return original.call(editor, shapes);

    const content = editor.getShapeAndDescendantIds(ids);
    const arrows = editor
      .getCurrentPageShapes()
      .filter((s) => s.type === "arrow" && !content.has(s.id))
      .map((arrow) => ({
        id: arrow.id,
        targetIds: editor.getBindingsFromShape(arrow, "arrow").map((b) => b.toId),
      }));
    const extra = connectingArrowIds(arrows, content) as TLShapeId[];
    return original.call(editor, extra.length > 0 ? [...ids, ...extra] : ids);
  };
  return () => {
    editor.getContentFromCurrentPage = original;
  };
}

// 3. An arrow whose last anchor is deleted is deleted too.
//
// tldraw runs every "before delete" callback first, then removes everything at once, so
// "was this the last anchor?" cannot be answered inside a delete callback. Two phases instead:
// note which arrows were anchored to what is being deleted, and once the whole operation has
// finished, delete those that have no anchor left. Arrows that were never anchored, and arrows
// whose end the user drags off a shape (no shape is deleted), are not touched.
function installOrphanedArrowCleanup(editor: Editor): () => void {
  const pending = new Set<TLShapeId>();

  const stopBefore = editor.sideEffects.registerBeforeDeleteHandler("shape", (shape, source) => {
    if (source !== "user") return;
    for (const binding of editor.getBindingsToShape(shape, "arrow")) {
      pending.add(binding.fromId as TLShapeId);
    }
  });

  const stopAfter = editor.sideEffects.registerOperationCompleteHandler(() => {
    if (pending.size === 0) return;
    const arrowIds = [...pending];
    pending.clear();

    const checks = arrowIds
      .filter((id) => editor.getShape(id))
      .map((id) => ({ arrowId: id, bindingsLeft: editor.getBindingsFromShape(id, "arrow").length }));
    const doomed = arrowsToDelete(checks) as TLShapeId[];
    if (doomed.length > 0) editor.deleteShapes(doomed);
  });

  return () => {
    stopBefore();
    stopAfter();
  };
}

export function installEditorTweaks(editor: Editor): () => void {
  const undo = [
    installFigureHitTest(editor),
    installCopyWithConnectors(editor),
    installOrphanedArrowCleanup(editor),
  ];
  return () => undo.forEach((fn) => fn());
}
