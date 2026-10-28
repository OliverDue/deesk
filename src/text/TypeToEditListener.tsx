import { useEffect } from "react";
import { startEditingShapeWithRichText, useEditor, type Editor } from "tldraw";
import { PAPER_TYPE, type PaperShape } from "../shapes/paper/paperTypes";
import { isBlankRichText } from "./blankRichText";
import { isEnterToEditKey, isTypeToEditKey } from "./typeToEdit";

function isTextFieldFocused(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
}

// The text editor appears a few frames after editing starts, so wait for it before typing.
// The cursor goes to the end first: tldraw moves it there itself shortly after, and
// inserting before that would put the first characters at the start.
function insertWhenReady(editor: Editor, text: string, framesLeft = 30) {
  const textEditor = editor.getRichTextEditor();
  if (textEditor) {
    textEditor.chain().focus("end").insertContent(text).run();
    return;
  }
  if (framesLeft > 0) requestAnimationFrame(() => insertWhenReady(editor, text, framesLeft - 1));
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
      insertWhenReady(editor, e.key);
    };
    // Capture phase, so this runs before tldraw's single-letter tool shortcuts.
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [editor]);

  return null;
}
