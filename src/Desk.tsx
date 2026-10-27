import { Tldraw } from "tldraw";
import "tldraw/tldraw.css";

const licenseKey = import.meta.env.VITE_TLDRAW_LICENSE_KEY as string | undefined;

export function Desk() {
  return (
    <div className="desk">
      <Tldraw colorScheme="light" licenseKey={licenseKey || undefined} />
    </div>
  );
}
