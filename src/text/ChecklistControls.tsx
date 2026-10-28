import { useEffect } from "react";
import { TldrawUiButton, TldrawUiButtonIcon, useEditor, useValue } from "tldraw";
import { addChecklistItem, currentChecklistAction } from "./addChecklistItem";
import { isChecklistShortcut } from "./checklistAction";

// The button in the top-right corner.
export function ChecklistButton() {
  const editor = useEditor();
  // Greyed out while a paper is only selected: tick-boxes are added while writing in it.
  const enabled = useValue("checklist enabled", () => currentChecklistAction(editor).kind !== "none", [
    editor,
  ]);
  return (
    <div style={{ pointerEvents: "all" }}>
      <TldrawUiButton
        type="icon"
        disabled={!enabled}
        title={enabled ? "Add a tick-box (Cmd+Shift+9)" : "Double-click the paper to write, then add a tick-box"}
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
