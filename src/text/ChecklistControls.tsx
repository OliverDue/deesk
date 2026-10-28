import { useEffect } from "react";
import { TldrawUiButton, TldrawUiButtonIcon, useEditor } from "tldraw";
import { addChecklistItem } from "./addChecklistItem";
import { isChecklistShortcut } from "./checklistAction";

// The button in the top-right corner.
export function ChecklistButton() {
  const editor = useEditor();
  return (
    <div style={{ pointerEvents: "all" }}>
      <TldrawUiButton
        type="icon"
        title="Add a tick-box (Cmd+Shift+9)"
        onClick={() => addChecklistItem(editor)}
      >
        <TldrawUiButtonIcon icon="checklist-icon" />
      </TldrawUiButton>
    </div>
  );
}

// Cmd+Shift+9. Capture phase, so it runs before tldraw's and TipTap's own handling, and
// works the same whether or not a paper is being edited.
export function ChecklistShortcut(): null {
  const editor = useEditor();

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!isChecklistShortcut(e)) return;
      e.preventDefault();
      e.stopPropagation();
      addChecklistItem(editor);
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [editor]);

  return null;
}
