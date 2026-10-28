import { useEffect } from "react";
import { useEditor } from "tldraw";
import { installEditorTweaks } from "./editorTweaks";

// Installs the editor tweaks while the editor is mounted.
export function EditorTweaks(): null {
  const editor = useEditor();
  useEffect(() => installEditorTweaks(editor), [editor]);
  return null;
}
