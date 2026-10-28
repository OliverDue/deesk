import {
  defaultShapeUtils,
  DefaultStylePanel,
  DefaultStylePanelContent,
  DefaultToolbar,
  DefaultToolbarContent,
  TldrawUiMenuItem,
  useIsToolSelected,
  useTools,
  type TLComponents,
  StylePanelSection,
  type TLUiAssetUrlOverrides,
  type TLUiOverrides,
} from "tldraw";
import { ChecklistButton } from "../text/ChecklistControls";
import { PAPER_TOOL_ID, PaperTool } from "./paper/PaperTool";
import { PaperShapeUtil } from "./paper/PaperShapeUtil";

// Everything Deesk adds to tldraw is listed here. Later shapes are added to these lists.
export const shapeUtils = [PaperShapeUtil];

// The desk store is created outside the editor, so it must list tldraw's own shapes too,
// not only ours (tldraw merges the two itself only for the <Tldraw shapeUtils> prop).
export const storeShapeUtils = [...defaultShapeUtils, ...shapeUtils];
export const customTools = [PaperTool];

export const uiOverrides: TLUiOverrides = {
  tools(editor, tools) {
    tools[PAPER_TOOL_ID] = {
      id: PAPER_TOOL_ID,
      icon: "paper-icon",
      label: "Paper",
      kbd: "p",
      onSelect: () => editor.setCurrentTool(PAPER_TOOL_ID),
    };
    return tools;
  },
};

export const uiComponents: TLComponents = {
  // The tick-box button sits in the style panel (the white panel with the opacity slider),
  // in its own section under tldraw's own controls.
  StylePanel: (props) => (
    <DefaultStylePanel {...props}>
      <DefaultStylePanelContent />
      <StylePanelSection>
        <ChecklistButton />
      </StylePanelSection>
    </DefaultStylePanel>
  ),
  Toolbar: (props) => {
    const tools = useTools();
    const paperSelected = useIsToolSelected(tools[PAPER_TOOL_ID]);
    return (
      <DefaultToolbar {...props}>
        <TldrawUiMenuItem {...tools[PAPER_TOOL_ID]} isSelected={paperSelected} />
        <DefaultToolbarContent />
      </DefaultToolbar>
    );
  },
};

export const assetUrls: TLUiAssetUrlOverrides = {
  icons: { "paper-icon": "/paper-icon.svg", "checklist-icon": "/checklist-icon.svg" },
};
