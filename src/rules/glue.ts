// The minimum a glued shape needs; a tldraw paper satisfies it.
export interface GlueShape {
  x: number;
  y: number;
  rotation: number;
  props: { w: number; h: number; [key: string]: unknown };
  meta: Record<string, unknown>;
}

// Glue is a flag in the shape's meta, so no schema migration is needed.
export function isGlued(shape: Pick<GlueShape, "meta">): boolean {
  return shape.meta.glued === true;
}

// Applied to every update of a paper. While it stays glued, where it is and how big it is
// cannot change, whatever the source (drag, arrow keys, handles); text and the rest can.
// An update that removes the glue goes through as it is.
export function guardGlued<T extends GlueShape>(prev: T, next: T): T {
  if (!isGlued(prev) || !isGlued(next)) return next;
  return {
    ...next,
    x: prev.x,
    y: prev.y,
    rotation: prev.rotation,
    props: { ...next.props, w: prev.props.w, h: prev.props.h },
  };
}

// What the Glue button does to the selected papers: glue them all, unless they all are
// glued already, in which case unglue them.
export function nextGlueValue(papers: Pick<GlueShape, "meta">[]): boolean {
  return papers.length > 0 && !papers.every(isGlued);
}

// A copy of a glued paper starts unglued.
export function withoutGlue<T extends Pick<GlueShape, "meta">>(shape: T): T {
  if (!("glued" in shape.meta)) return shape;
  const { glued: _glued, ...meta } = shape.meta;
  return { ...shape, meta };
}
