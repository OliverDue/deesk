import type { TLRichText, TLShape } from "tldraw";

export const PAPER_TYPE = "paper";

declare module "tldraw" {
  export interface TLGlobalShapePropsMap {
    [PAPER_TYPE]: { w: number; h: number; richText: TLRichText };
  }
}

export type PaperShape = TLShape<typeof PAPER_TYPE>;

export const PAPER_DEFAULT_WIDTH = 300;
export const PAPER_DEFAULT_HEIGHT = 380;
export const PAPER_MIN_WIDTH = 120;
export const PAPER_MIN_HEIGHT = 120;
export const PAPER_FONT_SIZE_PX = 16;
export const PAPER_LINE_HEIGHT = 1.5;
export const PAPER_PADDING_PX = 16;
export const PAPER_TEXT_COLOR = "#2b2b2b";
export const PAPER_FONT_FAMILY = "system-ui, sans-serif";
