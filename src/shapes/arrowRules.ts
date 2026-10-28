export interface ArrowAnchors {
  id: string;
  // The shapes the arrow is bound to, one entry per anchored end.
  targetIds: string[];
}

// Arrows to copy along with `content`: those with both ends anchored to shapes inside it,
// that are not part of it already. An arrow with a loose end connects nothing, so it is left out.
export function connectingArrowIds(arrows: ArrowAnchors[], content: Set<string>): string[] {
  const result: string[] = [];
  for (const arrow of arrows) {
    if (content.has(arrow.id) || result.includes(arrow.id)) continue;
    if (arrow.targetIds.length < 2) continue;
    if (arrow.targetIds.every((id) => content.has(id))) result.push(arrow.id);
  }
  return result;
}

export interface ArrowCheck {
  arrowId: string;
  bindingsLeft: number;
}

// Of arrows that lost an anchor, the ones with no anchor left, each once.
export function arrowsToDelete(checks: ArrowCheck[]): string[] {
  const ids: string[] = [];
  for (const c of checks) {
    if (c.bindingsLeft === 0 && !ids.includes(c.arrowId)) ids.push(c.arrowId);
  }
  return ids;
}
