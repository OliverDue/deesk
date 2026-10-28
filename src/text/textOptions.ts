import { getTipTapDefaultExtensions } from "tldraw";

// tldraw's TipTap defaults (headers with the "# " markdown rule, bold with Cmd+B,
// italic, lists, links), without Typography so characters stay exactly as typed.
// Task 9 adds the checklist extensions here.
export const deeskExtensions = getTipTapDefaultExtensions().filter(
  (e) => e.name !== "typography",
);
