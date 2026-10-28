import { BaseBoxShapeUtil, HTMLContainer, resizeBox, T, type TLResizeInfo } from "tldraw";
import {
  PAPER_DEFAULT_HEIGHT,
  PAPER_DEFAULT_WIDTH,
  PAPER_MIN_HEIGHT,
  PAPER_MIN_WIDTH,
  PAPER_TYPE,
  type PaperShape,
} from "./paperTypes";

export class PaperShapeUtil extends BaseBoxShapeUtil<PaperShape> {
  static override type = PAPER_TYPE;
  static override props = { w: T.number, h: T.number };

  getDefaultProps(): PaperShape["props"] {
    return { w: PAPER_DEFAULT_WIDTH, h: PAPER_DEFAULT_HEIGHT };
  }

  // Only the frame changes on resize. Text is plain HTML at a fixed size, so it can
  // reflow or be clipped, but it can never scale.
  override onResize(shape: PaperShape, info: TLResizeInfo<PaperShape>) {
    return resizeBox(shape, info, { minWidth: PAPER_MIN_WIDTH, minHeight: PAPER_MIN_HEIGHT });
  }

  component(shape: PaperShape) {
    return (
      <HTMLContainer>
        <div className="paper" style={{ width: shape.props.w, height: shape.props.h }}>
          <p className="paper-text">Resize me. This text keeps its size.</p>
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
