import { useEffect } from "react";
import { useEditor } from "tldraw";
import { installEditorTweaks } from "./editorTweaks";
import { installPinSync } from "./pin/pinSync";

// Installs the editor tweaks and the pin sync while the editor is mounted.
export function EditorTweaks(): null {
  const editor = useEditor();
  useEffect(() => {
    const undoTweaks = installEditorTweaks(editor);
    const undoPinSync = installPinSync(editor);
    return () => {
      undoTweaks();
      undoPinSync();
    };
  }, [editor]);
  return null;
}
