import { parseDesk, serializeDesk } from "./deskFile";

export const DESK_FILE = "desk.json";
export const TMP_FILE = "desk.json.tmp";
export const BACKUP_FILE = "desk.backup.json";

export interface FileOps {
  read(path: string): Promise<string | null>;
  write(path: string, text: string): Promise<void>;
  rename(from: string, to: string): Promise<void>;
  copy(from: string, to: string): Promise<void>;
}

export type LoadResult =
  | { kind: "empty" }
  | { kind: "ok"; document: unknown }
  | { kind: "recovered"; document: unknown }
  | { kind: "unreadable" };

async function readBackup(fs: FileOps): Promise<unknown | undefined> {
  const text = await fs.read(BACKUP_FILE);
  if (text === null) return undefined;
  const parsed = parseDesk(text);
  return parsed.ok ? parsed.document : undefined;
}

export async function loadDesk(fs: FileOps, now: () => number = Date.now): Promise<LoadResult> {
  const text = await fs.read(DESK_FILE);

  if (text === null) {
    const backup = await readBackup(fs);
    return backup === undefined ? { kind: "empty" } : { kind: "recovered", document: backup };
  }

  const parsed = parseDesk(text);
  if (parsed.ok) return { kind: "ok", document: parsed.document };

  // Never delete a damaged desk: move it aside so it can be inspected.
  await fs.rename(DESK_FILE, `desk.unreadable-${now()}.json`);
  const backup = await readBackup(fs);
  return backup === undefined ? { kind: "unreadable" } : { kind: "recovered", document: backup };
}

export async function saveDesk(fs: FileOps, document: unknown): Promise<void> {
  await fs.write(TMP_FILE, serializeDesk(document));

  // Only refresh the backup from a current file that is itself valid.
  const current = await fs.read(DESK_FILE);
  if (current !== null && parseDesk(current).ok) {
    await fs.copy(DESK_FILE, BACKUP_FILE);
  }

  await fs.rename(TMP_FILE, DESK_FILE);
}
