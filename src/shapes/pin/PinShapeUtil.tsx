import { Circle2d, SVGContainer, ShapeUtil } from "tldraw";
import { PIN_DIAMETER, PIN_RED, PIN_RIM, PIN_TYPE, type PinShape } from "./pinTypes";

// A red push-pin seen from above. Fixed size. Moving it re-pins (see pinSync).
export class PinShapeUtil extends ShapeUtil<PinShape> {
  static override type = PIN_TYPE;
  static override props = {};

  getDefaultProps(): PinShape["props"] {
    return {};
  }

  override canResize() {
    return false;
  }

  override canEdit() {
    return false;
  }

  getGeometry() {
    return new Circle2d({ radius: PIN_DIAMETER / 2, isFilled: true });
  }

  component() {
    const r = PIN_DIAMETER / 2;
    return (
      <SVGContainer>
        <circle cx={r + 1} cy={r + 2} r={r - 2} fill="rgba(0,0,0,0.25)" />
        <circle cx={r} cy={r} r={r - 2} fill={PIN_RED} stroke={PIN_RIM} strokeWidth={2} />
        <circle cx={r - 3} cy={r - 3} r={3} fill="rgba(255,255,255,0.55)" />
      </SVGContainer>
    );
  }

  override getIndicatorPath(): Path2D {
    const r = PIN_DIAMETER / 2;
    const path = new Path2D();
    path.arc(r, r, r, 0, Math.PI * 2);
    return path;
  }
}
