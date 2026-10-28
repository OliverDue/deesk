export interface KeyInfo {
  key: string;
  metaKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
  isComposing: boolean;
}

// A key press that should start writing on the selected paper: one printable character,
// without Cmd or Ctrl, and not Space (Space is tldraw's pan key). Option/Alt is allowed
// because some keyboards make characters such as @ with it.
export function isTypeToEditKey(e: KeyInfo): boolean {
  if (e.metaKey || e.ctrlKey || e.isComposing) return false;
  if (e.key === " ") return false;
  return [...e.key].length === 1;
}
