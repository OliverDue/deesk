import { Tldraw } from "tldraw";
import "tldraw/tldraw.css";
import { useDeskStore } from "./persistence/useDeskStore";

const licenseKey = import.meta.env.VITE_TLDRAW_LICENSE_KEY as string | undefined;

export function Desk() {
  const store = useDeskStore();
  if (!store) return <div className="desk" />;
  return (
    <div className="desk">
      <Tldraw store={store} colorScheme="light" licenseKey={licenseKey || undefined} />
    </div>
  );
}
