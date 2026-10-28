import type { Editor, TLShapeId } from "tldraw";

// Whether a text selection spans the whole document (a select-all) and is not a cursor.
export function coversWholeDocument(from: number, to: number, docSize: number): boolean {
  return from !== to && from <= 1 && to >= docSize - 1;
}

const CARET_SETTLE_MS = 250;

// Put the cursor where the user double-clicked. tldraw does this itself when told where,
// but falls back to selecting all the text when the point is not over any text (for
// example in the empty space under it). Collapse that fallback to the end of the text.
export function placeCaretAtPointer(editor: Editor, shapeId: TLShapeId) {
  const point = editor.inputs.getCurrentScreenPoint();
  editor.emit("place-caret", { shapeId, point: { x: point.x, y: point.y } });

  editor.timers.setTimeout(() => {
    const textEditor = editor.getRichTextEditor();
    if (!textEditor || editor.getEditingShapeId() !== shapeId) return;
    const { from, to } = textEditor.state.selection;
    if (coversWholeDocument(from, to, textEditor.state.doc.content.size)) {
      textEditor.commands.focus("end");
    }
  }, CARET_SETTLE_MS);
}
