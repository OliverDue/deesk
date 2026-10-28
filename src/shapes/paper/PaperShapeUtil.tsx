import {
  BaseBoxShapeUtil,
  HTMLContainer,
  resizeBox,
  RichTextLabel,
  richTextValidator,
  T,
  toRichText,
  useValue,
  type TLResizeInfo,
} from "tldraw";
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
        <div className="paper" style={{ width: shape.props.w, height: shape.props.h }}>
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
