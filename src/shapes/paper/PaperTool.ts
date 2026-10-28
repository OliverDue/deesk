import { StateNode, createShapeId } from "tldraw";
import { paperPlacement } from "./paperPlacement";
import { PAPER_TYPE } from "./paperTypes";

export const PAPER_TOOL_ID = "paper";

// One click on the desk drops a paper centred on the click, then returns to select.
export class PaperTool extends StateNode {
  static override id = PAPER_TOOL_ID;

  override onPointerDown() {
    const { x, y } = paperPlacement(this.editor.inputs.getCurrentPagePoint());
    const id = createShapeId();
    this.editor.createShape({ id, type: PAPER_TYPE, x, y });
    this.editor.select(id);
    this.editor.setCurrentTool("select");
  }
}
