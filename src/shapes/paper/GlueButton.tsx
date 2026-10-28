import { TldrawUiButton, TldrawUiButtonIcon, useEditor, useValue } from "tldraw";
import { isGlued } from "../../rules/glue";
import { toggleGlue } from "./glueAction";
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
    toggleGlue(editor, papers);
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
