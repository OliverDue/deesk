// All the text in a rich text document, joined, whatever the nesting (headings, lists, ...).
function collectText(node: unknown): string {
  if (!node || typeof node !== "object") return "";
  const n = node as { text?: unknown; content?: unknown };
  if (typeof n.text === "string") return n.text;
  if (!Array.isArray(n.content)) return "";
  return n.content.map(collectText).join("");
}

// A paper is blank when it has no visible text. Anything unusable counts as blank.
export function isBlankRichText(richText: unknown): boolean {
  return collectText(richText).trim() === "";
}
