import { StyleProp, type TLShape } from "tldraw";
import { STICKER_COLOR_KEYS, STICKER_DEFAULT_COLOR, type StickerColorKey } from "./palette";

export const STICKER_TYPE = "sticker";
export const STICKER_DIAMETER = 28;

// A tldraw style, so the style panel's choice reaches both the selected stickers and the
// next one placed, the same way tldraw's own colour does.
export const StickerColorStyle = StyleProp.defineEnum("deesk:stickerColor", {
  defaultValue: STICKER_DEFAULT_COLOR,
  values: STICKER_COLOR_KEYS,
});

declare module "tldraw" {
  export interface TLGlobalShapePropsMap {
    [STICKER_TYPE]: { color: StickerColorKey };
  }
}

export type StickerShape = TLShape<typeof STICKER_TYPE>;
