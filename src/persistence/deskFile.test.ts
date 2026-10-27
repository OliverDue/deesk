import { describe, it, expect } from "vitest";
import { serializeDesk, parseDesk } from "./deskFile";

describe("deskFile", () => {
  it("round-trips a document", () => {
    const doc = { store: { a: 1 }, schema: { v: 2 } };
    const result = parseDesk(serializeDesk(doc));
    expect(result).toEqual({ ok: true, document: doc });
  });

  it("rejects text that is not JSON", () => {
    expect(parseDesk("garbage {")).toEqual({ ok: false, reason: "invalid" });
  });

  it("rejects an empty file", () => {
    expect(parseDesk("")).toEqual({ ok: false, reason: "invalid" });
  });

  it("rejects JSON without a document", () => {
    expect(parseDesk(JSON.stringify({ version: 1 }))).toEqual({ ok: false, reason: "invalid" });
  });

  it("rejects a version it does not know", () => {
    const text = JSON.stringify({ version: 99, document: {} });
    expect(parseDesk(text)).toEqual({ ok: false, reason: "unsupported-version" });
  });
});
