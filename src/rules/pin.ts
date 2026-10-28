// A paper's place on the desk: its top-left corner and rotation in page space, and its size.
export interface PaperFrame {
  id: string;
  x: number;
  y: number;
  rotation: number;
  w: number;
  h: number;
}

// Whether a page-space point lies on a paper, rotation included: the point is moved into the
// paper's own frame (undoing its rotation about the top-left corner), then tested against its
// width and height. The edge counts as inside.
export function pointInFrame(point: { x: number; y: number }, f: PaperFrame): boolean {
  const dx = point.x - f.x;
  const dy = point.y - f.y;
  const cos = Math.cos(f.rotation);
  const sin = Math.sin(f.rotation);
  const x = dx * cos + dy * sin;
  const y = -dx * sin + dy * cos;
  return x >= 0 && x <= f.w && y >= 0 && y <= f.h;
}

// The papers a pin at `point` pins: all of them, however many overlap there.
export function papersUnderPin(point: { x: number; y: number }, frames: PaperFrame[]): string[] {
  return frames.filter((f) => pointInFrame(point, f)).map((f) => f.id);
}

// What to do to a pin's papers so that exactly `wanted` are pinned.
export function pinChanges(
  current: string[],
  wanted: string[],
): { add: string[]; remove: string[] } {
  return {
    add: wanted.filter((id) => !current.includes(id)),
    remove: current.filter((id) => !wanted.includes(id)),
  };
}
