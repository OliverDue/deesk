import { useEffect, useState } from "react";
import { createTLStore, getSnapshot, loadSnapshot, type TLStore } from "tldraw";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { createAutosaver } from "./autosave";
import { loadDesk, saveDesk } from "./deskStore";
import { loadSession, saveSession } from "./sessionStore";
import { shapeUtils } from "../shapes/registry";
import { ensureDataDir, tauriFileOps } from "./tauriFs";

const SAVE_DELAY_MS = 500;
const SESSION_SAVE_DELAY_MS = 1000;

export function useDeskStore(): TLStore | null {
  const [store, setStore] = useState<TLStore | null>(null);

  useEffect(() => {
    let cancelled = false;
    let stop = () => {};

    (async () => {
      await ensureDataDir();
      const result = await loadDesk(tauriFileOps);
      const session = await loadSession(tauriFileOps);
      if (cancelled) return;

      if (result.kind === "recovered") {
        console.warn("Deesk: desk.json was damaged; restored from the backup.");
      } else if (result.kind === "unreadable") {
        console.warn("Deesk: desk.json was unreadable and has been moved aside; starting empty.");
      }

      const next = createTLStore({ shapeUtils });
      if (result.kind === "ok" || result.kind === "recovered") {
        loadSnapshot(next, {
          document: result.document as never,
          ...(session ? { session: session as never } : {}),
        });
      }

      // Saving starts only now, after loading finished.
      const saver = createAutosaver(
        () => saveDesk(tauriFileOps, getSnapshot(next).document),
        SAVE_DELAY_MS,
        (e) => console.error("Deesk: save failed", e),
      );
      const unlisten = next.listen(() => saver.schedule(), { source: "user", scope: "document" });

      // The view (camera, selection) is saved separately, a little less eagerly.
      const sessionSaver = createAutosaver(
        () => saveSession(tauriFileOps, getSnapshot(next).session),
        SESSION_SAVE_DELAY_MS,
        (e) => console.error("Deesk: saving the view failed", e),
      );
      const unlistenSession = next.listen(() => sessionSaver.schedule(), { scope: "session" });

      const unlistenClose = await getCurrentWindow().onCloseRequested(async () => {
        await saver.flush();
        await sessionSaver.flush();
      });

      stop = () => {
        unlisten();
        unlistenSession();
        unlistenClose();
        saver.cancel();
        sessionSaver.cancel();
      };
      if (cancelled) stop();
      else setStore(next);
    })();

    return () => {
      cancelled = true;
      stop();
    };
  }, []);

  return store;
}
