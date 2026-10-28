export type ChecklistAction =
  | { kind: "toggle-line" }
  | { kind: "add-to-paper"; paperId: string }
  | { kind: "new-paper" }
  | { kind: "none" };

export interface ChecklistContext {
  editingShapeId: string | null;
  editingIsPaper: boolean;
  onlySelectedPaperId: string | null;
}

// What the "add a tick-box" button and shortcut should do right now.
export function chooseChecklistAction(ctx: ChecklistContext): ChecklistAction {
  if (ctx.editingShapeId !== null) {
    return ctx.editingIsPaper ? { kind: "toggle-line" } : { kind: "none" };
  }
  if (ctx.onlySelectedPaperId !== null) {
    return { kind: "add-to-paper", paperId: ctx.onlySelectedPaperId };
  }
  return { kind: "new-paper" };
}

export interface ShortcutKey {
  code: string;
  metaKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
  isComposing?: boolean;
}

// Cmd+Shift+9 (Ctrl+Shift+9 elsewhere). Found by the physical key, because Shift+9 types
// ")" on a Danish keyboard, and the character would not match.
export function isChecklistShortcut(e: ShortcutKey): boolean {
  if (e.isComposing || e.altKey) return false;
  return (e.metaKey || e.ctrlKey) && e.shiftKey && e.code === "Digit9";
}
