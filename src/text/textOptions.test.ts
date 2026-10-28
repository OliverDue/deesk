import { describe, it, expect } from "vitest";
import { getSchema } from "tldraw";
import { deeskExtensions } from "./textOptions";

describe("deeskExtensions", () => {
  // Headers and bold live inside TipTap's bundled "starterKit" extension, so check the
  // schema the extensions really produce, not the extension names.
  const schema = getSchema(deeskExtensions);

  it("lets a line be a header (the '# ' markdown rule lives on this node)", () => {
    expect(schema.nodes.heading).toBeDefined();
  });

  it("lets text be bold (Cmd+B)", () => {
    expect(schema.marks.bold).toBeDefined();
  });

  it("leaves typed characters exactly as typed", () => {
    expect(deeskExtensions.map((e) => e.name)).not.toContain("typography");
  });
});
