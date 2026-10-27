import type { FileOps } from "./deskStore";

export const SESSION_FILE = "session.json";
export const SESSION_TMP_FILE = "session.json.tmp";

export async function loadSession(fs: FileOps): Promise<unknown | null> {
  const text = await fs.read(SESSION_FILE);
  if (text === null) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export async function saveSession(fs: FileOps, session: unknown): Promise<void> {
  await fs.write(SESSION_TMP_FILE, JSON.stringify(session));
  await fs.rename(SESSION_TMP_FILE, SESSION_FILE);
}
