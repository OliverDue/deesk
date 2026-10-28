import { TaskItem, TaskList, getTipTapDefaultExtensions } from "tldraw";

// tldraw's TipTap defaults (headers with the "# " markdown rule, bold with Cmd+B, italic,
// lists, links), without Typography so characters stay exactly as typed, plus tick-boxes
// (Tab nests them; the app's button and Cmd+Shift+9 add them).
export const deeskExtensions = [
  ...getTipTapDefaultExtensions().filter((e) => e.name !== "typography"),
  TaskList,
  TaskItem.configure({ nested: true }),
];
