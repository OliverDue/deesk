import { PAPER_TYPE } from "./paperTypes";

// Whether a paper takes a shape of this type as one of its figures. Papers never nest, so
// overlapping papers just stack; a locked paper accepts nothing.
export function paperAccepts(type: string, isLocked: boolean): boolean {
  return !isLocked && type !== PAPER_TYPE;
}

// Whether a figure is cut off at the paper's edge. Arrows are not, so a connector can run
// from a paper to something outside it (tldraw's own rule for frames).
export function paperClips(type: string): boolean {
  return type !== "arrow";
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
