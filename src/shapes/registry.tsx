import {
  defaultShapeUtils,
  DefaultStylePanel,
  DefaultStylePanelContent,
  DefaultToolbar,
  ArrowDownToolbarItem,
  ArrowLeftToolbarItem,
  ArrowRightToolbarItem,
  ArrowToolbarItem,
  ArrowUpToolbarItem,
  AssetToolbarItem,
  CheckBoxToolbarItem,
  CloudToolbarItem,
  DiamondToolbarItem,
  DrawToolbarItem,
  EllipseToolbarItem,
  EraserToolbarItem,
  FrameToolbarItem,
  HeartToolbarItem,
  HexagonToolbarItem,
  HighlightToolbarItem,
  LaserToolbarItem,
  LineToolbarItem,
  NoteToolbarItem,
  OvalToolbarItem,
  RectangleToolbarItem,
  RhombusToolbarItem,
  SelectToolbarItem,
  StarToolbarItem,
  TextToolbarItem,
  TriangleToolbarItem,
  XBoxToolbarItem,
  TldrawUiMenuItem,
  useEditor,
  useIsToolSelected,
  useValue,
  useTools,
  type TLComponents,
  StylePanelSection,
  type TLUiAssetUrlOverrides,
  type TLUiOverrides,
} from "tldraw";
import { ChecklistButton } from "../text/ChecklistControls";
import { DeeskArrowBindingUtil } from "./deeskArrowBinding";
import { GlueButton } from "./paper/GlueButton";
import { PAPER_TOOL_ID, PaperTool } from "./paper/PaperTool";
import { PaperShapeUtil } from "./paper/PaperShapeUtil";
import { PinBindingUtil } from "./pin/PinBindingUtil";
import { PinShapeUtil } from "./pin/PinShapeUtil";
import { PIN_TOOL_ID, PinTool } from "./pin/PinTool";
import { StickerColorStyle } from "./sticker/stickerTypes";
import { StickerColorPicker } from "./sticker/StickerColorPicker";
import { StickerShapeUtil } from "./sticker/StickerShapeUtil";
import { STICKER_TOOL_ID, StickerTool } from "./sticker/StickerTool";

// Everything Deesk adds to tldraw is listed here. Later shapes are added to these lists.
export const shapeUtils = [PaperShapeUtil, StickerShapeUtil, PinShapeUtil];

// The desk store is created outside the editor, so it must list tldraw's own shapes too,
// not only ours (tldraw merges the two itself only for the <Tldraw shapeUtils> prop).
export const storeShapeUtils = [...defaultShapeUtils, ...shapeUtils];
export const customTools = [PaperTool, StickerTool, PinTool];

// Replaces tldraw's own arrow binding (same type), both in the editor and in the store.
export const bindingUtils = [DeeskArrowBindingUtil, PinBindingUtil];

// The tick-box and glue buttons are for papers; they have no place in the sticker colour menu.
function PaperButtonsUnlessSticker() {
  const editor = useEditor();
  const stickerStyles = useValue(
    "hasStickerStyle",
    () => editor.getSharedStyles().get(StickerColorStyle) !== undefined,
    [editor],
  );
  return stickerStyles ? null : (
    <div style={{ display: "flex" }}>
      <ChecklistButton />
      <GlueButton />
    </div>
  );
}

export const uiOverrides: TLUiOverrides = {
  tools(editor, tools) {
    tools[PAPER_TOOL_ID] = {
      id: PAPER_TOOL_ID,
      icon: "paper-icon",
      label: "Paper",
      kbd: "p",
      onSelect: () => editor.setCurrentTool(PAPER_TOOL_ID),
    };
    tools[STICKER_TOOL_ID] = {
      id: STICKER_TOOL_ID,
      icon: "sticker-icon",
      label: "Sticker",
      kbd: "s",
      onSelect: () => editor.setCurrentTool(STICKER_TOOL_ID),
    };
    tools[PIN_TOOL_ID] = {
      id: PIN_TOOL_ID,
      icon: "pin-icon",
      label: "Pin",
      kbd: "i",
      onSelect: () => editor.setCurrentTool(PIN_TOOL_ID),
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
        <StickerColorPicker />
        <PaperButtonsUnlessSticker />
      </StylePanelSection>
    </DefaultStylePanel>
  ),
  // Select first, then our two tools, then tldraw's own, without the hand tool (the hand is
  // still available by holding space).
  Toolbar: (props) => {
    const tools = useTools();
    const paperSelected = useIsToolSelected(tools[PAPER_TOOL_ID]);
    const stickerSelected = useIsToolSelected(tools[STICKER_TOOL_ID]);
    const pinSelected = useIsToolSelected(tools[PIN_TOOL_ID]);
    return (
      <DefaultToolbar {...props}>
        <SelectToolbarItem />
        <TldrawUiMenuItem {...tools[PAPER_TOOL_ID]} isSelected={paperSelected} />
        <TldrawUiMenuItem {...tools[STICKER_TOOL_ID]} isSelected={stickerSelected} />
        <TldrawUiMenuItem {...tools[PIN_TOOL_ID]} isSelected={pinSelected} />
        <DrawToolbarItem />
        <EraserToolbarItem />
        <ArrowToolbarItem />
        <TextToolbarItem />
        <NoteToolbarItem />
        <AssetToolbarItem />
        <RectangleToolbarItem />
        <EllipseToolbarItem />
        <TriangleToolbarItem />
        <DiamondToolbarItem />
        <HexagonToolbarItem />
        <OvalToolbarItem />
        <RhombusToolbarItem />
        <StarToolbarItem />
        <CloudToolbarItem />
        <HeartToolbarItem />
        <XBoxToolbarItem />
        <CheckBoxToolbarItem />
        <ArrowLeftToolbarItem />
        <ArrowUpToolbarItem />
        <ArrowDownToolbarItem />
        <ArrowRightToolbarItem />
        <LineToolbarItem />
        <HighlightToolbarItem />
        <LaserToolbarItem />
        <FrameToolbarItem />
      </DefaultToolbar>
    );
  },
};

export const assetUrls: TLUiAssetUrlOverrides = {
  icons: { "paper-icon": "/paper-icon.svg", "checklist-icon": "/checklist-icon.svg",
    "sticker-icon": "/sticker-icon.svg",
    "glue-icon": "/glue-icon.svg",
    "pin-icon": "/pin-icon.svg",
  },
};
