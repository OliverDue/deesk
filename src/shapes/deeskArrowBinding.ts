import { ArrowBindingUtil, type TLShapeId } from "tldraw";

type HookName = "onAfterCreate" | "onAfterChange" | "onAfterChangeFromShape" | "onAfterChangeToShape";
type Options<K extends HookName> = Parameters<NonNullable<ArrowBindingUtil[K]>>[0];

// tldraw keeps an arrow stacked directly above the highest shape it is anchored to, and applies
// that rule again every time an anchor is created or changes, undo included. When an arrow has
// lost an anchor, that drops it behind taller shapes that it used to be in front of. This
// version never lets that rule lower an arrow: it may still raise one that is too low.
export class DeeskArrowBindingUtil extends ArrowBindingUtil {
  private keepHeight(arrowId: TLShapeId, run: () => void) {
    const before = this.editor.getShape(arrowId);
    run();
    const after = this.editor.getShape(arrowId);
    if (before && after && before.parentId === after.parentId && after.index < before.index) {
      this.editor.updateShapes([{ id: arrowId, type: "arrow", index: before.index }]);
    }
  }

  override onAfterCreate(options: Options<"onAfterCreate">) {
    this.keepHeight(options.binding.fromId, () => super.onAfterCreate(options));
  }

  override onAfterChange(options: Options<"onAfterChange">) {
    this.keepHeight(options.bindingAfter.fromId, () => super.onAfterChange(options));
  }

  override onAfterChangeFromShape(options: Options<"onAfterChangeFromShape">) {
    this.keepHeight(options.shapeAfter.id, () => super.onAfterChangeFromShape(options));
  }

  override onAfterChangeToShape(options: Options<"onAfterChangeToShape">) {
    this.keepHeight(options.binding.fromId, () => super.onAfterChangeToShape(options));
  }
}
