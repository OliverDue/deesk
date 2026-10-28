import { describe, it, expect } from "vitest";
import { toRichText } from "tldraw";
import { paperPlacement } from "./paperPlacement";
import {
  PAPER_DEFAULT_HEIGHT,
  PAPER_DEFAULT_WIDTH,
  PAPER_MIN_HEIGHT,
  PAPER_MIN_WIDTH,
} from "./paperTypes";
import { PaperShapeUtil } from "./PaperShapeUtil";

describe("paperPlacement", () => {
  it("centres a new paper on the click point", () => {
    expect(paperPlacement({ x: 500, y: 400 })).toEqual({
      x: 500 - PAPER_DEFAULT_WIDTH / 2,
      y: 400 - PAPER_DEFAULT_HEIGHT / 2,
    });
  });

  it("works at negative page coordinates", () => {
    expect(paperPlacement({ x: -1000, y: -2000 })).toEqual({
      x: -1000 - PAPER_DEFAULT_WIDTH / 2,
      y: -2000 - PAPER_DEFAULT_HEIGHT / 2,
    });
  });
});

describe("paper size rules", () => {
  it("has a minimum size below the default size", () => {
    expect(PAPER_MIN_WIDTH).toBeLessThan(PAPER_DEFAULT_WIDTH);
    expect(PAPER_MIN_HEIGHT).toBeLessThan(PAPER_DEFAULT_HEIGHT);
  });
});

describe("PaperShapeUtil", () => {
  it("stores only a size and the text, so resizing can never scale text", () => {
    expect(Object.keys(PaperShapeUtil.props).sort()).toEqual(["h", "richText", "w"]);
  });

  it("starts at the default size", () => {
    const util = new (PaperShapeUtil as never as new (editor: unknown) => PaperShapeUtil)({});
    expect(util.getDefaultProps()).toEqual({
      w: PAPER_DEFAULT_WIDTH,
      h: PAPER_DEFAULT_HEIGHT,
      richText: toRichText(""),
    });
  });
});
