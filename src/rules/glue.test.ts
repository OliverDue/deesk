import { describe, expect, it } from "vitest";
import { guardGlued, isGlued, nextGlueValue, withoutGlue, type GlueShape } from "./glue";

function shape(over: Partial<GlueShape> & { glued?: boolean } = {}): GlueShape {
  const { glued, ...rest } = over;
  return {
    x: 10,
    y: 20,
    rotation: 0,
    props: { w: 300, h: 380, richText: "a" },
    meta: glued ? { glued: true } : {},
    ...rest,
  };
}

describe("isGlued", () => {
  it("is true only when the flag is set to true", () => {
    expect(isGlued(shape({ glued: true }))).toBe(true);
    expect(isGlued(shape())).toBe(false);
    expect(isGlued(shape({ meta: { glued: "yes" } }))).toBe(false);
  });
});

describe("guardGlued", () => {
  it("returns the update untouched for a paper that is not glued", () => {
    const next = shape({ x: 99, rotation: 1, props: { w: 500, h: 500, richText: "a" } });
    expect(guardGlued(shape(), next)).toBe(next);
  });

  it("reverts position, rotation and size of a glued paper", () => {
    const prev = shape({ glued: true });
    const next = shape({
      glued: true,
      x: 99,
      y: 98,
      rotation: 1,
      props: { w: 500, h: 600, richText: "a" },
    });
    const out = guardGlued(prev, next);
    expect([out.x, out.y, out.rotation, out.props.w, out.props.h]).toEqual([10, 20, 0, 300, 380]);
  });

  it("lets the text and other props of a glued paper change", () => {
    const prev = shape({ glued: true });
    const next = shape({ glued: true, x: 99, props: { w: 300, h: 380, richText: "b" } });
    const out = guardGlued(prev, next);
    expect(out.props.richText).toBe("b");
    expect(out.x).toBe(10);
  });

  it("lets the paper be unglued, and moved in the same update", () => {
    const prev = shape({ glued: true });
    const next = shape({ x: 99 });
    expect(guardGlued(prev, next)).toBe(next);
  });
});

describe("nextGlueValue", () => {
  it("glues when any selected paper is not glued", () => {
    expect(nextGlueValue([shape({ glued: true }), shape()])).toBe(true);
    expect(nextGlueValue([shape()])).toBe(true);
  });

  it("unglues when every selected paper is glued", () => {
    expect(nextGlueValue([shape({ glued: true }), shape({ glued: true })])).toBe(false);
  });

  it("is false for an empty list", () => {
    expect(nextGlueValue([])).toBe(false);
  });
});

describe("withoutGlue", () => {
  it("removes the flag and keeps the rest of the meta", () => {
    const out = withoutGlue({ ...shape(), meta: { glued: true, other: 1 } });
    expect(out.meta).toEqual({ other: 1 });
  });

  it("returns the same shape when there is no glue", () => {
    const s = shape();
    expect(withoutGlue(s)).toBe(s);
  });
});
