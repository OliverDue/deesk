import type { TLShape } from "tldraw";

export const PAPER_TYPE = "paper";

declare module "tldraw" {
  export interface TLGlobalShapePropsMap {
    [PAPER_TYPE]: { w: number; h: number };
  }
}

export type PaperShape = TLShape<typeof PAPER_TYPE>;

export const PAPER_DEFAULT_WIDTH = 300;
export const PAPER_DEFAULT_HEIGHT = 380;
export const PAPER_MIN_WIDTH = 120;
export const PAPER_MIN_HEIGHT = 120;
export const PAPER_FONT_SIZE_PX = 16;
