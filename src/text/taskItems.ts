import type { TLRichText } from "tldraw";

export interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

type Node = { type?: string; attrs?: Record<string, unknown>; content?: Node[] };

// A copy of the document with the `index`th task item (counted depth-first from 0, which
// is also the order the checkboxes appear on screen) ticked or unticked. The same object
// is returned when there is no such item. The input is never changed.
export function toggleTaskItem(richText: TLRichText, index: number): TLRichText {
  let count = 0;
  let found = false;

  const visit = (node: Node): Node => {
    let next = node;
    if (node.type === "taskItem") {
      if (count === index) {
        found = true;
        next = { ...node, attrs: { ...node.attrs, checked: !node.attrs?.checked } };
      }
      count += 1;
    }
    if (!Array.isArray(node.content)) return next;
    return { ...next, content: node.content.map(visit) };
  };

  const result = visit(richText as Node) as unknown as TLRichText;
  return found ? result : richText;
}

// The index of the first box containing the point (widened by `slop` pixels), or -1.
export function checkboxIndexAt(point: { x: number; y: number }, boxes: Box[], slop = 0): number {
  return boxes.findIndex(
    (b) =>
      point.x >= b.left - slop &&
      point.x <= b.right + slop &&
      point.y >= b.top - slop &&
      point.y <= b.bottom + slop,
  );
}
