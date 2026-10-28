import { describe, it, expect } from "vitest";
import { createTLStore } from "tldraw";
import { bindingUtils, storeShapeUtils } from "./registry";

// The desk store is built outside the editor, so it must list tldraw's own shapes as
// well as Deesk's. Listing only Deesk's makes tldraw fail with
// "Migration 'com.tldraw.binding.arrow/1' depends on missing migration ...".
describe("desk store schema", () => {
  const build = () =>
    createTLStore({ shapeUtils: storeShapeUtils, bindingUtils });

  it("can be created", () => {
    expect(build).not.toThrow();
  });

  it("knows both tldraw's own shapes and Deesk's paper", () => {
    const sequences = Object.keys(build().schema.serialize().sequences);
    expect(sequences).toContain("com.tldraw.shape.arrow");
    expect(sequences).toContain("com.tldraw.shape.geo");
    expect(sequences).toContain("com.tldraw.shape.paper");
  });

  it("round-trips a snapshot", () => {
    const snapshot = build().getStoreSnapshot("document");
    expect(() => build().loadStoreSnapshot(snapshot)).not.toThrow();
  });
});
