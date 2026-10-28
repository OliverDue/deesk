import {
  BaseBoxShapeUtil,
  HTMLContainer,
  resizeBox,
  RichTextLabel,
  richTextValidator,
  startEditingShapeWithRichText,
  T,
  toRichText,
  useValue,
  type TLResizeInfo,
} from "tldraw";
import { placeCaretAtPointer } from "../../text/placeCaret";
import { checkboxIndexAt, toggleTaskItem } from "../../text/taskItems";
import {
  PAPER_DEFAULT_HEIGHT,
  PAPER_DEFAULT_WIDTH,
  PAPER_FONT_FAMILY,
  PAPER_FONT_SIZE_PX,
  PAPER_LINE_HEIGHT,
  PAPER_MIN_HEIGHT,
  PAPER_MIN_WIDTH,
  PAPER_PADDING_PX,
  PAPER_TEXT_COLOR,
  PAPER_TYPE,
  type PaperShape,
} from "./paperTypes";

export class PaperShapeUtil extends BaseBoxShapeUtil<PaperShape> {
  static override type = PAPER_TYPE;
  static override props = { w: T.number, h: T.number, richText: richTextValidator };

  getDefaultProps(): PaperShape["props"] {
    return { w: PAPER_DEFAULT_WIDTH, h: PAPER_DEFAULT_HEIGHT, richText: toRichText("") };
  }

  override canEdit() {
    return true;
  }

  // tldraw's own double-click handling selects all the text when editing starts. Start
  // editing here instead, with the cursor where the user double-clicked. Returning a change
  // tells tldraw the double click was handled, so it skips its own path.
  override onDoubleClick(shape: PaperShape) {
    startEditingShapeWithRichText(this.editor, shape);
    placeCaretAtPointer(this.editor, shape.id);
    return { id: shape.id, type: PAPER_TYPE } as const;
  }

  // A click on a tick-box ticks it, without editing or selecting the paper. A click anywhere
  // else returns nothing, so tldraw selects the paper as usual.
  override onClick(shape: PaperShape) {
    const sheet = document.querySelector(`[data-paper-id="${shape.id}"]`);
    if (!sheet) return;

    const boxes = [...sheet.querySelectorAll<HTMLElement>('li[data-type="taskItem"] > label')].map(
      (el) => {
        const r = el.getBoundingClientRect();
        return { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
      },
    );

    // tldraw's pointer position is relative to the editor's container; the boxes are
    // measured in window coordinates.
    const container = this.editor.getContainer().getBoundingClientRect();
    const pointer = this.editor.inputs.getCurrentScreenPoint();
    const index = checkboxIndexAt(
      { x: pointer.x + container.left, y: pointer.y + container.top },
      boxes,
      3,
    );
    if (index < 0) return;

    return {
      id: shape.id,
      type: PAPER_TYPE,
      props: { richText: toggleTaskItem(shape.props.richText, index) },
    } as const;
  }

  // Only the frame changes on resize. The text is laid out at a fixed size, so it can
  // reflow or be clipped, but it can never scale.
  override onResize(shape: PaperShape, info: TLResizeInfo<PaperShape>) {
    return resizeBox(shape, info, { minWidth: PAPER_MIN_WIDTH, minHeight: PAPER_MIN_HEIGHT });
  }

  component(shape: PaperShape) {
    const isSelected = useValue(
      "paper selected",
      () => this.editor.getOnlySelectedShapeId() === shape.id,
      [this.editor, shape.id],
    );
    return (
      <HTMLContainer>
        <div
          className="paper"
          data-paper-id={shape.id}
          style={{ width: shape.props.w, height: shape.props.h }}
        >
          <RichTextLabel
            shapeId={shape.id}
            type={shape.type}
            richText={shape.props.richText}
            fontFamily={PAPER_FONT_FAMILY}
            fontSize={PAPER_FONT_SIZE_PX}
            lineHeight={PAPER_LINE_HEIGHT}
            textAlign="start"
            verticalAlign="start"
            wrap
            labelColor={PAPER_TEXT_COLOR}
            padding={PAPER_PADDING_PX}
            isSelected={isSelected}
          />
        </div>
      </HTMLContainer>
    );
  }

  getIndicatorPath(shape: PaperShape) {
    const path = new Path2D();
    path.rect(0, 0, shape.props.w, shape.props.h);
    return path;
  }
}
