export const PASTE_OFFSET_PX = 24;

// How far to move the nth paste of the same copy: down and to the right.
// Never zero, so a pasted copy can never land exactly on top of its original.
export function pasteOffset(timesPasted: number): { x: number; y: number } {
  const n = Number.isFinite(timesPasted) && timesPasted >= 1 ? timesPasted : 1;
  return { x: PASTE_OFFSET_PX * n, y: PASTE_OFFSET_PX * n };
}

// Counts consecutive pastes of the same copy (1, 2, 3, ...) and starts again when a
// different copy is pasted.
export function createPasteCounter() {
  let lastKey: string | null = null;
  let count = 0;
  return {
    next(key: string): number {
      if (key !== lastKey) {
        lastKey = key;
        count = 0;
      }
      count += 1;
      return count;
    },
  };
}
