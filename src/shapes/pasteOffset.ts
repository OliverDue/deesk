export const PASTE_OFFSET_PX = 24;
export const MAX_PASTE_STEPS = 50;

// Positions closer than this count as the same spot.
const SAME_SPOT_PX = 1;

export interface Point {
  x: number;
  y: number;
}

const sameSpot = (a: Point, b: Point) =>
  Math.abs(a.x - b.x) <= SAME_SPOT_PX && Math.abs(a.y - b.y) <= SAME_SPOT_PX;

// How many steps, down and to the right, a pasted copy must move so that none of its
// shapes lands exactly on an existing shape. It looks at where shapes really are, with
// no count kept in memory, so deleting a copy frees its spot again.
export function pasteStep(pasted: Point[], existing: Point[]): number {
  for (let step = 0; step < MAX_PASTE_STEPS; step++) {
    const d = step * PASTE_OFFSET_PX;
    const lands = pasted.some((p) => existing.some((e) => sameSpot({ x: p.x + d, y: p.y + d }, e)));
    if (!lands) return step;
  }
  return MAX_PASTE_STEPS;
}

export function pasteOffset(step: number): Point {
  const d = Math.max(0, step) * PASTE_OFFSET_PX;
  return { x: d, y: d };
}
