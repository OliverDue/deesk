import { useEffect } from "react";
import { defaultHandleExternalTldrawContent, useEditor } from "tldraw";
import { createPasteCounter, pasteOffset } from "./pasteOffset";

// tldraw pastes a copy exactly on top of the original when the original is on screen,
// which makes it easy to paste a copy without noticing. Move what was just pasted down
// and to the right instead, a little further for each further paste of the same copy.
export function PasteOffset(): null {
  const editor = useEditor();

  useEffect(() => {
    const counter = createPasteCounter();

    editor.registerExternalContentHandler("tldraw", async (external) => {
      const before = new Set(editor.getSelectedShapeIds());
      await defaultHandleExternalTldrawContent(editor, external);

      // An explicit paste position (for example at the pointer) is left as it is.
      if (external.point) return;

      // Only move shapes this paste created. When the paste leaves the selection alone,
      // for example in the middle of a drag, nothing new is selected and nothing moves.
      const pasted = editor.getSelectedShapes().filter((shape) => !before.has(shape.id));
      if (pasted.length === 0) return;

      const { x, y } = pasteOffset(counter.next(external.content.rootShapeIds.join(",")));
      editor.updateShapes(
        pasted.map((shape) => ({ id: shape.id, type: shape.type, x: shape.x + x, y: shape.y + y })),
      );
    });
  }, [editor]);

  return null;
}
