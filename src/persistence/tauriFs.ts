import { appDataDir } from "@tauri-apps/api/path";
import {
  BaseDirectory,
  copyFile,
  exists,
  mkdir,
  readTextFile,
  rename,
  writeTextFile,
} from "@tauri-apps/plugin-fs";
import type { FileOps } from "./deskStore";

const base = { baseDir: BaseDirectory.AppData };

export const tauriFileOps: FileOps = {
  async read(path) {
    return (await exists(path, base)) ? readTextFile(path, base) : null;
  },
  write: (path, text) => writeTextFile(path, text, base),
  rename: (from, to) =>
    rename(from, to, {
      oldPathBaseDir: BaseDirectory.AppData,
      newPathBaseDir: BaseDirectory.AppData,
    }),
  copy: (from, to) =>
    copyFile(from, to, {
      fromPathBaseDir: BaseDirectory.AppData,
      toPathBaseDir: BaseDirectory.AppData,
    }),
};

// The app data folder does not exist on first launch.
export async function ensureDataDir(): Promise<void> {
  await mkdir(await appDataDir(), { recursive: true });
}
