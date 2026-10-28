import { useEffect } from "react";
import { startEditingShapeWithRichText, useEditor, type Editor } from "tldraw";
import { PAPER_TYPE } from "../shapes/paper/paperTypes";
import { isTypeToEditKey } from "./typeToEdit";

function isTextFieldFocused(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
}

// The text editor appears a few frames after editing starts, so wait for it before typing.
function insertWhenReady(editor: Editor, text: string, framesLeft = 30) {
  const textEditor = editor.getRichTextEditor();
  if (textEditor) {
    textEditor.chain().focus().insertContent(text).run();
    return;
  }
  if (framesLeft > 0) requestAnimationFrame(() => insertWhenReady(editor, text, framesLeft - 1));
}

// Typing on a selected paper starts writing, and keeps the first character.
export function TypeToEdit(): null {
  const editor = useEditor();

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!isTypeToEditKey(e)) return;
      if (isTextFieldFocused(e.target)) return;
      if (!editor.isIn("select.idle")) return;
      const shape = editor.getOnlySelectedShape();
      if (!shape || shape.type !== PAPER_TYPE) return;

      e.preventDefault();
      e.stopPropagation();
      startEditingShapeWithRichText(editor, shape);
      insertWhenReady(editor, e.key);
    };
    // Capture phase, so this runs before tldraw's single-letter tool shortcuts.
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [editor]);

  return null;
}
