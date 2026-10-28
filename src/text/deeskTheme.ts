import { DEFAULT_THEME, type TLTheme } from "tldraw";
import { PAPER_FONT_FAMILY } from "../shapes/paper/paperTypes";

// tldraw's own fonts (a hand-drawn one, and IBM Plex) are downloaded. Replace them all with
// system fonts, and use the same one as the text on papers for both "draw" and "sans", so
// text in boxes and text on papers looks the same, existing boxes included. A font with no
// font files to load is one that is already on the computer.
export const deeskTheme: TLTheme = {
  ...DEFAULT_THEME,
  fonts: {
    ...DEFAULT_THEME.fonts,
    draw: { fontFamily: PAPER_FONT_FAMILY },
    sans: { fontFamily: PAPER_FONT_FAMILY },
    serif: { fontFamily: "ui-serif, Georgia, serif" },
    mono: { fontFamily: "ui-monospace, Menlo, monospace" },
  },
};
