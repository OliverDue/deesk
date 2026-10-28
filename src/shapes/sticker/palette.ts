export const STICKER_COLORS = [
  { key: "green", fill: "#3fae5a", rim: "#237a3b" },
  { key: "yellow", fill: "#f5d90a", rim: "#a8920a" },
  { key: "red", fill: "#e5484d", rim: "#a82a2f" },
  { key: "orange", fill: "#f5922b", rim: "#b0640f" },
  { key: "blue", fill: "#3b82e0", rim: "#245aa6" },
  { key: "purple", fill: "#8e5bd6", rim: "#6137a0" },
] as const;

export type StickerColorKey = (typeof STICKER_COLORS)[number]["key"];

export const STICKER_COLOR_KEYS = STICKER_COLORS.map((c) => c.key) as readonly StickerColorKey[];
export const STICKER_DEFAULT_COLOR: StickerColorKey = "green";

export function stickerColor(key: string) {
  const find = (k: string) => STICKER_COLORS.find((c) => c.key === k);
  return find(key) ?? find(STICKER_DEFAULT_COLOR)!;
}
