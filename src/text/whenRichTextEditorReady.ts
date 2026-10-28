import type { Editor } from "tldraw";

type TextEditor = NonNullable<ReturnType<Editor["getRichTextEditor"]>>;

// Calls `run` once tldraw's text editor exists. Gives up after about 30 frames.
export function whenRichTextEditorReady(
  editor: Editor,
  run: (textEditor: TextEditor) => void,
  framesLeft = 30,
) {
  const textEditor = editor.getRichTextEditor();
  if (textEditor) {
    run(textEditor);
    return;
  }
  if (framesLeft > 0) {
    requestAnimationFrame(() => whenRichTextEditorReady(editor, run, framesLeft - 1));
  }
}
