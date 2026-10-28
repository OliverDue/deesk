import { StateNode, createShapeId } from "tldraw";
import { STICKER_DIAMETER, STICKER_TYPE, StickerColorStyle } from "./stickerTypes";

export const STICKER_TOOL_ID = "sticker";

// One click drops a sticker centred on the click, in the colour chosen in the style panel,
// then returns to select. tldraw puts it on the paper under the click, if there is one.
export class StickerTool extends StateNode {
  static override id = STICKER_TOOL_ID;
  // Lets the style panel show the sticker colours while this tool is active.
  override shapeType = STICKER_TYPE;

  override onPointerDown() {
    const p = this.editor.inputs.getCurrentPagePoint();
    const id = createShapeId();
    this.editor.createShape({
      id,
      type: STICKER_TYPE,
      x: p.x - STICKER_DIAMETER / 2,
      y: p.y - STICKER_DIAMETER / 2,
      props: { color: this.editor.getStyleForNextShape(StickerColorStyle) },
    });
    this.editor.select(id);
    this.editor.setCurrentTool("select");
  }
}
