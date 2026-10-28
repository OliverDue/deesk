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
  Vec,
  type TLDragShapesOutInfo,
  type TLResizeInfo,
  type TLShape,
} from "tldraw";
import { guardFixed, guardGlued, isGlued, withoutGlue } from "../../rules/glue";
import { PIN_BINDING } from "../pin/pinTypes";
import { placeCaretAtPointer } from "../../text/placeCaret";
import { checkboxIndexAt, toggleTaskItem } from "../../text/taskItems";
import { paperAccepts, paperClipRect, paperClips, paperKeepsInside } from "./paperContainer";
import { boundsInParent, clampToSheet, contentMinSize } from "./paperMinSize";
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

  // A paper with a pin on it is fixed, like a glued one.
  private isPinned(shape: PaperShape) {
    return this.editor.getBindingsToShape(shape, PIN_BINDING).length > 0;
  }

  // Glue and pins: where such a paper is and how big it is cannot change, from any source.
  override onBeforeUpdate(prev: PaperShape, next: PaperShape) {
    return this.isPinned(prev) ? guardFixed(prev, next, true) : guardGlued(prev, next);
  }

  // A copy (paste, duplicate) of a glued paper starts unglued.
  override onBeforeCreate(next: PaperShape) {
    return withoutGlue(next);
  }

  override canResize(shape: PaperShape) {
    return !isGlued(shape) && !this.isPinned(shape);
  }

  override hideRotateHandle(shape: PaperShape) {
    return isGlued(shape) || this.isPinned(shape);
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

  // The paper is a container for figures: boxes, lines, drawings and so on. tldraw makes a
  // new shape drawn on the paper its child once this says yes.
  override canReceiveNewChildrenOfType(shape: PaperShape, type: TLShape["type"]) {
    return paperAccepts(type, shape.isLocked);
  }

  override canRemoveChildrenOfType(shape: PaperShape, _type: TLShape["type"]) {
    return !shape.isLocked;
  }

  // Resizing the paper changes only the sheet. Figures keep their size and their place
  // relative to its top-left corner, like the text, and are clipped at the new edge.
  override canResizeChildren() {
    return false;
  }

  override getClipPath(shape: PaperShape) {
    return paperClipRect(shape.props.w, shape.props.h).map(({ x, y }) => new Vec(x, y));
  }

  override shouldClipChild(child: TLShape) {
    return paperClips(child.type);
  }

  // Dragging a shape onto the paper makes it a figure on it.
  override onDragShapesIn(shape: PaperShape, draggingShapes: TLShape[]) {
    const incoming = draggingShapes.filter(
      (s) => paperAccepts(s.type, shape.isLocked) && s.parentId !== shape.id,
    );
    if (incoming.length === 0) return;
    // A shape that contains this paper (for example a group) cannot become its child.
    if (incoming.some((s) => this.editor.hasAncestor(shape, s.id))) return;
    this.editor.reparentShapes(incoming, shape.id);
  }

  // Dragging a figure off the paper makes it a desk shape again, unless it is being dragged
  // straight onto another container.
  override onDragShapesOut(
    shape: PaperShape,
    draggingShapes: TLShape[],
    info: TLDragShapesOutInfo,
  ) {
    if (info.nextDraggingOverShapeId) return;
    const leaving = draggingShapes.filter((s) => s.parentId === shape.id);
    if (leaving.length === 0) return;
    this.editor.reparentShapes(leaving, this.editor.getCurrentPageId());
  }

  // Only the frame changes on resize. The text is laid out at a fixed size, so it can
  // reflow or be clipped, but it can never scale.
  override onResize(shape: PaperShape, info: TLResizeInfo<PaperShape>) {
    // A paper cannot be made smaller than its figures: it stops at the farthest right and
    // bottom edge of the figures that would otherwise be cut off.
    const figures = this.editor
      .getSortedChildIdsForParent(shape.id)
      .map((id) => this.editor.getShape(id))
      .filter((child): child is TLShape => !!child && paperKeepsInside(child.type))
      .map((child) => {
        const b = this.editor.getShapeGeometry(child).bounds;
        const inParent = boundsInParent(
          { x: b.x, y: b.y, w: b.w, h: b.h },
          { x: child.x, y: child.y, rotation: child.rotation },
        );
        // A figure that may overhang (a sticker) asks only for the part already on the sheet.
        return paperClips(child.type) ? inParent : clampToSheet(inParent, shape.props);
      });
    const min = contentMinSize(figures, { w: PAPER_MIN_WIDTH, h: PAPER_MIN_HEIGHT });
    return resizeBox(shape, info, { minWidth: min.w, minHeight: min.h });
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
        {isGlued(shape) && <div className="paper-tape" />}
      </HTMLContainer>
    );
  }

  getIndicatorPath(shape: PaperShape) {
    const path = new Path2D();
    path.rect(0, 0, shape.props.w, shape.props.h);
    return path;
  }
}
