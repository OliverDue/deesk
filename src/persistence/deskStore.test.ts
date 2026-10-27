import { describe, it, expect } from "vitest";
import { serializeDesk } from "./deskFile";
import { BACKUP_FILE, DESK_FILE, TMP_FILE, loadDesk, saveDesk, type FileOps } from "./deskStore";

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

const docA = { name: "A" };
const docB = { name: "B" };
const now = () => 1000;

describe("deskStore", () => {
  it("loads as empty on first launch", async () => {
    const { fs } = memoryFs();
    expect(await loadDesk(fs, now)).toEqual({ kind: "empty" });
  });

  it("saves and loads the same document", async () => {
    const { fs } = memoryFs();
    await saveDesk(fs, docA);
    expect(await loadDesk(fs, now)).toEqual({ kind: "ok", document: docA });
  });

  it("keeps the previous version as a backup on the second save", async () => {
    const { fs, files } = memoryFs();
    await saveDesk(fs, docA);
    await saveDesk(fs, docB);
    expect(files.get(BACKUP_FILE)).toBe(serializeDesk(docA));
    expect(files.get(DESK_FILE)).toBe(serializeDesk(docB));
    expect(files.has(TMP_FILE)).toBe(false);
  });

  it("recovers from the backup when desk.json is corrupt, and moves the bad file aside", async () => {
    const { fs, files } = memoryFs({
      [DESK_FILE]: "garbage {",
      [BACKUP_FILE]: serializeDesk(docA),
    });
    expect(await loadDesk(fs, now)).toEqual({ kind: "recovered", document: docA });
    expect(files.has(DESK_FILE)).toBe(false);
    expect(files.get("desk.unreadable-1000.json")).toBe("garbage {");
  });

  it("reports unreadable, and keeps the bad file, when there is no usable backup", async () => {
    const { fs, files } = memoryFs({ [DESK_FILE]: "garbage {" });
    expect(await loadDesk(fs, now)).toEqual({ kind: "unreadable" });
    expect(files.get("desk.unreadable-1000.json")).toBe("garbage {");
  });

  it("recovers from the backup when desk.json is missing", async () => {
    const { fs } = memoryFs({ [BACKUP_FILE]: serializeDesk(docA) });
    expect(await loadDesk(fs, now)).toEqual({ kind: "recovered", document: docA });
  });

  it("ignores a leftover temp file from a crash mid-write", async () => {
    const { fs } = memoryFs({
      [DESK_FILE]: serializeDesk(docA),
      [TMP_FILE]: '{"version":1,"docum',
    });
    expect(await loadDesk(fs, now)).toEqual({ kind: "ok", document: docA });
  });

  it("never copies a corrupt desk.json over a good backup", async () => {
    const { fs, files } = memoryFs({
      [DESK_FILE]: "garbage {",
      [BACKUP_FILE]: serializeDesk(docA),
    });
    await saveDesk(fs, docB);
    expect(files.get(BACKUP_FILE)).toBe(serializeDesk(docA));
    expect(files.get(DESK_FILE)).toBe(serializeDesk(docB));
  });
});
