export const DESK_FILE_VERSION = 1;

export type ParseResult =
  | { ok: true; document: unknown }
  | { ok: false; reason: "invalid" | "unsupported-version" };

export function serializeDesk(document: unknown): string {
  return JSON.stringify({ version: DESK_FILE_VERSION, document });
}

export function parseDesk(text: string): ParseResult {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return { ok: false, reason: "invalid" };
  }
  if (typeof value !== "object" || value === null) {
    return { ok: false, reason: "invalid" };
  }
  const file = value as { version?: unknown; document?: unknown };
  if (file.version !== DESK_FILE_VERSION && typeof file.version === "number") {
    return { ok: false, reason: "unsupported-version" };
  }
  if (file.version !== DESK_FILE_VERSION || file.document === undefined) {
    return { ok: false, reason: "invalid" };
  }
  return { ok: true, document: file.document };
}
