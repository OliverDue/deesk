import { useEffect } from "react";
import { startEditingShapeWithRichText, useEditor } from "tldraw";
import { PAPER_TYPE, type PaperShape } from "../shapes/paper/paperTypes";
import { isBlankRichText } from "./blankRichText";
import { isEnterToEditKey, isTypeToEditKey } from "./typeToEdit";
import { whenRichTextEditorReady } from "./whenRichTextEditorReady";

function isTextFieldFocused(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
}

// Keyboard ways into writing on a selected paper:
// - Enter: edit, with the cursor at the end (tldraw's own Enter would select everything).
// - Typing: only when the paper is blank, so a paper with text cannot be changed by accident.
export function TypeToEditListener(): null {
  const editor = useEditor();

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isTextFieldFocused(e.target)) return;
      if (!editor.isIn("select.idle")) return;
      const shape = editor.getOnlySelectedShape();
      if (!shape || shape.type !== PAPER_TYPE) return;
      const paper = shape as PaperShape;

      if (isEnterToEditKey(e)) {
        e.preventDefault();
        e.stopPropagation();
        startEditingShapeWithRichText(editor, paper);
        return;
      }

      if (!isTypeToEditKey(e)) return;
      if (!isBlankRichText(paper.props.richText)) return;

      e.preventDefault();
      e.stopPropagation();
      startEditingShapeWithRichText(editor, paper);
      // The cursor goes to the end first: tldraw moves it there itself shortly after, and
      // inserting before that would put the first characters at the start.
      whenRichTextEditorReady(editor, (textEditor) =>
        textEditor.chain().focus("end").insertContent(e.key).run(),
      );
    };
    // Capture phase, so this runs before tldraw's single-letter tool shortcuts.
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [editor]);

  return null;
}
