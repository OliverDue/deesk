import { PAPER_TYPE } from "./paperTypes";

// Types that are never figures: papers never nest (overlapping papers just stack), and a pin
// stays on the desk above the papers it pins. A locked paper accepts nothing.
const NEVER_FIGURES = new Set([PAPER_TYPE, "pin"]);

// Whether a paper takes a shape of this type as one of its figures.
export function paperAccepts(type: string, isLocked: boolean): boolean {
  return !isLocked && !NEVER_FIGURES.has(type);
}

// Figure types that are not cut off at the paper's edge. Arrows can run from a paper to
// something outside it (tldraw's own rule for frames), and a freehand stroke can run past
// the edge while still belonging to the paper.
const UNCLIPPED_TYPES = new Set(["arrow", "draw", "highlight", "sticker"]);

// Whether a figure is cut off at the paper's edge.
export function paperClips(type: string): boolean {
  return !UNCLIPPED_TYPES.has(type);
}

// Whether the paper may not be resized so small that this figure leaves it: every clipped
// figure, and stickers too (they may overhang, but must not be sized away from).
export function paperKeepsInside(type: string): boolean {
  return paperClips(type) || type === "sticker";
}

// The paper's rectangle in its own coordinates, clockwise from the top-left corner.
export function paperClipRect(w: number, h: number): { x: number; y: number }[] {
  return [
    { x: 0, y: 0 },
    { x: w, y: 0 },
    { x: w, y: h },
    { x: 0, y: h },
  ];
}
