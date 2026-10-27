import { Tldraw } from "tldraw";
import "tldraw/tldraw.css";
import { ZoomSpring } from "./camera/ZoomSpring";
import { ZOOM_STEPS } from "./camera/springConfig";
import { useDeskStore } from "./persistence/useDeskStore";

const licenseKey = import.meta.env.VITE_TLDRAW_LICENSE_KEY as string | undefined;

export function Desk() {
  const store = useDeskStore();
  if (!store) return <div className="desk" />;
  return (
    <div className="desk">
      <Tldraw
        store={store}
        colorScheme="light"
        licenseKey={licenseKey || undefined}
        options={{ camera: { zoomSteps: ZOOM_STEPS } }}
      >
        <ZoomSpring />
      </Tldraw>
    </div>
  );
}
