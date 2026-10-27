import { useEffect } from "react";
import { EASINGS, useEditor } from "tldraw";
import { springAnchor, springTarget, zoomAbout } from "./spring";
import { SPRING_DURATION_MS, SPRING_IDLE_MS } from "./springConfig";

export function ZoomSpring(): null {
  const editor = useEditor();

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;

    const settle = () => {
      timer = null;
      const camera = editor.getCamera();
      const target = springTarget(camera.z, SPRING_IDLE_MS);
      if (target === null) return;
      const anchor = springAnchor(
        editor.inputs.getCurrentScreenPoint(),
        editor.getViewportScreenBounds(),
      );
      editor.setCamera(zoomAbout(camera, anchor, target), {
        animation: { duration: SPRING_DURATION_MS, easing: EASINGS.easeOutCubic },
      });
    };

    // Re-arm the timer on every camera change; it fires once the user has stopped.
    const unlisten = editor.store.listen(
      (entry) => {
        const touchedCamera = Object.keys(entry.changes.updated).some((id) =>
          id.startsWith("camera:"),
        );
        if (!touchedCamera) return;
        if (timer) clearTimeout(timer);
        timer = setTimeout(settle, SPRING_IDLE_MS);
      },
      { scope: "session" },
    );

    return () => {
      unlisten();
      if (timer) clearTimeout(timer);
    };
  }, [editor]);

  return null;
}
