import {
  DefaultToolbar,
  DefaultToolbarContent,
  TldrawUiMenuItem,
  useIsToolSelected,
  useTools,
  type TLComponents,
  type TLUiAssetUrlOverrides,
  type TLUiOverrides,
} from "tldraw";
import { PAPER_TOOL_ID, PaperTool } from "./paper/PaperTool";
import { PaperShapeUtil } from "./paper/PaperShapeUtil";

// Everything Deesk adds to tldraw is listed here. Later shapes are added to these lists.
export const shapeUtils = [PaperShapeUtil];
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
  icons: { "paper-icon": "/paper-icon.svg" },
};
