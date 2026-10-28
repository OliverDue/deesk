import { createShapeId, type Editor, type TLShape, type TLShapeId } from "tldraw";
import { papersUnderPin, pinChanges, type PaperFrame } from "../../rules/pin";
import { PAPER_TYPE, type PaperShape } from "../paper/paperTypes";
import { PIN_BINDING, PIN_DIAMETER, PIN_TYPE } from "./pinTypes";

// Makes the pin pin exactly the papers under its centre: adds a binding for each paper newly
// under it and removes the ones for papers it has left.
export function syncPin(editor: Editor, pinId: TLShapeId) {
  const pin = editor.getShape(pinId);
  if (!pin || pin.type !== PIN_TYPE) return;
  const r = PIN_DIAMETER / 2;
  const centre = editor.getShapePageTransform(pin).applyToPoint({ x: r, y: r });

  const frames: PaperFrame[] = editor
    .getCurrentPageShapes()
    .filter((s): s is PaperShape => s.type === PAPER_TYPE)
    .map((paper) => {
      const t = editor.getShapePageTransform(paper);
      const origin = t.point();
      return {
        id: paper.id,
        x: origin.x,
        y: origin.y,
        rotation: t.rotation(),
        w: paper.props.w,
        h: paper.props.h,
      };
    });

  const existing = editor.getBindingsFromShape(pin, PIN_BINDING);
  const { add, remove } = pinChanges(
    existing.map((b) => b.toId),
    papersUnderPin(centre, frames),
  );
  if (remove.length > 0) {
    editor.deleteBindings(existing.filter((b) => remove.includes(b.toId)));
  }
  if (add.length > 0) {
    editor.createBindings(
      add.map((toId) => ({
        type: PIN_BINDING,
        fromId: pin.id,
        toId: toId as TLShapeId,
        props: {},
      })),
    );
  }
}

// One pin placed centred on `point`; it pins the papers under it. Returns its id.
export function placePin(editor: Editor, point: { x: number; y: number }): TLShapeId {
  const id = createShapeId();
  editor.createShape({
    id,
    type: PIN_TYPE,
    x: point.x - PIN_DIAMETER / 2,
    y: point.y - PIN_DIAMETER / 2,
  });
  syncPin(editor, id);
  return id;
}

// Re-syncs a pin whenever it moves (dragged or nudged), so it always pins what is under it.
// Also makes pins uncopyable: copy, cut-and-paste's copy and duplicate leave them out, and a
// pin is never pasted. (Cut still deletes the pin.) Returns a function that undoes both.
export function installPinSync(editor: Editor): () => void {
  const removeHandler = editor.sideEffects.registerAfterChangeHandler("shape", (prev, next) => {
    if (next.type !== PIN_TYPE) return;
    if (prev.x === next.x && prev.y === next.y && prev.parentId === next.parentId) return;
    syncPin(editor, next.id);
  });

  const withoutPins = (shapes: (TLShape | TLShapeId)[]): TLShapeId[] =>
    shapes
      .map((s) => (typeof s === "string" ? s : s.id))
      .filter((id) => editor.getShape(id)?.type !== PIN_TYPE);

  const originalContent = editor.getContentFromCurrentPage;
  editor.getContentFromCurrentPage = function (shapes) {
    const ids = withoutPins(shapes);
    return ids.length === 0 ? undefined : originalContent.call(editor, ids);
  };

  const originalDuplicate = editor.duplicateShapes;
  editor.duplicateShapes = function (shapes, offset) {
    const ids = withoutPins(shapes);
    return ids.length === 0 ? editor : originalDuplicate.call(editor, ids, offset);
  };

  return () => {
    removeHandler();
    editor.getContentFromCurrentPage = originalContent;
    editor.duplicateShapes = originalDuplicate;
  };
}
