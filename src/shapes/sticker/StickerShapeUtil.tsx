import { Circle2d, SVGContainer, ShapeUtil } from "tldraw";
import { stickerColor } from "./palette";
import { STICKER_DIAMETER, STICKER_TYPE, StickerColorStyle, type StickerShape } from "./stickerTypes";

// A small coloured circle. Fixed size; the colour comes from the palette.
export class StickerShapeUtil extends ShapeUtil<StickerShape> {
  static override type = STICKER_TYPE;
  static override props = { color: StickerColorStyle };

  getDefaultProps(): StickerShape["props"] {
    return { color: StickerColorStyle.defaultValue };
  }

  override canResize() {
    return false;
  }

  override canEdit() {
    return false;
  }

  getGeometry() {
    return new Circle2d({ radius: STICKER_DIAMETER / 2, isFilled: true });
  }

  component(shape: StickerShape) {
    const { fill, rim } = stickerColor(shape.props.color);
    const r = STICKER_DIAMETER / 2;
    return (
      <SVGContainer>
        <circle cx={r} cy={r} r={r - 1} fill={fill} stroke={rim} strokeWidth={2} />
      </SVGContainer>
    );
  }

  override getIndicatorPath(): Path2D {
    const r = STICKER_DIAMETER / 2;
    const path = new Path2D();
    path.arc(r, r, r, 0, Math.PI * 2);
    return path;
  }
}
