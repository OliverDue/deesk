import { createShapeId, startEditingShapeWithRichText, type Editor } from "tldraw";
import { paperPlacement } from "../shapes/paper/paperPlacement";
import { PAPER_TYPE } from "../shapes/paper/paperTypes";
import { chooseChecklistAction, type ChecklistAction } from "./checklistAction";
import { whenRichTextEditorReady } from "./whenRichTextEditorReady";

// What the button and Cmd+Shift+9 would do right now. See chooseChecklistAction.
export function currentChecklistAction(editor: Editor): ChecklistAction {
  const editingId = editor.getEditingShapeId();
  const editingShape = editingId ? editor.getShape(editingId) : undefined;
  const selected = editor.getOnlySelectedShape();

  return chooseChecklistAction({
    editingShapeId: editingId,
    editingIsPaper: editingShape?.type === PAPER_TYPE,
    onlySelectedPaperId: selected?.type === PAPER_TYPE ? selected.id : null,
  });
}

// The button and Cmd+Shift+9 both do this.
export function addChecklistItem(editor: Editor) {
  const action = currentChecklistAction(editor);

  switch (action.kind) {
    case "toggle-line":
      editor.getRichTextEditor()?.chain().focus().toggleTaskList().run();
      return;

    case "new-paper": {
      const id = createShapeId();
      const { x, y } = paperPlacement(editor.getViewportPageBounds().center);
      editor.createShape({ id, type: PAPER_TYPE, x, y });
      editor.select(id);
      startEditingShapeWithRichText(editor, id);
      whenRichTextEditorReady(editor, (textEditor) =>
        textEditor.chain().focus("end").toggleTaskList().run(),
      );
      return;
    }

    case "none":
      return;
  }
}
