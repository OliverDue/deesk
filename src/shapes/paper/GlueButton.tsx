import { TldrawUiButton, TldrawUiButtonIcon, useEditor, useValue } from "tldraw";
import { isGlued, nextGlueValue } from "../../rules/glue";
import { PAPER_TYPE } from "./paperTypes";

// Glues or unglues the selected papers. Shown only while a paper is selected.
export function GlueButton() {
  const editor = useEditor();
  const state = useValue(
    "glue state",
    () => {
      const papers = editor.getSelectedShapes().filter((s) => s.type === PAPER_TYPE);
      if (papers.length === 0) return null;
      return { allGlued: papers.every(isGlued) };
    },
    [editor],
  );
  if (!state) return null;

  const toggle = () => {
    const papers = editor.getSelectedShapes().filter((s) => s.type === PAPER_TYPE);
    const glued = nextGlueValue(papers);
    editor.markHistoryStoppingPoint("glue");
    editor.updateShapes(
      papers.map((p) => ({ id: p.id, type: PAPER_TYPE, meta: { ...p.meta, glued } })),
    );
  };

  return (
    <div style={{ pointerEvents: "all" }}>
      <TldrawUiButton
        type="icon"
        title={state.allGlued ? "Unglue the paper" : "Glue the paper in place"}
        aria-pressed={state.allGlued}
        onClick={toggle}
      >
        <TldrawUiButtonIcon icon="glue-icon" />
      </TldrawUiButton>
    </div>
  );
}
