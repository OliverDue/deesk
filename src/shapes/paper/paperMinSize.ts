export interface Bounds {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface LocalTransform {
  x: number;
  y: number;
  rotation: number;
}

// The box, in the parent's coordinates, that covers a shape: its own bounds (`local`, in the
// shape's coordinates) moved and turned by the shape's position and rotation.
export function boundsInParent(local: Bounds, t: LocalTransform): Bounds {
  const cos = Math.cos(t.rotation);
  const sin = Math.sin(t.rotation);
  const corners = [
    [local.x, local.y],
    [local.x + local.w, local.y],
    [local.x + local.w, local.y + local.h],
    [local.x, local.y + local.h],
  ].map(([px, py]) => ({
    x: t.x + px * cos - py * sin,
    y: t.y + px * sin + py * cos,
  }));
  const xs = corners.map((c) => c.x);
  const ys = corners.map((c) => c.y);
  const left = Math.min(...xs);
  const top = Math.min(...ys);
  return { x: left, y: top, w: Math.max(...xs) - left, h: Math.max(...ys) - top };
}

// The smallest size a paper may be resized to: big enough to show every figure that would
// otherwise be cut off (their farthest right and bottom edges), and never below `min`.
export function contentMinSize(
  figures: Bounds[],
  min: { w: number; h: number },
): { w: number; h: number } {
  let w = min.w;
  let h = min.h;
  for (const f of figures) {
    w = Math.max(w, f.x + f.w);
    h = Math.max(h, f.y + f.h);
  }
  return { w, h };
}

// The part of a figure that lies within the sheet (cut at its right and bottom edge). A
// figure that already overhangs then asks for no more than the paper's current size, so
// resizing never makes the paper jump bigger.
export function clampToSheet(figure: Bounds, sheet: { w: number; h: number }): Bounds {
  return {
    ...figure,
    w: Math.max(0, Math.min(figure.x + figure.w, sheet.w) - figure.x),
    h: Math.max(0, Math.min(figure.y + figure.h, sheet.h) - figure.y),
  };
}
