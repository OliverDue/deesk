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
import { EditorTweaks } from "./shapes/EditorTweaksInstaller";
import { PasteOffset } from "./shapes/PasteOffsetHandler";
import { ChecklistShortcut } from "./text/ChecklistControls";
import { deeskTheme } from "./text/deeskTheme";
import { TypeToEditListener } from "./text/TypeToEditListener";
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
        themes={{ default: deeskTheme }}
        licenseKey={licenseKey || undefined}
        options={{
          camera: { zoomSteps: ZOOM_STEPS },
          text: { tipTapConfig: { extensions: deeskExtensions } },
        }}
      >
        <ZoomSpring />
        <TypeToEditListener />
        <ChecklistShortcut />
        <PasteOffset />
        <EditorTweaks />
      </Tldraw>
    </div>
  );
}
