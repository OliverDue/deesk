import { Tldraw } from "tldraw";
import "tldraw/tldraw.css";
import { ZoomSpring } from "./camera/ZoomSpring";
import { ZOOM_STEPS } from "./camera/springConfig";
import { useDeskStore } from "./persistence/useDeskStore";
import {
  assetUrls,
  customTools,
  shapeUtils,
  uiComponents,
  uiOverrides,
} from "./shapes/registry";
import { TypeToEdit } from "./text/TypeToEditListener";
import { deeskExtensions } from "./text/textOptions";

const licenseKey = import.meta.env.VITE_TLDRAW_LICENSE_KEY as string | undefined;

export function Desk() {
  const store = useDeskStore();
  if (!store) return <div className="desk" />;
  return (
    <div className="desk">
      <Tldraw
        store={store}
        shapeUtils={shapeUtils}
        tools={customTools}
        overrides={uiOverrides}
        components={uiComponents}
        assetUrls={assetUrls}
        colorScheme="light"
        licenseKey={licenseKey || undefined}
        options={{
          camera: { zoomSteps: ZOOM_STEPS },
          text: { tipTapConfig: { extensions: deeskExtensions } },
        }}
      >
        <ZoomSpring />
        <TypeToEdit />
      </Tldraw>
    </div>
  );
}
