import { StateNode } from "tldraw";
import { placePin } from "./pinSync";

export const PIN_TOOL_ID = "pin";

// One click drops a pin centred on the click, pinning every paper under it, then returns to
// select.
export class PinTool extends StateNode {
  static override id = PIN_TOOL_ID;

  override onPointerDown() {
    const id = placePin(this.editor, this.editor.inputs.getCurrentPagePoint());
    this.editor.select(id);
    this.editor.setCurrentTool("select");
  }
}
