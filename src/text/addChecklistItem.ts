import { createShapeId, startEditingShapeWithRichText, type Editor, type TLShapeId } from "tldraw";
import { paperPlacement } from "../shapes/paper/paperPlacement";
import { PAPER_TYPE, type PaperShape } from "../shapes/paper/paperTypes";
import { isBlankRichText } from "./blankRichText";
import { chooseChecklistAction } from "./checklistAction";
import { whenRichTextEditorReady } from "./whenRichTextEditorReady";

// The button and Cmd+Shift+9 both do this. See chooseChecklistAction for the three cases.
export function addChecklistItem(editor: Editor) {
  const editingId = editor.getEditingShapeId();
  const editingShape = editingId ? editor.getShape(editingId) : undefined;
  const selected = editor.getOnlySelectedShape();

  const action = chooseChecklistAction({
    editingShapeId: editingId,
    editingIsPaper: editingShape?.type === PAPER_TYPE,
    onlySelectedPaperId: selected?.type === PAPER_TYPE ? selected.id : null,
  });

  switch (action.kind) {
    case "toggle-line":
      editor.getRichTextEditor()?.chain().focus().toggleTaskList().run();
      return;

    case "add-to-paper": {
      const paper = editor.getShape(action.paperId as TLShapeId) as PaperShape | undefined;
      if (!paper) return;
      const blank = isBlankRichText(paper.props.richText);
      startEditingShapeWithRichText(editor, paper);
      whenRichTextEditorReady(editor, (textEditor) => {
        const chain = textEditor.chain().focus("end");
        // Start a new line for the new item, unless the paper is blank or already ends on one.
        if (!blank && textEditor.state.doc.lastChild?.textContent.trim() !== "") {
          chain.insertContentAt(textEditor.state.doc.content.size, { type: "paragraph" });
        }
        chain.focus("end").toggleTaskList().run();
      });
      return;
    }

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
