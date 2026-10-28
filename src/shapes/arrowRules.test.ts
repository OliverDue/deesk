import { describe, it, expect } from "vitest";
import { arrowsToDelete, connectingArrowIds } from "./arrowRules";

describe("connectingArrowIds", () => {
  const content = new Set(["a", "b", "c"]);

  it("includes an arrow whose two ends are both bound inside the copied content", () => {
    expect(connectingArrowIds([{ id: "arrow1", targetIds: ["a", "b"] }], content)).toEqual(["arrow1"]);
  });

  it("includes an arrow with both ends on the same shape", () => {
    expect(connectingArrowIds([{ id: "arrow1", targetIds: ["a", "a"] }], content)).toEqual(["arrow1"]);
  });

  it("leaves out an arrow that is bound to something outside the content", () => {
    expect(connectingArrowIds([{ id: "arrow1", targetIds: ["a", "z"] }], content)).toEqual([]);
  });

  it("leaves out an arrow with a loose end, because it does not connect two things", () => {
    expect(connectingArrowIds([{ id: "arrow1", targetIds: ["a"] }], content)).toEqual([]);
    expect(connectingArrowIds([{ id: "arrow2", targetIds: [] }], content)).toEqual([]);
  });

  it("leaves out arrows that are already part of the content", () => {
    expect(
      connectingArrowIds([{ id: "arrow1", targetIds: ["a", "b"] }], new Set(["a", "b", "arrow1"])),
    ).toEqual([]);
  });

  it("returns every connecting arrow once", () => {
    const arrows = [
      { id: "arrow1", targetIds: ["a", "b"] },
      { id: "arrow2", targetIds: ["b", "c"] },
      { id: "arrow3", targetIds: ["a", "z"] },
    ];
    expect(connectingArrowIds(arrows, content)).toEqual(["arrow1", "arrow2"]);
  });
});

describe("arrowsToDelete", () => {
  it("deletes an arrow that has no anchor left", () => {
    expect(arrowsToDelete([{ arrowId: "arrow1", bindingsLeft: 0 }])).toEqual(["arrow1"]);
  });

  it("keeps an arrow that is still anchored at one end or both", () => {
    expect(
      arrowsToDelete([
        { arrowId: "arrow1", bindingsLeft: 1 },
        { arrowId: "arrow2", bindingsLeft: 2 },
      ]),
    ).toEqual([]);
  });

  it("lists each arrow once, even when it lost both anchors", () => {
    expect(
      arrowsToDelete([
        { arrowId: "arrow1", bindingsLeft: 0 },
        { arrowId: "arrow1", bindingsLeft: 0 },
      ]),
    ).toEqual(["arrow1"]);
  });
});
