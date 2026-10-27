import { describe, it, expect } from "vitest";
import { SESSION_FILE, SESSION_TMP_FILE, loadSession, saveSession } from "./sessionStore";
import type { FileOps } from "./deskStore";

function memoryFs(initial: Record<string, string> = {}) {
  const files = new Map<string, string>(Object.entries(initial));
  const fs: FileOps = {
    async read(path) {
      return files.has(path) ? (files.get(path) as string) : null;
    },
    async write(path, text) {
      files.set(path, text);
    },
    async rename(from, to) {
      files.set(to, files.get(from) as string);
      files.delete(from);
    },
    async copy(from, to) {
      files.set(to, files.get(from) as string);
    },
  };
  return { fs, files };
}

describe("sessionStore", () => {
  it("returns null when there is no session file", async () => {
    const { fs } = memoryFs();
    expect(await loadSession(fs)).toBeNull();
  });

  it("round-trips a session", async () => {
    const { fs, files } = memoryFs();
    const session = { camera: { x: 10, y: -20, z: 0.5 } };
    await saveSession(fs, session);
    expect(await loadSession(fs)).toEqual(session);
    expect(files.has(SESSION_TMP_FILE)).toBe(false);
  });

  it("returns null, without throwing, when the file is corrupt", async () => {
    const { fs } = memoryFs({ [SESSION_FILE]: "garbage {" });
    expect(await loadSession(fs)).toBeNull();
  });
});
