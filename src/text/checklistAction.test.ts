import { describe, it, expect } from "vitest";
import { chooseChecklistAction, isChecklistShortcut, type ShortcutKey } from "./checklistAction";

describe("chooseChecklistAction", () => {
  it("toggles the current line while a paper is being edited", () => {
    expect(
      chooseChecklistAction({ editingShapeId: "shape:a", editingIsPaper: true, onlySelectedPaperId: "shape:a" }),
    ).toEqual({ kind: "toggle-line" });
  });

  it("does nothing while something that is not a paper is being edited", () => {
    expect(
      chooseChecklistAction({ editingShapeId: "shape:t", editingIsPaper: false, onlySelectedPaperId: null }),
    ).toEqual({ kind: "none" });
  });

  it("does nothing while a paper is only selected, until it is being written in", () => {
    expect(
      chooseChecklistAction({ editingShapeId: null, editingIsPaper: false, onlySelectedPaperId: "shape:a" }),
    ).toEqual({ kind: "none" });
  });

  it("makes a new paper when no paper is selected", () => {
    expect(
      chooseChecklistAction({ editingShapeId: null, editingIsPaper: false, onlySelectedPaperId: null }),
    ).toEqual({ kind: "new-paper" });
  });

  it("prefers the paper being edited over the selection", () => {
    expect(
      chooseChecklistAction({ editingShapeId: "shape:a", editingIsPaper: true, onlySelectedPaperId: "shape:b" }),
    ).toEqual({ kind: "toggle-line" });
  });
});

describe("isChecklistShortcut", () => {
  const key = (extra: Partial<ShortcutKey> = {}): ShortcutKey => ({
    code: "Digit9",
    metaKey: true,
    ctrlKey: false,
    altKey: false,
    shiftKey: true,
    ...extra,
  });

  it("is Cmd+Shift+9, found by the physical key so any keyboard layout works", () => {
    expect(isChecklistShortcut(key())).toBe(true);
  });

  it("also accepts Ctrl+Shift+9", () => {
    expect(isChecklistShortcut(key({ metaKey: false, ctrlKey: true }))).toBe(true);
  });

  it("needs Shift and Cmd or Ctrl", () => {
    expect(isChecklistShortcut(key({ shiftKey: false }))).toBe(false);
    expect(isChecklistShortcut(key({ metaKey: false }))).toBe(false);
  });

  it("ignores other keys and Alt combinations", () => {
    expect(isChecklistShortcut(key({ code: "Digit8" }))).toBe(false);
    expect(isChecklistShortcut(key({ altKey: true }))).toBe(false);
    expect(isChecklistShortcut(key({ isComposing: true }))).toBe(false);
  });
});
