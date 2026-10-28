import { TldrawUiButton, useEditor, useValue } from "tldraw";
import { STICKER_COLORS } from "./palette";
import { StickerColorStyle } from "./stickerTypes";

// A row of colour dots in the style panel. Shown while stickers are selected or the sticker
// tool is active. Sets the colour of the selected stickers and of the next one placed.
export function StickerColorPicker() {
  const editor = useEditor();
  const shared = useValue("stickerColor", () => editor.getSharedStyles().get(StickerColorStyle), [
    editor,
  ]);
  if (!shared) return null;
  const current = shared.type === "shared" ? shared.value : null;

  const choose = (key: (typeof STICKER_COLORS)[number]["key"]) => {
    editor.markHistoryStoppingPoint("sticker colour");
    editor.run(() => {
      if (editor.isIn("select")) editor.setStyleForSelectedShapes(StickerColorStyle, key);
      editor.setStyleForNextShapes(StickerColorStyle, key);
    });
  };

  return (
    <div data-sticker-colors style={{ display: "flex", gap: 2, padding: 4, pointerEvents: "all" }}>
      {STICKER_COLORS.map((c) => (
        <TldrawUiButton
          key={c.key}
          type="icon"
          title={`Sticker: ${c.key}`}
          aria-pressed={current === c.key}
          onClick={() => choose(c.key)}
        >
          <span
            style={{
              width: 18,
              height: 18,
              flexShrink: 0,
              borderRadius: "50%",
              background: c.fill,
              border: `2px solid ${c.rim}`,
              boxShadow: current === c.key ? "0 0 0 2px #2b2b2b" : "none",
            }}
          />
        </TldrawUiButton>
      ))}
    </div>
  );
}
