import type { Editor, TLShape } from "tldraw";
import { nextGlueValue } from "../../rules/glue";
import { PAPER_TYPE } from "./paperTypes";

// What the Glue button does to the selected papers: glue or unglue them all (see
// nextGlueValue). Gluing also sends them to the back, so a glued paper is the desk's floor.
export function toggleGlue(editor: Editor, papers: TLShape[]) {
  const glued = nextGlueValue(papers);
  editor.markHistoryStoppingPoint("glue");
  editor.run(() => {
    editor.updateShapes(
      papers.map((p) => ({ id: p.id, type: PAPER_TYPE, meta: { ...p.meta, glued } })),
    );
    if (glued) editor.sendToBack(papers.map((p) => p.id));
  });
}
