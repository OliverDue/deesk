# Deesk Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Deesk, a fully local native desktop app: an infinite "table" canvas holding movable checklist/text papers, stickers, pins, glue and diagrams.

**Architecture:** A Tauri 2 shell hosts a React + TypeScript webview. The tldraw SDK is the canvas; Deesk's own features are custom tldraw shapes and small modules (zoom spring, pin/glue rules, persistence) kept behind a thin boundary so the canvas could be swapped later. One desk is one tldraw snapshot saved as JSON with an `assets/` folder.

**Tech Stack:** Tauri 2 (Rust shell), React 19, TypeScript, Vite, tldraw SDK, TipTap, Zustand, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-27-deesk-design.md`. Read it before starting any task.

## How this plan is organised

- **Part 1 (Tasks 1–4)** is fully detailed and executable as written. Its deliverable is the first milestone: open the app from the dock and see an empty tldraw table canvas coloured `#FFF6D8`.
- **Part 2 (Tasks 5–17)** is a roadmap. Each task states its goal, files, interfaces and acceptance criteria, but the step-level TDD detail is written just before executing it. Those steps depend on the exact API of the installed tldraw version (5.x at the time of writing), which must be checked against its docs at that time. Expand a Part 2 task with `superpowers:writing-plans` (add the steps under the task, in this file) before implementing it. Do not guess tldraw APIs from memory.
- Tick `- [ ]` boxes in this file as steps complete, so another session can resume from the file alone.

## Working agreement (set by the user)

- **The user does every download and install** (Rust, any system tool). The agent never runs installers; it tells the user the exact command, to be run with `! <command>` in the session, and waits.
- **The user tests all interactions** by hand: drawing, zoom, dark mode, window resizing, the dock icon and so on. The agent runs only automated checks (`npm run build`, `npm test`) and, wherever a step says "verify by hand", writes the user a short list of what to do and what they should see, then waits for their answer before ticking the step.
- Steps below that say "Run `npm run tauri dev`" mean the agent starts it and the user looks at the window.

## Global Constraints

- Shell is **Tauri 2**; UI is **React + TypeScript + Vite**; canvas is the **tldraw SDK**. Excalidraw is not used, embedded or otherwise.
- Rich text and checklists use **TipTap**; app-level state uses **Zustand**; tests use **Vitest** and **Playwright**.
- Table (desk) background colour is exactly **`#FFF6D8`** (user-specified; note it is a light cream, not a brown). The table stays this colour regardless of OS dark mode until a theme task explicitly changes it.
- **The app never changes the view on its own.** Only the user moves the camera. The single exception is the zoom spring (Task 6).
- **Resizing a paper never scales its text.** Font size is fixed; text reflows or clips. Hard requirement.
- One desk, one document. No multi-desk UI, no grouping features, no sync, accounts or collaboration.
- Autosave is debounced and **atomic** (write temp file, then rename).
- Pin holds every paper under it; glue fixes a single paper. They are different features with different names.
- No progress indicator on checklists.
- Looping self-similar zoom is out of scope.
- A packaged app counts as tldraw "production" and needs a licence key (hobby key requested by the user). Development needs none.
- **Never give two files names that differ only by capital letters** (for example `pasteOffset.ts` and `PasteOffset.tsx`): macOS treats them as the same file and TypeScript fails. Component files get a different word, such as `...Handler.tsx` or `...Listener.tsx`.
- Project root: `/Users/oliverduenielsen/deesk` (git repo, branch `master`). Commit after every task.
- Commit messages carry **no** attribution or Co-Authored-By trailer (user instruction, 2026-10-28), and commits are authored as lio@live.dk through the repo-local git config.

## Review Focus

Failure modes the spec implies but no feature task would otherwise exercise, most likely first:

1. **OS dark mode must not darken the table.** A user on dark macOS still expects `#FFF6D8`. Pinned in Task 3 (`inferDarkMode={false}` plus a manual check with the OS in dark mode).
2. **Resizing, minimising and fullscreen.** The canvas must always fill the window with no scrollbars or white edges. Pinned in Task 3 (manual check) and Task 4 (window min size).
3. **Packaged app without a licence key.** The build must fail visibly or degrade clearly, not show a silent blank window. Pinned in Task 4.
4. **Nothing is saved yet in Part 1.** Shapes drawn before Task 5 vanish on quit. This is expected, and is stated in Task 3's acceptance so it is not mistaken for a bug.
5. **Theme applied twice (Vite hot reload).** `applyTheme` must be idempotent. Pinned in Task 2 by a unit test.

---

# Part 1: Skeleton

### Task 1: Toolchain and Tauri + React + Vite scaffold

**Files:**
- Create: everything the Tauri scaffold generates (`package.json`, `index.html`, `vite.config.ts`, `tsconfig*.json`, `src/`, `src-tauri/`)
- Modify: `src-tauri/tauri.conf.json` (product name), `.gitignore`

**Interfaces:**
- Consumes: nothing.
- Produces: `npm run tauri dev` opens a native window titled "Deesk" rendering the scaffold's React page. `npm run build` type-checks and builds the frontend. Later tasks add files under `src/` and edit `src-tauri/tauri.conf.json`.

Machine state when this plan was written: Node v24.11.1 and npm 11.6.2 are installed; **Rust (`rustc`/`cargo`) is not installed**; Xcode command line tools are present.

- [ ] **Step 1: Install Rust**

This downloads and runs the official installer and edits shell profile files, so get the user's explicit OK first (they can run it with `! <command>`).

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
source "$HOME/.cargo/env"
```

- [ ] **Step 2: Verify Rust**

Run: `rustc --version && cargo --version`
Expected: both print versions (any current stable).

- [ ] **Step 3: Scaffold into a temporary directory**

The project directory is not empty (docs, git), so scaffold elsewhere and copy in.

```bash
TMP=$(mktemp -d)
cd "$TMP" && npm create tauri-app@latest deesk-scaffold -- --template react-ts --manager npm --identifier com.deesk.app --yes
```

If a flag is rejected, run `npm create tauri-app@latest -- --help` and use the equivalent. Expected: a `deesk-scaffold/` directory with `src/`, `src-tauri/`, `package.json`.

- [ ] **Step 4: Copy the scaffold into the project and install**

```bash
rsync -a --exclude .git "$TMP/deesk-scaffold/" /Users/oliverduenielsen/deesk/
cd /Users/oliverduenielsen/deesk && npm install
```

Expected: `npm install` finishes without errors.

- [ ] **Step 5: Name the product Deesk**

In `src-tauri/tauri.conf.json` set `"productName": "Deesk"` and the first window's `"title": "Deesk"`. Leave `identifier` as `com.deesk.app`.

- [ ] **Step 6: Make sure build output is ignored**

Run: `cat .gitignore`
Expected: it lists `node_modules`, `dist`, and `src-tauri/target` (or `target`). Add any that are missing, plus `.env.local`.

- [ ] **Step 7: Run the app**

Run: `npm run tauri dev`
Expected: the first run compiles Rust for a few minutes, then a native window titled "Deesk" opens showing the scaffold page. Close the window / Ctrl+C when confirmed.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore: scaffold Tauri 2 + React + TypeScript + Vite app"
```

---

### Task 2: Test runner and theme module (TDD)

**Files:**
- Create: `src/theme.ts`, `src/theme.test.ts`
- Modify: `vite.config.ts`, `package.json`

**Interfaces:**
- Consumes: the scaffold from Task 1.
- Produces: `export const TABLE_COLOR: "#FFF6D8"` and `export function applyTheme(root?: HTMLElement): void` in `src/theme.ts`. `applyTheme` sets the CSS custom property `--deesk-table` on `root` (default `document.documentElement`). `npm test` runs Vitest once.

- [ ] **Step 1: Install Vitest and jsdom**

Run: `npm install -D vitest jsdom`
Expected: installed without errors.

- [ ] **Step 2: Configure Vitest and add the script**

In `vite.config.ts`, change the import to `import { defineConfig } from "vitest/config";` and add `test: { environment: "jsdom" }` to the object the config returns (keep the scaffold's existing Tauri settings). In `package.json` add to `scripts`: `"test": "vitest run"`.

- [ ] **Step 3: Write the failing test**

Create `src/theme.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { TABLE_COLOR, applyTheme } from "./theme";

describe("theme", () => {
  it("uses the table colour from the spec", () => {
    expect(TABLE_COLOR).toBe("#FFF6D8");
  });

  it("applies the table colour as a CSS variable", () => {
    const el = document.createElement("div");
    applyTheme(el);
    expect(el.style.getPropertyValue("--deesk-table")).toBe("#FFF6D8");
  });

  it("is idempotent when applied twice", () => {
    const el = document.createElement("div");
    applyTheme(el);
    applyTheme(el);
    expect(el.style.getPropertyValue("--deesk-table")).toBe("#FFF6D8");
  });
});
```

- [ ] **Step 4: Run it to see it fail**

Run: `npm test`
Expected: FAIL, because `./theme` cannot be resolved.

- [ ] **Step 5: Implement**

Create `src/theme.ts`:

```ts
export const TABLE_COLOR = "#FFF6D8";

export function applyTheme(root: HTMLElement = document.documentElement): void {
  root.style.setProperty("--deesk-table", TABLE_COLOR);
}
```

- [ ] **Step 6: Run it to see it pass**

Run: `npm test`
Expected: PASS, 3 tests.

- [ ] **Step 7: Commit**

```bash
git add vite.config.ts package.json package-lock.json src/theme.ts src/theme.test.ts
git commit -m "feat: add theme module with table colour"
```

---

### Task 3: tldraw table canvas

**Files:**
- Create: `src/Desk.tsx`
- Modify: `src/main.tsx`, `src/index.css` (create it if the scaffold used `App.css`), `package.json`
- Delete: the scaffold's `src/App.tsx`, `src/App.css`, and unused assets under `src/assets/`

**Interfaces:**
- Consumes: `applyTheme()` from Task 2.
- Produces: `export function Desk(): JSX.Element` in `src/Desk.tsx`, which renders the full-window tldraw editor. Later tasks add shapes, persistence and the zoom spring by extending `Desk.tsx` or components it renders.

- [ ] **Step 1: Install tldraw**

Run: `npm install tldraw`
Expected: installed. Check the installed major version with `npm ls tldraw` and skim its quick-start docs at https://tldraw.dev to confirm `import { Tldraw } from "tldraw"` and `import "tldraw/tldraw.css"` are still the correct usage. If the docs differ, follow the docs and note the change in this file.

- [ ] **Step 2: Create the Desk component**

Create `src/Desk.tsx`:

```tsx
import { Tldraw } from "tldraw";
import "tldraw/tldraw.css";

export function Desk() {
  return (
    <div className="desk">
      <Tldraw inferDarkMode={false} />
    </div>
  );
}
```

`inferDarkMode={false}` keeps the table light when the OS is in dark mode.

- [ ] **Step 3: Replace the scaffold entry point**

Replace the contents of `src/main.tsx` with:

```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { Desk } from "./Desk";
import { applyTheme } from "./theme";
import "./index.css";

applyTheme();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <Desk />
  </React.StrictMode>,
);
```

Delete `src/App.tsx`, `src/App.css` and the unused files in `src/assets/`. Make sure nothing still imports them (`npm run build` will tell you).

- [ ] **Step 4: Style the table**

Create or replace `src/index.css`:

```css
html,
body,
#root {
  margin: 0;
  height: 100%;
  overflow: hidden;
  background: var(--deesk-table);
}

.desk {
  position: fixed;
  inset: 0;
}

/* tldraw's canvas colour. Both variable spellings are set because the name
   has changed between tldraw versions; step 6 confirms which one applies. */
.desk .tl-container.tl-theme__light {
  --color-background: var(--deesk-table);
  --tl-color-background: var(--deesk-table);
}

.desk .tl-background {
  background-color: var(--deesk-table);
}
```

- [ ] **Step 5: Type-check and test**

Run: `npm run build && npm test`
Expected: both succeed.

- [ ] **Step 6: Run the app and verify the colour**

Run: `npm run tauri dev`
Expected: a window opens with a cream canvas and tldraw's toolbar. Open the webview inspector (right-click, Inspect Element), select the element with class `tl-background`, and check its computed `background-color` is `rgb(255, 246, 216)`. If it is not, find which variable the installed tldraw uses for its canvas background (search the computed styles of `.tl-container` for `background`), update the CSS above to match, and remove the spelling that does not apply.

- [ ] **Step 7: Check the Review Focus items for this task**

Confirm each by hand:
- Draw a rectangle, pan with space+drag or scroll, and zoom. All work.
- Set macOS to dark appearance (System Settings, Appearance). The table is still cream.
- Resize the window small and large, and use fullscreen. The canvas always fills the window with no scrollbars or white edges.
- Quit and reopen. The desk is empty. This is expected, because persistence arrives in Task 5.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: render tldraw canvas as a cream table"
```

---

### Task 4: Window settings, licence key wiring and a dock-ready build

**Files:**
- Modify: `src-tauri/tauri.conf.json`, `src/Desk.tsx`
- Create: `.env.example`, `.env.local` (git-ignored, holds the real key)
- Test: none automated; this task is verified by running the packaged app.

**Interfaces:**
- Consumes: `Desk` from Task 3.
- Produces: a built `Deesk.app` that opens from the dock. `Desk` reads the optional licence key from `import.meta.env.VITE_TLDRAW_LICENSE_KEY` and passes it to tldraw.

- [ ] **Step 1: Set sensible window defaults**

In `src-tauri/tauri.conf.json`, in the first entry of `app.windows`, set (keeping other existing fields):

```json
{
  "title": "Deesk",
  "width": 1280,
  "height": 800,
  "minWidth": 640,
  "minHeight": 480
}
```

- [ ] **Step 2: Wire the licence key**

tldraw's docs say a licence key is needed in production, and a packaged Tauri app runs from a non-localhost origin, so it counts as production. Verify the current prop name in the tldraw licence docs (https://tldraw.dev/sdk-features/license-key), then change `src/Desk.tsx` to:

```tsx
import { Tldraw } from "tldraw";
import "tldraw/tldraw.css";

const licenseKey = import.meta.env.VITE_TLDRAW_LICENSE_KEY as string | undefined;

export function Desk() {
  return (
    <div className="desk">
      <Tldraw inferDarkMode={false} licenseKey={licenseKey} />
    </div>
  );
}
```

Create `.env.example` containing `VITE_TLDRAW_LICENSE_KEY=` and confirm `.env.local` is in `.gitignore`.

- [ ] **Step 3: User action: request the hobby licence**

Ask the user to request a tldraw hobby licence for a non-commercial personal desktop app (see the licence docs for the form), and to list the allowed hosts the app runs on. In a packaged Tauri macOS app the origin is `tauri://localhost`, so include that if the form allows custom hosts. Put the key they receive in `.env.local` as `VITE_TLDRAW_LICENSE_KEY=...`. If they have no key yet, continue with Step 4 anyway and record the result of Step 6 as expected.

- [ ] **Step 4: Build the app bundle**

Run: `npm run tauri build`
Expected: finishes and produces `src-tauri/target/release/bundle/macos/Deesk.app`. The first build takes several minutes.

- [ ] **Step 5: Install it and add it to the dock**

```bash
cp -R src-tauri/target/release/bundle/macos/Deesk.app /Applications/
open /Applications/Deesk.app
```

Then right-click the running app's dock icon, Options, Keep in Dock.

- [ ] **Step 6: Verify the packaged app**

Expected with a valid key: the cream canvas, no blocking message, drawing works. Expected without a key or with a wrong host: record exactly what happens (watermark, a notice, a disabled editor or a blank window). If the window is blank, that is the Review Focus item 3 failure. Capture the webview console output (right-click, Inspect Element is available in dev builds only, so reproduce with `npm run tauri dev -- --release` if needed) and write what you found at the bottom of this file under a "Findings" heading, so the next session knows. Do not work around licence enforcement.

- [ ] **Step 7: Commit**

```bash
git add src-tauri/tauri.conf.json src/Desk.tsx .env.example .gitignore
git commit -m "feat: window defaults, licence key wiring, dock-ready build"
```

**Milestone 1 reached:** Deesk opens from the dock and shows the table canvas.

---

# Part 2: Roadmap

Each task below gets step-level TDD detail added under it (use `superpowers:writing-plans`, checking the installed tldraw API first) before it is implemented. Pure logic goes into small modules with Vitest tests; canvas behaviour is verified with a short Playwright flow where practical, and by hand otherwise.

### Task 5: Persistence

**Goal:** the desk survives quit and relaunch, and a crash or a corrupt file cannot destroy it.

**Where it is saved:** `~/Library/Application Support/com.deesk.app/` (Tauri's `AppData` folder for the app identifier, so `npm run tauri dev` and the packaged app share the same desk). Files: `session.json` (last view), `desk.json` (current), `desk.backup.json` (previous good version), `desk.json.tmp` (only during a write), and `desk.unreadable-<timestamp>.json` (a damaged file moved aside, never deleted).

**Design decisions**
- tldraw's `document` part of the snapshot (shapes, pages) is saved in `desk.json`. The `session` part (camera, selection) is saved separately in `session.json`, so the desk reopens at the user's last view (user decision, 2026-10-27). Restoring the user's own last view does not break the rule that the app never moves the camera on its own.
- Pure logic (file format, load/save/recovery, debounce) is separated from Tauri so Vitest can test it with a fake in-memory file system. Only `tauriFs.ts` touches the real file system.
- Saving starts only after loading has finished, so an empty desk can never overwrite a real one.
- The backup is only refreshed from a `desk.json` that parses. A corrupt file is never copied over a good backup.

**Files:**
- Create: `src/persistence/deskFile.ts`, `src/persistence/deskFile.test.ts`
- Create: `src/persistence/deskStore.ts`, `src/persistence/deskStore.test.ts`
- Create: `src/persistence/autosave.ts`, `src/persistence/autosave.test.ts`
- Create: `src/persistence/sessionStore.ts`, `src/persistence/sessionStore.test.ts`
- Create: `src/persistence/tauriFs.ts`, `src/persistence/useDeskStore.ts`
- Modify: `src/Desk.tsx`, `src-tauri/Cargo.toml`, `src-tauri/src/lib.rs`, `src-tauri/capabilities/default.json`, `package.json` (all via the fs plugin install in Step 1)

**Interfaces:**
- Consumes: `Desk` from Task 3/4; tldraw's `createTLStore`, `getSnapshot`, `loadSnapshot` and `store.listen`.
- Produces:
  - `deskFile.ts`: `serializeDesk(document: unknown): string`; `parseDesk(text: string): ParseResult` where `ParseResult = { ok: true; document: unknown } | { ok: false; reason: "invalid" | "unsupported-version" }`.
  - `deskStore.ts`: `interface FileOps { read(path: string): Promise<string | null>; write(path: string, text: string): Promise<void>; rename(from: string, to: string): Promise<void>; copy(from: string, to: string): Promise<void> }`; `loadDesk(fs: FileOps, now?: () => number): Promise<LoadResult>` where `LoadResult = { kind: "empty" } | { kind: "ok"; document: unknown } | { kind: "recovered"; document: unknown } | { kind: "unreadable" }`; `saveDesk(fs: FileOps, document: unknown): Promise<void>`; constants `DESK_FILE`, `TMP_FILE`, `BACKUP_FILE`.
  - `sessionStore.ts`: `loadSession(fs: FileOps): Promise<unknown | null>` (null when missing or corrupt, never throws); `saveSession(fs: FileOps, session: unknown): Promise<void>` (temp file then rename); constants `SESSION_FILE`, `SESSION_TMP_FILE`.
  - `autosave.ts`: `createAutosaver(save: () => Promise<void>, delayMs: number, onError?: (e: unknown) => void): Autosaver` where `Autosaver = { schedule(): void; flush(): Promise<void>; cancel(): void }`.
  - `useDeskStore.ts`: `useDeskStore(): TLStore | null` (null while loading).

- [x] **Step 1: Install the Tauri file-system plugin (user runs the install)**

Ask the user to run, in the project folder: `! npm run tauri add fs`. It adds the npm package `@tauri-apps/plugin-fs`, the Rust crate `tauri-plugin-fs`, registers the plugin in `src-tauri/src/lib.rs`, and adds a permission to `src-tauri/capabilities/default.json`. Then check the three edited files by eye (`git diff`) and confirm `npm run build` still passes.

- [x] **Step 2: Allow only the app data folder**

In `src-tauri/capabilities/default.json`, replace the broad default `fs:default` (if the install added it) with the exact permissions used, scoped to `$APPDATA` only: `fs:allow-read-text-file`, `fs:allow-write-text-file`, `fs:allow-rename`, `fs:allow-copy-file`, `fs:allow-exists`, `fs:allow-mkdir`, and a scope entry allowing `$APPDATA` and `$APPDATA/**`. Look the exact permission identifiers up in the installed plugin's docs or in `src-tauri/gen/schemas` after a build, since names must match exactly. Do not allow any other folder.

- [x] **Step 3: Write the failing tests for the file format**

Create `src/persistence/deskFile.test.ts`:

```ts
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
```

- [x] **Step 4: Run to see it fail, then implement**

Run: `npm test` (expected FAIL: `./deskFile` not found). Create `src/persistence/deskFile.ts`:

```ts
export const DESK_FILE_VERSION = 1;

export type ParseResult =
  | { ok: true; document: unknown }
  | { ok: false; reason: "invalid" | "unsupported-version" };

export function serializeDesk(document: unknown): string {
  return JSON.stringify({ version: DESK_FILE_VERSION, document });
}

export function parseDesk(text: string): ParseResult {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return { ok: false, reason: "invalid" };
  }
  if (typeof value !== "object" || value === null) {
    return { ok: false, reason: "invalid" };
  }
  const file = value as { version?: unknown; document?: unknown };
  if (file.version !== DESK_FILE_VERSION && typeof file.version === "number") {
    return { ok: false, reason: "unsupported-version" };
  }
  if (file.version !== DESK_FILE_VERSION || file.document === undefined) {
    return { ok: false, reason: "invalid" };
  }
  return { ok: true, document: file.document };
}
```

Run: `npm test`. Expected: PASS. Commit: `git add src/persistence/deskFile.* && git commit -m "feat: desk file format"`.

- [x] **Step 5: Write the failing tests for load, save and recovery**

Create `src/persistence/deskStore.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { serializeDesk } from "./deskFile";
import { BACKUP_FILE, DESK_FILE, TMP_FILE, loadDesk, saveDesk, type FileOps } from "./deskStore";

function memoryFs(initial: Record<string, string> = {}) {
  const files = new Map<string, string>(Object.entries(initial));
  const fs: FileOps = {
    async read(path) {
      return files.has(path) ? (files.get(path) as string) : null;
    },
    async write(path, text) {
      files.set(path, text);
    },
    async rename(from, to) {
      files.set(to, files.get(from) as string);
      files.delete(from);
    },
    async copy(from, to) {
      files.set(to, files.get(from) as string);
    },
  };
  return { fs, files };
}

const docA = { name: "A" };
const docB = { name: "B" };
const now = () => 1000;

describe("deskStore", () => {
  it("loads as empty on first launch", async () => {
    const { fs } = memoryFs();
    expect(await loadDesk(fs, now)).toEqual({ kind: "empty" });
  });

  it("saves and loads the same document", async () => {
    const { fs } = memoryFs();
    await saveDesk(fs, docA);
    expect(await loadDesk(fs, now)).toEqual({ kind: "ok", document: docA });
  });

  it("keeps the previous version as a backup on the second save", async () => {
    const { fs, files } = memoryFs();
    await saveDesk(fs, docA);
    await saveDesk(fs, docB);
    expect(files.get(BACKUP_FILE)).toBe(serializeDesk(docA));
    expect(files.get(DESK_FILE)).toBe(serializeDesk(docB));
    expect(files.has(TMP_FILE)).toBe(false);
  });

  it("recovers from the backup when desk.json is corrupt, and moves the bad file aside", async () => {
    const { fs, files } = memoryFs({
      [DESK_FILE]: "garbage {",
      [BACKUP_FILE]: serializeDesk(docA),
    });
    expect(await loadDesk(fs, now)).toEqual({ kind: "recovered", document: docA });
    expect(files.has(DESK_FILE)).toBe(false);
    expect(files.get("desk.unreadable-1000.json")).toBe("garbage {");
  });

  it("reports unreadable, and keeps the bad file, when there is no usable backup", async () => {
    const { fs, files } = memoryFs({ [DESK_FILE]: "garbage {" });
    expect(await loadDesk(fs, now)).toEqual({ kind: "unreadable" });
    expect(files.get("desk.unreadable-1000.json")).toBe("garbage {");
  });

  it("recovers from the backup when desk.json is missing", async () => {
    const { fs } = memoryFs({ [BACKUP_FILE]: serializeDesk(docA) });
    expect(await loadDesk(fs, now)).toEqual({ kind: "recovered", document: docA });
  });

  it("ignores a leftover temp file from a crash mid-write", async () => {
    const { fs } = memoryFs({
      [DESK_FILE]: serializeDesk(docA),
      [TMP_FILE]: '{"version":1,"docum',
    });
    expect(await loadDesk(fs, now)).toEqual({ kind: "ok", document: docA });
  });

  it("never copies a corrupt desk.json over a good backup", async () => {
    const { fs, files } = memoryFs({
      [DESK_FILE]: "garbage {",
      [BACKUP_FILE]: serializeDesk(docA),
    });
    await saveDesk(fs, docB);
    expect(files.get(BACKUP_FILE)).toBe(serializeDesk(docA));
    expect(files.get(DESK_FILE)).toBe(serializeDesk(docB));
  });
});
```

- [x] **Step 6: Run to see it fail, then implement**

Run: `npm test` (expected FAIL: `./deskStore` not found). Create `src/persistence/deskStore.ts`:

```ts
import { parseDesk, serializeDesk } from "./deskFile";

export const DESK_FILE = "desk.json";
export const TMP_FILE = "desk.json.tmp";
export const BACKUP_FILE = "desk.backup.json";

export interface FileOps {
  read(path: string): Promise<string | null>;
  write(path: string, text: string): Promise<void>;
  rename(from: string, to: string): Promise<void>;
  copy(from: string, to: string): Promise<void>;
}

export type LoadResult =
  | { kind: "empty" }
  | { kind: "ok"; document: unknown }
  | { kind: "recovered"; document: unknown }
  | { kind: "unreadable" };

async function readBackup(fs: FileOps): Promise<unknown | undefined> {
  const text = await fs.read(BACKUP_FILE);
  if (text === null) return undefined;
  const parsed = parseDesk(text);
  return parsed.ok ? parsed.document : undefined;
}

export async function loadDesk(fs: FileOps, now: () => number = Date.now): Promise<LoadResult> {
  const text = await fs.read(DESK_FILE);

  if (text === null) {
    const backup = await readBackup(fs);
    return backup === undefined ? { kind: "empty" } : { kind: "recovered", document: backup };
  }

  const parsed = parseDesk(text);
  if (parsed.ok) return { kind: "ok", document: parsed.document };

  // Never delete a damaged desk: move it aside so it can be inspected.
  await fs.rename(DESK_FILE, `desk.unreadable-${now()}.json`);
  const backup = await readBackup(fs);
  return backup === undefined ? { kind: "unreadable" } : { kind: "recovered", document: backup };
}

export async function saveDesk(fs: FileOps, document: unknown): Promise<void> {
  await fs.write(TMP_FILE, serializeDesk(document));

  // Only refresh the backup from a current file that is itself valid.
  const current = await fs.read(DESK_FILE);
  if (current !== null && parseDesk(current).ok) {
    await fs.copy(DESK_FILE, BACKUP_FILE);
  }

  await fs.rename(TMP_FILE, DESK_FILE);
}
```

Run: `npm test`. Expected: PASS. Commit: `git add src/persistence/deskStore.* && git commit -m "feat: atomic desk save and recovering load"`.

- [x] **Step 7: Write the failing tests for the autosaver**

Create `src/persistence/autosave.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createAutosaver } from "./autosave";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("autosaver", () => {
  it("saves once after a burst of changes", async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const saver = createAutosaver(save, 500);
    saver.schedule();
    await vi.advanceTimersByTimeAsync(200);
    saver.schedule();
    await vi.advanceTimersByTimeAsync(200);
    saver.schedule();
    expect(save).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(500);
    expect(save).toHaveBeenCalledTimes(1);
  });

  it("flush saves immediately when a save is pending", async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const saver = createAutosaver(save, 500);
    saver.schedule();
    await saver.flush();
    expect(save).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1000);
    expect(save).toHaveBeenCalledTimes(1);
  });

  it("flush does nothing when nothing changed", async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const saver = createAutosaver(save, 500);
    await saver.flush();
    expect(save).not.toHaveBeenCalled();
  });

  it("never runs two saves at once, and saves again for changes made during a save", async () => {
    let active = 0;
    let maxActive = 0;
    let calls = 0;
    const save = async () => {
      calls += 1;
      active += 1;
      maxActive = Math.max(maxActive, active);
      await new Promise((r) => setTimeout(r, 300));
      active -= 1;
    };
    const saver = createAutosaver(save, 100);
    saver.schedule();
    await vi.advanceTimersByTimeAsync(100); // first save starts
    saver.schedule(); // change during the save
    await vi.advanceTimersByTimeAsync(2000);
    expect(maxActive).toBe(1);
    expect(calls).toBe(2);
  });

  it("reports a failed save and keeps working afterwards", async () => {
    const onError = vi.fn();
    const save = vi.fn().mockRejectedValueOnce(new Error("disk full")).mockResolvedValue(undefined);
    const saver = createAutosaver(save, 100, onError);
    saver.schedule();
    await vi.advanceTimersByTimeAsync(100);
    expect(onError).toHaveBeenCalledTimes(1);
    saver.schedule();
    await vi.advanceTimersByTimeAsync(100);
    expect(save).toHaveBeenCalledTimes(2);
  });

  it("cancel drops a pending save", async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const saver = createAutosaver(save, 500);
    saver.schedule();
    saver.cancel();
    await vi.advanceTimersByTimeAsync(1000);
    expect(save).not.toHaveBeenCalled();
  });
});
```

- [x] **Step 8: Run to see it fail, then implement**

Run: `npm test` (expected FAIL: `./autosave` not found). Create `src/persistence/autosave.ts`:

```ts
export interface Autosaver {
  schedule(): void;
  flush(): Promise<void>;
  cancel(): void;
}

export function createAutosaver(
  save: () => Promise<void>,
  delayMs: number,
  onError?: (e: unknown) => void,
): Autosaver {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let running: Promise<void> | null = null;
  let dirty = false;

  const run = async () => {
    while (dirty) {
      dirty = false;
      try {
        await save();
      } catch (e) {
        onError?.(e);
      }
    }
  };

  const start = (): Promise<void> => {
    if (!running) {
      running = run().finally(() => {
        running = null;
      });
    }
    return running;
  };

  const clearTimer = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  };

  return {
    schedule() {
      dirty = true;
      clearTimer();
      timer = setTimeout(() => {
        timer = null;
        void start();
      }, delayMs);
    },
    async flush() {
      clearTimer();
      if (dirty) await start();
      else if (running) await running;
    },
    cancel() {
      dirty = false;
      clearTimer();
    },
  };
}
```

Run: `npm test`. Expected: PASS. Commit: `git add src/persistence/autosave.* && git commit -m "feat: debounced autosaver"`.

- [x] **Step 8a: Remember the view (camera) in its own small file**

Decision (user, 2026-10-27): reopening restores the last view (zoom and position). It lives in `session.json`, separate from `desk.json`, so panning never rewrites the desk and a damaged view file can never harm it: a bad or missing `session.json` just means the default view.

Create `src/persistence/sessionStore.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { SESSION_FILE, SESSION_TMP_FILE, loadSession, saveSession } from "./sessionStore";
import type { FileOps } from "./deskStore";

function memoryFs(initial: Record<string, string> = {}) {
  const files = new Map<string, string>(Object.entries(initial));
  const fs: FileOps = {
    async read(path) {
      return files.has(path) ? (files.get(path) as string) : null;
    },
    async write(path, text) {
      files.set(path, text);
    },
    async rename(from, to) {
      files.set(to, files.get(from) as string);
      files.delete(from);
    },
    async copy(from, to) {
      files.set(to, files.get(from) as string);
    },
  };
  return { fs, files };
}

describe("sessionStore", () => {
  it("returns null when there is no session file", async () => {
    const { fs } = memoryFs();
    expect(await loadSession(fs)).toBeNull();
  });

  it("round-trips a session", async () => {
    const { fs, files } = memoryFs();
    const session = { camera: { x: 10, y: -20, z: 0.5 } };
    await saveSession(fs, session);
    expect(await loadSession(fs)).toEqual(session);
    expect(files.has(SESSION_TMP_FILE)).toBe(false);
  });

  it("returns null, without throwing, when the file is corrupt", async () => {
    const { fs } = memoryFs({ [SESSION_FILE]: "garbage {" });
    expect(await loadSession(fs)).toBeNull();
  });
});
```

Run `npm test` (expected FAIL: `./sessionStore` not found). Create `src/persistence/sessionStore.ts`:

```ts
import type { FileOps } from "./deskStore";

export const SESSION_FILE = "session.json";
export const SESSION_TMP_FILE = "session.json.tmp";

export async function loadSession(fs: FileOps): Promise<unknown | null> {
  const text = await fs.read(SESSION_FILE);
  if (text === null) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export async function saveSession(fs: FileOps, session: unknown): Promise<void> {
  await fs.write(SESSION_TMP_FILE, JSON.stringify(session));
  await fs.rename(SESSION_TMP_FILE, SESSION_FILE);
}
```

Run `npm test`. Expected: PASS. Commit: `git add src/persistence/sessionStore.* && git commit -m "feat: save and load the view in its own file"`.

- [x] **Step 9: Real file operations on the Tauri side**

Create `src/persistence/tauriFs.ts`. Before relying on it, open the installed types (`node_modules/@tauri-apps/plugin-fs/dist-js/index.d.ts`) and confirm the option names for `readTextFile`, `writeTextFile`, `rename`, `copyFile`, `exists` and `mkdir`; adjust this file if they differ.

```ts
import {
  BaseDirectory,
  copyFile,
  exists,
  mkdir,
  readTextFile,
  rename,
  writeTextFile,
} from "@tauri-apps/plugin-fs";
import type { FileOps } from "./deskStore";

const base = { baseDir: BaseDirectory.AppData };

export const tauriFileOps: FileOps = {
  async read(path) {
    return (await exists(path, base)) ? readTextFile(path, base) : null;
  },
  write: (path, text) => writeTextFile(path, text, base),
  rename: (from, to) =>
    rename(from, to, {
      oldPathBaseDir: BaseDirectory.AppData,
      newPathBaseDir: BaseDirectory.AppData,
    }),
  copy: (from, to) =>
    copyFile(from, to, {
      fromPathBaseDir: BaseDirectory.AppData,
      toPathBaseDir: BaseDirectory.AppData,
    }),
};

export async function ensureDataDir(): Promise<void> {
  await mkdir("", { ...base, recursive: true });
}
```

Run `npm run build`. Expected: type-checks. If `mkdir("")` is rejected at runtime in Step 12, create the folder with the path `"."` or check `exists("", base)` first; note what worked in Findings.

- [x] **Step 10: Hook the store into the editor**

Create `src/persistence/useDeskStore.ts`:

```ts
import { useEffect, useState } from "react";
import { createTLStore, getSnapshot, loadSnapshot, type TLStore } from "tldraw";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { createAutosaver } from "./autosave";
import { loadDesk, saveDesk } from "./deskStore";
import { loadSession, saveSession } from "./sessionStore";
import { ensureDataDir, tauriFileOps } from "./tauriFs";

const SAVE_DELAY_MS = 500;
const SESSION_SAVE_DELAY_MS = 1000;

export function useDeskStore(): TLStore | null {
  const [store, setStore] = useState<TLStore | null>(null);

  useEffect(() => {
    let cancelled = false;
    let stop = () => {};

    (async () => {
      await ensureDataDir();
      const result = await loadDesk(tauriFileOps);
      const session = await loadSession(tauriFileOps);
      if (cancelled) return;

      if (result.kind === "recovered") {
        console.warn("Deesk: desk.json was damaged; restored from the backup.");
      } else if (result.kind === "unreadable") {
        console.warn("Deesk: desk.json was unreadable and has been moved aside; starting empty.");
      }

      const next = createTLStore();
      if (result.kind === "ok" || result.kind === "recovered") {
        loadSnapshot(next, {
          document: result.document as never,
          ...(session ? { session: session as never } : {}),
        });
      }

      // Saving starts only now, after loading finished.
      const saver = createAutosaver(
        () => saveDesk(tauriFileOps, getSnapshot(next).document),
        SAVE_DELAY_MS,
        (e) => console.error("Deesk: save failed", e),
      );
      const unlisten = next.listen(() => saver.schedule(), { source: "user", scope: "document" });

      // The view (camera, selection) is saved separately, a little less eagerly.
      const sessionSaver = createAutosaver(
        () => saveSession(tauriFileOps, getSnapshot(next).session),
        SESSION_SAVE_DELAY_MS,
        (e) => console.error("Deesk: saving the view failed", e),
      );
      const unlistenSession = next.listen(() => sessionSaver.schedule(), { scope: "session" });

      const unlistenClose = await getCurrentWindow().onCloseRequested(async () => {
        await saver.flush();
        await sessionSaver.flush();
      });

      stop = () => {
        unlisten();
        unlistenSession();
        unlistenClose();
        saver.cancel();
        sessionSaver.cancel();
      };
      if (cancelled) stop();
      else setStore(next);
    })();

    return () => {
      cancelled = true;
      stop();
    };
  }, []);

  return store;
}
```

If TypeScript rejects the `as never` casts or the `loadSnapshot` argument shape (for example if `session` cannot be given without `document`), follow the installed tldraw types and note the fix in Findings. A desk with no saved shapes but a saved view is an odd state; if it behaves badly, only restore the view when a desk was loaded, as written above.

- [x] **Step 11: Use it in the Desk**

Replace `src/Desk.tsx`:

```tsx
import { Tldraw } from "tldraw";
import "tldraw/tldraw.css";
import { useDeskStore } from "./persistence/useDeskStore";

const licenseKey = import.meta.env.VITE_TLDRAW_LICENSE_KEY as string | undefined;

export function Desk() {
  const store = useDeskStore();
  if (!store) return <div className="desk" />;
  return (
    <div className="desk">
      <Tldraw store={store} colorScheme="light" licenseKey={licenseKey || undefined} />
    </div>
  );
}
```

Run `npm run build && npm test`. Expected: both pass.

- [x] **Step 12: User verifies by hand (agent starts `npm run tauri dev`)**

Give the user this list and wait for their answer, step by step:
1. First launch: the desk opens empty and cream, no errors. (If the saved folder already exists from an earlier run, that is fine.)
2. Draw a rectangle, an arrow and some freehand. Wait one second. Quit with Cmd+Q. Reopen: everything is still there.
3. Move a shape. Close the window with the red button. Reopen: the shape is where you left it.
3b. Pan and zoom to a different spot (not the default view), wait two seconds, close and reopen: the view is where you left it, not reset.
4. Draw something, quit, reopen, draw something else, quit, reopen. Both drawings are there. Then check the folder: `ls ~/Library/Application\ Support/com.deesk.app/` shows `desk.json` and `desk.backup.json`.
5. Damage test: quit Deesk, then run `echo garbage > ~/Library/Application\ Support/com.deesk.app/desk.json`. Reopen: the desk comes back from the backup (it may be one change older). Run `ls` on the folder again: there is now a `desk.unreadable-<number>.json` file holding the garbage.
5b. Damage the view file the same way (`echo garbage > ~/Library/Application\ Support/com.deesk.app/session.json`): reopen, the desk is intact and simply opens at the default view.
6. Look at the saved desk's size in Finder, and tell the agent roughly how big it is, in case images later make it grow.

Known limit to tell the user: the autosave waits 0.5 seconds after the last change (and 1 second for the view), so quitting with Cmd+Q within half a second of an edit can lose that last edit. Closing the window with the red button saves first.

- [x] **Step 13: Commit and ask for confirmation**

```bash
git add -A
git commit -m "feat: autosave and restore the desk"
```

Then report to the user what was verified and ask for explicit confirmation that Task 5 is done before starting Task 6.

### Task 6: Zoom spring

**Goal:** zooming past a soft limit, at either end, eases back to just inside it with an animation, never a snap. The app never moves the camera at any other time.

**How it behaves (a rubber band):** the user can zoom a little past a soft limit (up to a hard limit, where the camera stops). When they stop zooming for `SPRING_IDLE_MS`, the camera eases back to just inside the soft limit, keeping the point under the mouse pointer fixed (the window centre when the pointer is outside the canvas). If the user pans or zooms while it is easing back, tldraw stops the animation at once (documented), so the spring never fights the user. The spring only starts after a camera change, so it does not move a view that was restored on launch.

**Proposed numbers (all in one file, easy to tune by feel):**

| Constant | Value | Meaning |
|---|---|---|
| `SOFT_MIN_ZOOM` | 0.1 | 10%: zooming out past this triggers the spring |
| `SOFT_MAX_ZOOM` | 4 | 400%: zooming in past this triggers the spring |
| `HARD_MIN_ZOOM` | 0.05 | 5%: the camera cannot go further out |
| `HARD_MAX_ZOOM` | 8 | 800%: the camera cannot go further in |
| `SPRING_IDLE_MS` | 350 | how long you must stop zooming before it springs back |
| `SPRING_REST_FACTOR` | 0.85 | lands at 85% of the upper limit (3.4), or 1/0.85 of the lower (about 0.118) |
| `SPRING_DURATION_MS` | 450 | length of the ease-back animation |

**Design decisions**
- The pure maths (`springTarget`, `zoomAbout`) is separate from the tldraw wiring, so Vitest can test it without a canvas.
- The tldraw hard limit is the first and last value of `zoomSteps`, so `zoomSteps` must reach past the soft limits for overshoot to be possible. The zoom buttons and keyboard steps therefore also include the hard levels, and the spring pulls back from those.
- tldraw maps a page point to the screen as `(page + camera) * zoom`. `zoomAbout` is derived from that, so the anchor point stays put while the zoom changes (`springAnchor` chooses the mouse pointer, or the window centre when the pointer is outside the canvas).
- The hook is a child component of `<Tldraw>` so it can use `useEditor()`.

**Files:**
- Create: `src/camera/springConfig.ts`, `src/camera/spring.ts`, `src/camera/spring.test.ts`
- Create: `src/camera/ZoomSpring.tsx` (hook plus the tiny child component)
- Modify: `src/Desk.tsx`

**Interfaces:**
- Consumes: `Desk` from Task 5; tldraw's `Editor` (`getCamera`, `setCamera`, `getViewportScreenBounds`, `store.listen`), `EASINGS`, `useEditor`.
- Produces:
  - `springConfig.ts`: the constants in the table, plus `ZOOM_STEPS: number[]`.
  - `spring.ts`: `interface Camera { x: number; y: number; z: number }`, `interface Point { x: number; y: number }`, `springTarget(zoom: number, msSinceLastChange: number): number | null`, `zoomAbout(camera: Camera, screenPoint: Point, newZoom: number): Camera`.
  - `ZoomSpring.tsx`: `ZoomSpring(): null`, a component to render inside `<Tldraw>`.

- [x] **Step 1: Write the failing tests**

Create `src/camera/spring.test.ts`. The tests read the limits from the config, so tuning the numbers later does not break them.

```ts
import { describe, it, expect } from "vitest";
import { springTarget, zoomAbout, type Camera, type Point } from "./spring";
import {
  SOFT_MAX_ZOOM,
  SOFT_MIN_ZOOM,
  SPRING_IDLE_MS,
  SPRING_REST_FACTOR,
} from "./springConfig";

describe("springTarget", () => {
  it("does nothing inside the soft limits, however long the user is idle", () => {
    for (const z of [SOFT_MIN_ZOOM, 0.5, 1, 2, SOFT_MAX_ZOOM]) {
      expect(springTarget(z, SPRING_IDLE_MS * 10)).toBeNull();
    }
  });

  it("waits until the user has stopped zooming", () => {
    expect(springTarget(SOFT_MAX_ZOOM * 1.5, SPRING_IDLE_MS - 1)).toBeNull();
    expect(springTarget(SOFT_MIN_ZOOM / 1.5, SPRING_IDLE_MS - 1)).toBeNull();
  });

  it("eases back to just inside the upper limit", () => {
    expect(springTarget(SOFT_MAX_ZOOM * 1.5, SPRING_IDLE_MS)).toBeCloseTo(
      SOFT_MAX_ZOOM * SPRING_REST_FACTOR,
    );
  });

  it("eases back to just inside the lower limit", () => {
    expect(springTarget(SOFT_MIN_ZOOM / 1.5, SPRING_IDLE_MS)).toBeCloseTo(
      SOFT_MIN_ZOOM / SPRING_REST_FACTOR,
    );
  });

  it("always lands inside the soft limits and moves back toward them", () => {
    for (const z of [0.01, 0.05, 0.09, 4.01, 5, 8, 50]) {
      const target = springTarget(z, SPRING_IDLE_MS);
      expect(target).not.toBeNull();
      expect(target as number).toBeGreaterThanOrEqual(SOFT_MIN_ZOOM);
      expect(target as number).toBeLessThanOrEqual(SOFT_MAX_ZOOM);
      if (z > SOFT_MAX_ZOOM) expect(target as number).toBeLessThan(z);
      else expect(target as number).toBeGreaterThan(z);
    }
  });

  it("ignores impossible zoom values", () => {
    for (const z of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(springTarget(z, SPRING_IDLE_MS * 10)).toBeNull();
    }
  });
});

describe("zoomAbout", () => {
  // tldraw maps a page point to the screen as (page + camera) * zoom.
  const toScreen = (c: Camera, p: Point): Point => ({ x: (p.x + c.x) * c.z, y: (p.y + c.y) * c.z });

  it("keeps the page point under the chosen screen point fixed", () => {
    const camera: Camera = { x: -120, y: 75, z: 8 };
    const centre: Point = { x: 640, y: 400 };
    const page: Point = { x: centre.x / camera.z - camera.x, y: centre.y / camera.z - camera.y };

    const next = zoomAbout(camera, centre, 3.4);
    const after = toScreen(next, page);

    expect(next.z).toBe(3.4);
    expect(after.x).toBeCloseTo(centre.x);
    expect(after.y).toBeCloseTo(centre.y);
  });

  it("works when zooming out as well", () => {
    const camera: Camera = { x: 30, y: -10, z: 0.05 };
    const centre: Point = { x: 500, y: 300 };
    const page: Point = { x: centre.x / camera.z - camera.x, y: centre.y / camera.z - camera.y };

    const after = toScreen(zoomAbout(camera, centre, 0.12), page);

    expect(after.x).toBeCloseTo(centre.x);
    expect(after.y).toBeCloseTo(centre.y);
  });

  it("returns the same camera when the zoom is unchanged", () => {
    const camera: Camera = { x: 1, y: 2, z: 1 };
    expect(zoomAbout(camera, { x: 10, y: 10 }, 1)).toBe(camera);
  });

  it("returns the same camera for an invalid zoom", () => {
    const camera: Camera = { x: 1, y: 2, z: 1 };
    for (const z of [0, -2, Number.NaN]) {
      expect(zoomAbout(camera, { x: 10, y: 10 }, z)).toBe(camera);
    }
  });
});
```

- [x] **Step 2: Run it to see it fail**

Run: `npm test`. Expected: FAIL, because `./spring` and `./springConfig` cannot be resolved.

- [x] **Step 3: Implement the config and the maths**

Create `src/camera/springConfig.ts`:

```ts
// Zoom levels are tldraw zoom: 1 = 100%.
export const SOFT_MIN_ZOOM = 0.1;
export const SOFT_MAX_ZOOM = 4;
export const HARD_MIN_ZOOM = 0.05;
export const HARD_MAX_ZOOM = 8;

export const SPRING_IDLE_MS = 350;
export const SPRING_REST_FACTOR = 0.85;
export const SPRING_DURATION_MS = 450;

// tldraw clamps the camera to the first and last step, so the hard limits go at the ends.
export const ZOOM_STEPS = [
  HARD_MIN_ZOOM,
  SOFT_MIN_ZOOM,
  0.25,
  0.5,
  1,
  2,
  SOFT_MAX_ZOOM,
  HARD_MAX_ZOOM,
];
```

Create `src/camera/spring.ts`:

```ts
import {
  SOFT_MAX_ZOOM,
  SOFT_MIN_ZOOM,
  SPRING_IDLE_MS,
  SPRING_REST_FACTOR,
} from "./springConfig";

export interface Camera {
  x: number;
  y: number;
  z: number;
}

export interface Point {
  x: number;
  y: number;
}

// Where the zoom should ease back to, or null when nothing should happen.
export function springTarget(zoom: number, msSinceLastChange: number): number | null {
  if (!Number.isFinite(zoom) || zoom <= 0) return null;
  if (msSinceLastChange < SPRING_IDLE_MS) return null;
  if (zoom > SOFT_MAX_ZOOM) return SOFT_MAX_ZOOM * SPRING_REST_FACTOR;
  if (zoom < SOFT_MIN_ZOOM) return SOFT_MIN_ZOOM / SPRING_REST_FACTOR;
  return null;
}

// Change the zoom while keeping the page point under `screenPoint` where it is.
// tldraw maps a page point to the screen as (page + camera) * zoom.
export function zoomAbout(camera: Camera, screenPoint: Point, newZoom: number): Camera {
  if (!Number.isFinite(newZoom) || newZoom <= 0 || newZoom === camera.z) return camera;
  return {
    x: screenPoint.x / newZoom - screenPoint.x / camera.z + camera.x,
    y: screenPoint.y / newZoom - screenPoint.y / camera.z + camera.y,
    z: newZoom,
  };
}
```

- [x] **Step 4: Run it to see it pass, then commit**

Run: `npm test`. Expected: PASS (all earlier tests plus the new ones).

```bash
git add src/camera
git commit -m "feat: zoom spring maths and tuning constants"
```

- [x] **Step 5: Wire the spring into the editor**

Create `src/camera/ZoomSpring.tsx`. Before relying on it, check the installed types for `Editor#setCamera`, `Editor#getViewportScreenBounds` and the shape of `store.listen`'s `entry.changes.updated`, and adjust if they differ.

```tsx
import { useEffect } from "react";
import { EASINGS, useEditor } from "tldraw";
import { zoomAbout } from "./spring";
import { springTarget } from "./spring";
import { SPRING_DURATION_MS, SPRING_IDLE_MS } from "./springConfig";

export function ZoomSpring(): null {
  const editor = useEditor();

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;

    const settle = () => {
      timer = null;
      const camera = editor.getCamera();
      const target = springTarget(camera.z, SPRING_IDLE_MS);
      if (target === null) return;
      const viewport = editor.getViewportScreenBounds();
      const centre = { x: viewport.w / 2, y: viewport.h / 2 };
      editor.setCamera(zoomAbout(camera, centre, target), {
        animation: { duration: SPRING_DURATION_MS, easing: EASINGS.easeOutCubic },
      });
    };

    // Re-arm the timer on every camera change; it fires once the user has stopped.
    const unlisten = editor.store.listen(
      (entry) => {
        const touchedCamera = Object.keys(entry.changes.updated).some((id) =>
          id.startsWith("camera:"),
        );
        if (!touchedCamera) return;
        if (timer) clearTimeout(timer);
        timer = setTimeout(settle, SPRING_IDLE_MS);
      },
      { scope: "session" },
    );

    return () => {
      unlisten();
      if (timer) clearTimeout(timer);
    };
  }, [editor]);

  return null;
}
```

Modify `src/Desk.tsx`: import `ZOOM_STEPS` from `./camera/springConfig` and `ZoomSpring` from `./camera/ZoomSpring`, pass `options={{ camera: { zoomSteps: ZOOM_STEPS } }}` to `<Tldraw>`, and render `<ZoomSpring />` as a child of `<Tldraw>`:

```tsx
<Tldraw
  store={store}
  colorScheme="light"
  licenseKey={licenseKey || undefined}
  options={{ camera: { zoomSteps: ZOOM_STEPS } }}
>
  <ZoomSpring />
</Tldraw>
```

If tldraw's `options.camera` replaces the other camera defaults instead of merging, or rejects children, follow the installed types and note the fix in Findings. Merge the two `./spring` imports into one line.

Run: `npm run build && npm test`. Expected: both pass.

- [x] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: zoom spring eases the camera back inside the soft limits"
```

- [x] **Step 7: User verifies by hand (agent starts `npm run tauri dev`)**

Give the user this list and wait for their answers:
1. **Zoom in past the soft limit.** Zoom in with pinch or Cmd+scroll until it stops (about 800%). Let go. After a moment the view eases back to about 340%. The point at the centre of the window stays put while it eases.
2. **Zoom out past the soft limit.** Zoom out until it stops (about 5%). Let go. It eases back in to about 12%.
3. **Normal use stays still.** Zoom and pan anywhere between 10% and 400%. Nothing ever moves by itself.
4. **Interrupting.** While it is easing back, scroll or pan. The animation stops at once and you are in control. It never fights you.
5. **Zoom buttons and keyboard steps** (the zoom control and Cmd+plus / Cmd+minus): the steps still work, and the hard levels also spring back.
6. **Feel.** Is it too early, too late, too fast or too slow? Say what to change. Every number is in `src/camera/springConfig.ts`, so tuning is a one-line change.

- [x] **Step 8: Tune and commit**

Adjust the constants in `src/camera/springConfig.ts` with the user until it feels right. Run `npm test` (the tests read the limits from the config), then commit: `git commit -am "tune: zoom spring numbers"`. Report what was verified and ask for explicit confirmation that Task 6 is done before starting Task 7.

### Task 7: Paper shape (frame, fixed text size)

**Goal:** a "paper": a sheet on the desk that can be created, moved, rotated, resized, stacked and saved. **Resizing never scales its text.** Text shows as a fixed-size placeholder for now; real editing comes in Task 8.

**Design decisions (proposed, to be confirmed by the user)**
- **Creating a paper:** a toolbar button (leftmost, a small page icon) and the keyboard key **P**. After choosing it, one click on the desk drops a paper centred on the click, selects it, and returns to the normal select tool. Check in tldraw's keyboard shortcuts dialog that `p` is free; if it clashes, pick a free key.
- **Size:** a new paper is 300 × 380 (portrait, like a sheet). It can be resized down to 120 × 120.
- **Look:** a warm off-white sheet (`#FFFDF5`) with a thin border and a soft shadow, so it reads as paper on the cream table. Rotation uses tldraw's built-in rotate handle.
- **Colours** are left out of this task (Task 7b), so this task has one paper colour.
- **How text stays fixed:** a paper's saved props are only `w` and `h`. Text is ordinary HTML at a fixed 16 px, so changing `w` and `h` can only reflow or clip it. A test guards that the props never gain a font size or scale.
- **The desk store must know the shape.** `createTLStore()` in `useDeskStore.ts` is created outside the editor, so it needs `shapeUtils` too; otherwise a saved desk containing papers cannot load. (Consequence to remember: once papers are saved, an older build without the paper shape cannot open that desk.)

**Files:**
- Create: `src/shapes/paper/paperTypes.ts`, `src/shapes/paper/paperPlacement.ts`, `src/shapes/paper/paper.test.ts`
- Create: `src/shapes/paper/PaperShapeUtil.tsx`, `src/shapes/paper/PaperTool.ts`
- Create: `src/shapes/registry.tsx`, `public/paper-icon.svg`
- Modify: `src/Desk.tsx`, `src/persistence/useDeskStore.ts`, `src/index.css`

**Interfaces:**
- Consumes: `Desk` and `useDeskStore` from Tasks 5 and 6; tldraw's `BaseBoxShapeUtil`, `HTMLContainer`, `StateNode`, `T`, `createShapeId`, `resizeBox`, `DefaultToolbar`, `DefaultToolbarContent`, `TldrawUiMenuItem`, `useTools`, `useIsToolSelected`.
- Produces:
  - `paperTypes.ts`: `PAPER_TYPE = "paper"`, `type PaperShape`, constants `PAPER_DEFAULT_WIDTH` (300), `PAPER_DEFAULT_HEIGHT` (380), `PAPER_MIN_WIDTH` (120), `PAPER_MIN_HEIGHT` (120), `PAPER_FONT_SIZE_PX` (16).
  - `paperPlacement.ts`: `paperPlacement(centre: { x: number; y: number }): { x: number; y: number }` (top-left for a default-size paper centred on `centre`).
  - `PaperShapeUtil.tsx`: `class PaperShapeUtil` with `static props = { w, h }`.
  - `PaperTool.ts`: `class PaperTool extends StateNode`, `PAPER_TOOL_ID = "paper"`.
  - `registry.tsx`: `shapeUtils`, `customTools`, `uiOverrides`, `uiComponents`, `assetUrls`, one place that lists everything Deesk adds to tldraw. Later shapes (stickers, pins) are added here.

- [x] **Step 1: Write the failing tests**

Create `src/shapes/paper/paper.test.ts`:

```ts
import { describe, it, expect } from "vitest";
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
  it("stores only a width and a height, so resizing can never scale text", () => {
    expect(Object.keys(PaperShapeUtil.props).sort()).toEqual(["h", "w"]);
  });

  it("starts at the default size", () => {
    const props = new (PaperShapeUtil as never as new (editor: unknown) => PaperShapeUtil)({}).getDefaultProps();
    expect(props).toEqual({ w: PAPER_DEFAULT_WIDTH, h: PAPER_DEFAULT_HEIGHT });
  });
});
```

If constructing the util without an editor throws in the last test, replace that test with one that checks the defaults through an exported constant `PAPER_DEFAULT_PROPS` (add it to `paperTypes.ts` and use it in `getDefaultProps`). If importing tldraw inside Vitest's jsdom environment fails, note the error in Findings and keep the first three tests, relying on Step 9 for the rest.

- [x] **Step 2: Run to see it fail**

Run: `npm test`. Expected: FAIL, because `./paperPlacement`, `./paperTypes` and `./PaperShapeUtil` cannot be resolved.

- [x] **Step 3: Types, constants and placement**

Create `src/shapes/paper/paperTypes.ts`:

```ts
import type { TLShape } from "tldraw";

export const PAPER_TYPE = "paper";

declare module "tldraw" {
  export interface TLGlobalShapePropsMap {
    [PAPER_TYPE]: { w: number; h: number };
  }
}

export type PaperShape = TLShape<typeof PAPER_TYPE>;

export const PAPER_DEFAULT_WIDTH = 300;
export const PAPER_DEFAULT_HEIGHT = 380;
export const PAPER_MIN_WIDTH = 120;
export const PAPER_MIN_HEIGHT = 120;
export const PAPER_FONT_SIZE_PX = 16;
```

Create `src/shapes/paper/paperPlacement.ts`:

```ts
import { PAPER_DEFAULT_HEIGHT, PAPER_DEFAULT_WIDTH } from "./paperTypes";

// Top-left corner for a new default-size paper centred on `centre`.
export function paperPlacement(centre: { x: number; y: number }): { x: number; y: number } {
  return {
    x: centre.x - PAPER_DEFAULT_WIDTH / 2,
    y: centre.y - PAPER_DEFAULT_HEIGHT / 2,
  };
}
```

- [x] **Step 4: The shape**

Create `src/shapes/paper/PaperShapeUtil.tsx`. Check the installed types for `BaseBoxShapeUtil`, `resizeBox` (in particular whether it accepts `minWidth`/`minHeight` options) and `getIndicatorPath`, and adjust if they differ.

```tsx
import { BaseBoxShapeUtil, HTMLContainer, resizeBox, T, type TLResizeInfo } from "tldraw";
import {
  PAPER_DEFAULT_HEIGHT,
  PAPER_DEFAULT_WIDTH,
  PAPER_MIN_HEIGHT,
  PAPER_MIN_WIDTH,
  PAPER_TYPE,
  type PaperShape,
} from "./paperTypes";

export class PaperShapeUtil extends BaseBoxShapeUtil<PaperShape> {
  static override type = PAPER_TYPE;
  static override props = { w: T.number, h: T.number };

  getDefaultProps(): PaperShape["props"] {
    return { w: PAPER_DEFAULT_WIDTH, h: PAPER_DEFAULT_HEIGHT };
  }

  // Only the frame changes on resize. Text is plain HTML at a fixed size, so it can
  // reflow or be clipped, but it can never scale.
  override onResize(shape: PaperShape, info: TLResizeInfo<PaperShape>) {
    return resizeBox(shape, info, { minWidth: PAPER_MIN_WIDTH, minHeight: PAPER_MIN_HEIGHT });
  }

  component(shape: PaperShape) {
    return (
      <HTMLContainer>
        <div className="paper" style={{ width: shape.props.w, height: shape.props.h }}>
          <p className="paper-text">Resize me. This text keeps its size.</p>
        </div>
      </HTMLContainer>
    );
  }

  getIndicatorPath(shape: PaperShape) {
    const path = new Path2D();
    path.rect(0, 0, shape.props.w, shape.props.h);
    return path;
  }
}
```

Add to `src/index.css`:

```css
.paper {
  box-sizing: border-box;
  padding: 16px;
  overflow: hidden;
  background: #fffdf5;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 2px;
  box-shadow:
    0 1px 2px rgba(0, 0, 0, 0.12),
    0 6px 14px rgba(0, 0, 0, 0.1);
  color: #2b2b2b;
}

.paper-text {
  margin: 0;
  font: 16px/1.5 system-ui, sans-serif;
}
```

If `PaperShapeUtil` hard-codes the font size in CSS, keep `PAPER_FONT_SIZE_PX` as the documented value (16) and make sure the two agree.

- [x] **Step 5: Run the tests, then commit**

Run: `npm test`. Expected: PASS (all earlier tests plus these). Then:

```bash
git add src/shapes src/index.css
git commit -m "feat: paper shape with a fixed-size text area"
```

- [x] **Step 6: The tool that creates a paper**

Create `src/shapes/paper/PaperTool.ts`:

```ts
import { StateNode, createShapeId } from "tldraw";
import { paperPlacement } from "./paperPlacement";
import { PAPER_TYPE } from "./paperTypes";

export const PAPER_TOOL_ID = "paper";

// One click on the desk drops a paper centred on the click, then returns to select.
export class PaperTool extends StateNode {
  static override id = PAPER_TOOL_ID;

  override onPointerDown() {
    const { x, y } = paperPlacement(this.editor.inputs.getCurrentPagePoint());
    const id = createShapeId();
    this.editor.createShape({ id, type: PAPER_TYPE, x, y });
    this.editor.select(id);
    this.editor.setCurrentTool("select");
  }
}
```

- [x] **Step 7: Register everything in one place**

Create `public/paper-icon.svg` (a simple page outline; tldraw colours icons itself):

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M6 3h9l4 4v14H6z M15 3v4h4" fill="none" stroke="black" stroke-width="1.5" stroke-linejoin="round"/></svg>
```

Create `src/shapes/registry.tsx`. This follows tldraw's documented "add a tool to the toolbar" pattern; check names against the installed types.

```tsx
import {
  DefaultToolbar,
  DefaultToolbarContent,
  TldrawUiMenuItem,
  useIsToolSelected,
  useTools,
  type TLComponents,
  type TLUiAssetUrlOverrides,
  type TLUiOverrides,
} from "tldraw";
import { PAPER_TOOL_ID, PaperTool } from "./paper/PaperTool";
import { PaperShapeUtil } from "./paper/PaperShapeUtil";

// Everything Deesk adds to tldraw is listed here. Later shapes are added to these lists.
export const shapeUtils = [PaperShapeUtil];
export const customTools = [PaperTool];

export const uiOverrides: TLUiOverrides = {
  tools(editor, tools) {
    tools[PAPER_TOOL_ID] = {
      id: PAPER_TOOL_ID,
      icon: "paper-icon",
      label: "Paper",
      kbd: "p",
      onSelect: () => editor.setCurrentTool(PAPER_TOOL_ID),
    };
    return tools;
  },
};

export const uiComponents: TLComponents = {
  Toolbar: (props) => {
    const tools = useTools();
    const paperSelected = useIsToolSelected(tools[PAPER_TOOL_ID]);
    return (
      <DefaultToolbar {...props}>
        <TldrawUiMenuItem {...tools[PAPER_TOOL_ID]} isSelected={paperSelected} />
        <DefaultToolbarContent />
      </DefaultToolbar>
    );
  },
};

export const assetUrls: TLUiAssetUrlOverrides = {
  icons: { "paper-icon": "/paper-icon.svg" },
};
```

- [x] **Step 8: Wire it into the desk and the store**

In `src/persistence/useDeskStore.ts`, import `shapeUtils` from `../shapes/registry` and change `createTLStore()` to `createTLStore({ shapeUtils })`.

In `src/Desk.tsx`, import `assetUrls`, `customTools`, `shapeUtils`, `uiComponents`, `uiOverrides` from `./shapes/registry` and pass them to `<Tldraw>`:

```tsx
<Tldraw
  store={store}
  shapeUtils={shapeUtils}
  tools={customTools}
  overrides={uiOverrides}
  components={uiComponents}
  assetUrls={assetUrls}
  colorScheme="light"
  licenseKey={licenseKey || undefined}
  options={{ camera: { zoomSteps: ZOOM_STEPS } }}
>
  <ZoomSpring />
</Tldraw>
```

Run: `npm run build && npm test`. Expected: both pass. Commit:

```bash
git add -A
git commit -m "feat: create papers from a toolbar button or the P key"
```

- [x] **Step 9: User verifies by hand (agent starts `npm run tauri dev`)**

Give the user this list and wait for answers:
1. **Creating.** A page-icon button appears in the toolbar. Press it (or press **P**) and click on the desk. A paper appears centred on the click, selected, and the tool goes back to select. Does the key clash with another tldraw shortcut?
2. **Moving and rotating.** Drag the paper. Use the rotate handle. It behaves like any shape.
3. **Resizing, the hard requirement.** Drag every handle (all four corners and all four edges): make it very wide, very narrow, very tall, very short. **The text must stay exactly the same size**, only reflowing or being cut off at the edge. It cannot shrink below about 120 × 120. When pulling the left or top edge, the opposite edge must not move.
4. **Zoom.** Zoom in and out. The text scales with the zoom like everything else, and stays sharp.
5. **Saving.** Create two papers, resize one, close with the red button, reopen. Both are there at the same position and size, and your earlier drawings are still there too.
6. **Undo and redo** (Cmd+Z, Cmd+Shift+Z): creating, moving and resizing a paper all undo and redo correctly.
7. **Arrows.** Draw an arrow from a rectangle to a paper. Move the paper: the arrow stays attached and follows it.
8. **Stacking.** Drag one paper over another. The later-created paper is on top. Cmd+] and Cmd+[ change the order.
9. **Delete and copy.** Delete a paper. Copy and paste one (Cmd+C, Cmd+V). The copy appears with the same size.
10. **Dark mode** is still cream, and the paper still looks like paper.

- [x] **Step 10: Commit and ask for confirmation**

Fix anything the hand test found (with a test where the problem can be tested without the canvas), commit, tick this task in the plan, record findings, and ask the user for explicit confirmation that Task 7 is done before starting Task 8.

### Task 7b: Paper colours

- **Goal:** choose a paper's colour from a small set of paper-like colours.
- **Files:** `src/shapes/paper/paperTypes.ts` (add a `color` prop with a migration for existing papers), `PaperShapeUtil.tsx`, a small colour picker UI, tests for the colour list and migration.
- **Note:** deferred out of Task 7 so the paper itself could be verified first. Expand into steps before building.

### Task 8: Text on papers (markdown headers and bold)

**Goal:** write on a paper. `#` at the start of a line (followed by a space) makes a header, Cmd+B toggles bold. The text is saved with the desk. Resizing the paper never scales the text.

**How (decided from tldraw 5.5.2's source and docs):** tldraw already ships a TipTap-based rich text editor, and its select tool starts editing automatically for any shape that has a `richText` prop and allows editing (double-click, or Enter on a selected shape). So a paper gets a `richText` prop and renders it through tldraw's `RichTextLabel`, which handles display and editing, undo, copy and paste. **No separate `@tiptap/*` package is installed:** tldraw's docs warn that a second copy of TipTap or ProseMirror makes ProseMirror throw. The default extensions already include headings (the `# ` markdown rule), bold (Cmd+B), italic, lists and links. `RichTextLabel` renders nothing for an empty, non-editing paper, so a fresh paper stays blank.

**Design decisions (proposed, to be confirmed by the user)**
- **Start editing (revised after the first hand test, 2026-10-28):** double-click a paper or press Enter on a selected paper (both put the cursor at the **end** of the text and do not select it), or, **only when the paper is blank**, just start typing on a selected paper (the first character is kept). A paper that already has text ignores plain typing, so you cannot overwrite or add to it by accident; use Enter or double-click. Because typing is only intercepted on a blank paper, tldraw's single-letter tool shortcuts (v, d, r, p, ...) behave normally on a paper that has text, and type letters only on a blank selected paper. Space, Backspace, Delete and the arrow keys are never treated as typing.
- **Stop editing:** Escape, or click anywhere outside the paper. The paper stays selected after Escape.
- **Empty paper:** stays blank, with no placeholder text.
- **Typing rules:** keep tldraw's defaults except **Typography is turned off**, so quotes and dashes stay exactly as typed (no curly quotes, no `--` turning into a dash). Easy to turn back on in one line.
- **Font:** system font, 16 px, line height 1.5, text colour `#2b2b2b`, padding 16 px. Headers scale with tldraw's own heading styles.
- **No migration (user decision):** the user deleted the old papers, and `desk.json` and `desk.backup.json` were checked on 2026-10-28 and contain none. A desk that still held a paper saved before this task would fail to load, because that paper has no text.

**Files:**
- Create: `src/text/typeToEdit.ts`, `src/text/typeToEdit.test.ts`, `src/text/TypeToEditListener.tsx`
- Create: `src/text/textOptions.ts`, `src/text/textOptions.test.ts`
- Modify: `src/shapes/paper/paperTypes.ts`, `src/shapes/paper/PaperShapeUtil.tsx`, `src/shapes/paper/paper.test.ts`, `src/Desk.tsx`, `src/index.css`

**Interfaces:**
- Consumes: Task 7's paper (`PaperShape`, `PaperShapeUtil`, `storeShapeUtils` from `src/shapes/registry.tsx`); tldraw's `RichTextLabel`, `richTextValidator`, `toRichText`, `TLRichText`, `getTipTapDefaultExtensions`, `startEditingShapeWithRichText`.
- Produces:
  - `paperTypes.ts`: paper props become `{ w: number; h: number; richText: TLRichText }`; new constants `PAPER_LINE_HEIGHT` (1.5), `PAPER_PADDING_PX` (16), `PAPER_TEXT_COLOR` (`#2b2b2b`), `PAPER_FONT_FAMILY` (`system-ui, sans-serif`).
  - `typeToEdit.ts`: `isTypeToEditKey(e: KeyInfo): boolean` where `KeyInfo = { key: string; metaKey: boolean; ctrlKey: boolean; altKey: boolean; isComposing: boolean }`.
  - `TypeToEditListener.tsx`: `TypeToEditListener(): null`, a component rendered inside `<Tldraw>` that starts editing the selected paper when the user starts typing.
  - `textOptions.ts`: `deeskExtensions` (the TipTap extension list: tldraw's defaults without Typography); Task 9 adds the checklist extensions here.

- [x] **Step 1: Write the failing tests**

Update the guard in `src/shapes/paper/paper.test.ts` (the props now include the text, but still never a font size or a scale). Replace the "stores only a width and a height" test with:

```ts
  it("stores only a size and the text, so resizing can never scale text", () => {
    expect(Object.keys(PaperShapeUtil.props).sort()).toEqual(["h", "richText", "w"]);
  });
```

and replace the "starts at the default size" expectation with:

```ts
    expect(util.getDefaultProps()).toEqual({
      w: PAPER_DEFAULT_WIDTH,
      h: PAPER_DEFAULT_HEIGHT,
      richText: toRichText(""),
    });
```

(add `import { toRichText } from "tldraw";` at the top of that file).

Create `src/text/textOptions.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { deeskExtensions } from "./textOptions";

describe("deeskExtensions", () => {
  const names = deeskExtensions.map((e) => e.name);

  it("keeps the features we rely on: headers and bold", () => {
    expect(names).toContain("heading");
    expect(names).toContain("bold");
  });

  it("leaves typed characters exactly as typed", () => {
    expect(names).not.toContain("typography");
  });
});
```

Create `src/text/typeToEdit.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { isTypeToEditKey, type KeyInfo } from "./typeToEdit";

const key = (k: string, extra: Partial<KeyInfo> = {}): KeyInfo => ({
  key: k,
  metaKey: false,
  ctrlKey: false,
  altKey: false,
  isComposing: false,
  ...extra,
});

describe("isTypeToEditKey", () => {
  it("starts writing on letters, digits and punctuation", () => {
    for (const k of ["a", "Z", "7", "#", "-", "?", "æ", "Ø", "å", "€"]) {
      expect(isTypeToEditKey(key(k))).toBe(true);
    }
  });

  it("starts writing on a character made with Option/Alt, such as @ on some keyboards", () => {
    expect(isTypeToEditKey(key("@", { altKey: true }))).toBe(true);
  });

  it("does not start writing for shortcuts with Cmd or Ctrl", () => {
    expect(isTypeToEditKey(key("c", { metaKey: true }))).toBe(false);
    expect(isTypeToEditKey(key("z", { ctrlKey: true }))).toBe(false);
  });

  it("does not start writing for keys that are not characters", () => {
    for (const k of ["Enter", "Escape", "Backspace", "Delete", "Tab", "ArrowUp", "Shift", "Dead"]) {
      expect(isTypeToEditKey(key(k))).toBe(false);
    }
  });

  it("leaves Space alone, because it pans the canvas", () => {
    expect(isTypeToEditKey(key(" "))).toBe(false);
  });

  it("does not interfere with text composition", () => {
    expect(isTypeToEditKey(key("a", { isComposing: true }))).toBe(false);
  });
});
```

- [x] **Step 2: Run to see them fail**

Run: `npm test`. Expected: FAIL (`./textOptions` and `./typeToEdit` cannot be resolved; the guard test fails because `richText` is not a prop yet).

- [x] **Step 3: Types and constants**

In `src/shapes/paper/paperTypes.ts`, change the props map to include the text, import the type, and add the constants:

```ts
import type { TLRichText, TLShape } from "tldraw";

export const PAPER_TYPE = "paper";

declare module "tldraw" {
  export interface TLGlobalShapePropsMap {
    [PAPER_TYPE]: { w: number; h: number; richText: TLRichText };
  }
}
```

and add below the existing constants:

```ts
export const PAPER_LINE_HEIGHT = 1.5;
export const PAPER_PADDING_PX = 16;
export const PAPER_TEXT_COLOR = "#2b2b2b";
export const PAPER_FONT_FAMILY = "system-ui, sans-serif";
```

- [x] **Step 4: Text options**

Create `src/text/textOptions.ts`:

```ts
import { getTipTapDefaultExtensions } from "tldraw";

// tldraw's TipTap defaults (headers with the "# " markdown rule, bold with Cmd+B,
// italic, lists, links), without Typography so characters stay exactly as typed.
// Task 9 adds the checklist extensions here.
export const deeskExtensions = getTipTapDefaultExtensions().filter(
  (e) => e.name !== "typography",
);
```

- [x] **Step 5: The paper renders and edits its text**

Replace `src/shapes/paper/PaperShapeUtil.tsx`. Check the installed types for `RichTextLabel` (props are in `src/lib/shapes/shared/RichTextLabel.tsx` of the tldraw package), `useIsEditing`/`getEditingShapeId` if you need them, and `canEdit`, and adjust if they differ:

```tsx
import {
  BaseBoxShapeUtil,
  HTMLContainer,
  resizeBox,
  RichTextLabel,
  richTextValidator,
  T,
  toRichText,
  useValue,
  type TLResizeInfo,
} from "tldraw";
import {
  PAPER_DEFAULT_HEIGHT,
  PAPER_DEFAULT_WIDTH,
  PAPER_FONT_FAMILY,
  PAPER_FONT_SIZE_PX,
  PAPER_LINE_HEIGHT,
  PAPER_MIN_HEIGHT,
  PAPER_MIN_WIDTH,
  PAPER_PADDING_PX,
  PAPER_TEXT_COLOR,
  PAPER_TYPE,
  type PaperShape,
} from "./paperTypes";

export class PaperShapeUtil extends BaseBoxShapeUtil<PaperShape> {
  static override type = PAPER_TYPE;
  static override props = { w: T.number, h: T.number, richText: richTextValidator };

  getDefaultProps(): PaperShape["props"] {
    return { w: PAPER_DEFAULT_WIDTH, h: PAPER_DEFAULT_HEIGHT, richText: toRichText("") };
  }

  override canEdit() {
    return true;
  }

  // Only the frame changes on resize. The text is laid out at a fixed size, so it can
  // reflow or be clipped, but it can never scale.
  override onResize(shape: PaperShape, info: TLResizeInfo<PaperShape>) {
    return resizeBox(shape, info, { minWidth: PAPER_MIN_WIDTH, minHeight: PAPER_MIN_HEIGHT });
  }

  component(shape: PaperShape) {
    const isSelected = useValue(
      "paper selected",
      () => this.editor.getOnlySelectedShapeId() === shape.id,
      [this.editor, shape.id],
    );
    return (
      <HTMLContainer>
        <div className="paper" style={{ width: shape.props.w, height: shape.props.h }}>
          <RichTextLabel
            shapeId={shape.id}
            type={shape.type}
            richText={shape.props.richText}
            fontFamily={PAPER_FONT_FAMILY}
            fontSize={PAPER_FONT_SIZE_PX}
            lineHeight={PAPER_LINE_HEIGHT}
            textAlign="start"
            verticalAlign="start"
            wrap
            labelColor={PAPER_TEXT_COLOR}
            padding={PAPER_PADDING_PX}
            isSelected={isSelected}
          />
        </div>
      </HTMLContainer>
    );
  }

  getIndicatorPath(shape: PaperShape) {
    const path = new Path2D();
    path.rect(0, 0, shape.props.w, shape.props.h);
    return path;
  }
}
```

In `src/index.css`, replace the `.paper` and `.paper-text` rules with these (the text label is positioned inside the sheet, so the sheet needs `position: relative`, and the padding now belongs to the label):

```css
.paper {
  position: relative;
  box-sizing: border-box;
  overflow: hidden;
  background: #fffdf5;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 2px;
  box-shadow:
    0 1px 2px rgba(0, 0, 0, 0.12),
    0 6px 14px rgba(0, 0, 0, 0.1);
}
```

If the label's default styles clash with the sheet (text outside the padding, or cut off), check the rules for `.tl-text-label` and `.tl-rich-text-wrapper` in `node_modules/tldraw/tldraw.css` and fix in `index.css`, noting the fix in Findings.

- [x] **Step 6: Switch on the text options**

In `src/Desk.tsx`, import `deeskExtensions` from `./text/textOptions` and extend the options (merge with the camera options; do not replace them):

```tsx
options={{
  camera: { zoomSteps: ZOOM_STEPS },
  text: { tipTapConfig: { extensions: deeskExtensions } },
}}
```

If the option names differ in the installed types, follow the types (docs: "TipTap integration" in `node_modules/tldraw/DOCS.md`) and note the change in Findings.

- [x] **Step 6a: Start writing when a paper is selected and a key is pressed**

Create `src/text/typeToEdit.ts`:

```ts
export interface KeyInfo {
  key: string;
  metaKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
  isComposing: boolean;
}

// A key press that should start writing on the selected paper: one printable character,
// without Cmd or Ctrl, and not Space (Space is tldraw's pan key). Option/Alt is allowed
// because some keyboards make characters such as @ with it.
export function isTypeToEditKey(e: KeyInfo): boolean {
  if (e.metaKey || e.ctrlKey || e.isComposing) return false;
  if (e.key === " ") return false;
  return [...e.key].length === 1;
}
```

Run `npm test`; the `typeToEdit` tests should now pass.

Create `src/text/TypeToEditListener.tsx`. The keydown handler is registered on the window in the capture phase, so it runs before tldraw's single-letter shortcuts, and it only acts when the select tool is idle and exactly one paper is selected. Check the installed types for `Editor#isIn`, `getOnlySelectedShape`, `getRichTextEditor` and `startEditingShapeWithRichText`, and adjust if they differ:

```tsx
import { useEffect } from "react";
import { startEditingShapeWithRichText, useEditor, type Editor } from "tldraw";
import { PAPER_TYPE } from "../shapes/paper/paperTypes";
import { isTypeToEditKey } from "./typeToEdit";

function isTextFieldFocused(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
}

// The editor appears on the next frames after editing starts, so wait for it before typing.
function insertWhenReady(editor: Editor, text: string, framesLeft = 30) {
  const textEditor = editor.getRichTextEditor();
  if (textEditor) {
    textEditor.chain().focus().insertContent(text).run();
    return;
  }
  if (framesLeft > 0) requestAnimationFrame(() => insertWhenReady(editor, text, framesLeft - 1));
}

export function TypeToEdit(): null {
  const editor = useEditor();

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!isTypeToEditKey(e)) return;
      if (isTextFieldFocused(e.target)) return;
      if (!editor.isIn("select.idle")) return;
      const shape = editor.getOnlySelectedShape();
      if (!shape || shape.type !== PAPER_TYPE) return;

      e.preventDefault();
      e.stopPropagation();
      startEditingShapeWithRichText(editor, shape);
      insertWhenReady(editor, e.key);
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [editor]);

  return null;
}
```

In `src/Desk.tsx`, import `TypeToEdit` and render it next to `<ZoomSpring />` inside `<Tldraw>`.

- [x] **Step 7: Run everything, then commit**

Run: `npm run build && npm test`. Expected: both pass. Commit:

```bash
git add -A
git commit -m "feat: write on papers with markdown headers and bold"
```

- [x] **Step 8: User verifies by hand (agent starts `npm run tauri dev`)**

Give the user this list and wait for answers:
1. **Your desk still loads**, with your earlier drawings.
2. **Start writing.** Create a paper, then try all three ways: double-click it; select it and press Enter; or just select it with one click and **start typing**. In every case a text cursor appears, and with typing, the very first letter is kept (it must not be lost). A small formatting bar may appear; ignore it.
2b. **Typing details.** Typing `æ`, `ø` or `å` as the first key on a selected paper works. Typing `#` as the first key and then a space makes a header. Pressing Space, Backspace or Delete on a selected paper does **not** start writing (Backspace or Delete delete the paper). With two papers selected, typing does nothing. Arrow keys still nudge a selected paper.
2c. **The accepted trade-off.** With a paper selected, pressing `p`, `d` or `r` types the letter and does not switch tools. Press Escape (or click the desk) to deselect, and then `p` is the Paper tool again. Cmd shortcuts and the toolbar always work.
3. **Header.** On a new line type `# Title` and a space. It becomes a large header, without you leaving the keyboard.
4. **Bold.** Select some words and press Cmd+B. They turn bold. Cmd+B again turns it off.
5. **Typed characters stay as typed.** Type a straight quote `"` and two dashes `--`. They stay exactly as typed.
6. **Stop editing.** Press Escape: editing stops, and the paper stays selected. Click on the desk: it deselects. Click into a paper's text and then outside it: editing stops.
7. **Text never scales.** Resize the paper from every handle. The text stays the same size, reflowing when narrower and being cut off at the bottom when shorter.
8. **Saving.** Write on two papers, close with the red button, reopen: the text, the header and the bold are all there.
9. **Undo and redo** (Cmd+Z, Cmd+Shift+Z) while writing and after.
10. **Copy and paste a paper:** the copy carries the text.
11. **Typing keys don't trigger shortcuts** while you are writing: letters are letters.
12. **A long text** (paste a few paragraphs): it wraps, and anything below the bottom edge is clipped, not spilling out.

- [x] **Step 9: Commit and ask for confirmation**

Fix anything the hand test found (with a test wherever it can be tested without the canvas), commit, tick this task in the plan, record findings, and ask the user for explicit confirmation that Task 8 is done before starting Task 9.

### Task 8 fixes after the first hand test (2026-10-28)

Found by the user: (1) double-click and Enter selected all the text; (2) typing on a selected paper wrote at the start, then the cursor jumped to the end after about two characters; (3) a pasted paper landed exactly on top of the original. Root causes, from tldraw's source: (1) `Idle.ts` calls `startEditingShape(..., true /* select all */)` for Enter and double-click; without it `RichTextArea` focuses the end of the text after 100 ms. (2) `TypeToEditListener` inserted before that 100 ms focus-to-end ran. (3) tldraw's default tldraw-content paste keeps the original position when the original is on screen.

Decisions (user): typing starts writing only on a **blank** paper (a paper with text needs Enter or double-click); paste offsets the copy **24 px down and to the right**, and each further paste of the same copy steps another 24 px.

New pure logic, tested first:
- `src/text/blankRichText.ts`: `isBlankRichText(richText: unknown): boolean` (true when all text, trimmed, is empty; garbage input counts as blank).
- `src/text/typeToEdit.ts`: `isEnterToEditKey(e: KeyInfo): boolean` (plain Enter only, no Cmd, Ctrl, Alt or Shift, not composing); `KeyInfo` gains an optional `shiftKey`.
- `src/shapes/pasteOffset.ts`: `PASTE_OFFSET_PX = 24`, `MAX_PASTE_STEPS = 50`, `pasteStep(pasted: Point[], existing: Point[]): number` (the smallest step, 0 or more, at which no pasted shape lands within 1 px of an existing shape; looks at where shapes really are, so deleting a copy frees its spot; no counter is kept), `pasteOffset(step): Point`. (A first version kept a paste counter in memory; the user found that it kept growing after copies were deleted, so it was replaced.)

Wiring:
- `PaperShapeUtil.onDoubleClick(shape)` starts editing without select-all, puts the cursor where the user double-clicked (`placeCaretAtPointer` in `src/text/placeCaret.ts`, which emits tldraw's `place-caret` event; if the click was outside any text, tldraw falls back to select-all, so after 250 ms a whole-document selection is collapsed to the end), and returns an empty change `{ id, type }`, which tells tldraw the double click was handled so it skips its own select-all path. Enter still puts the cursor at the end.
- `TypeToEditListener.tsx`: Enter on a selected paper starts editing without select-all; plain typing starts writing only if `isBlankRichText`; the first character is inserted after `focus('end')`.
- `src/shapes/PasteOffsetHandler.tsx` (exports `PasteOffset`): registers a `tldraw` external content handler that calls `defaultHandleExternalTldrawContent`, then, when no explicit paste point was given and the paste selected new shapes, moves exactly those new shapes by `pasteOffset(pasteStep(...))`. Shapes that were already selected before the paste are never moved.

Hand re-test: (a) double-click puts the cursor where you clicked, and when you click in empty space under the text it goes to the end; Enter puts the cursor at the end; nothing is ever selected; (b) typing on a blank selected paper writes at the start and stays there; (c) typing on a paper with text does nothing; (d) Enter and double-click still edit a paper with text, at the end; (e) copy and paste a paper: the copy appears down and right; pasting again steps further; delete the copies and paste again: it is back at the first step; (f) the other Task 8 hand checks that are still unreported.


### Task 9: Tick-boxes on papers

**Goal:** a paper can contain tick-boxes (checklist items). You add one with a **button in the top right** of the window or with **Cmd+Shift+9** (both do the same thing, in every situation: editing a paper, a paper selected, or nothing selected), and you tick or untick a box by clicking it, **even when you are not editing the paper**. No progress indicator.

**Scope (the user asked for the simple version):** tick-boxes only. Nesting with Tab is included because it costs nothing (tldraw already treats task lists as lists for the Tab key). **Drag-to-reorder is not part of this task**; it is left as an optional Task 9b.

**Revised after user feedback (2026-10-28):** the first plan made typing `[ ] ` the main way to add a tick-box. On a Danish keyboard `[` and `]` need Option+Shift, so that is slow. The main ways are now the button and Cmd+Shift+9. The `[ ] ` markdown rule still exists (TipTap provides it) and still works, but nothing advertises it.

**How (from the installed TipTap and tldraw source):**
- TipTap's `TaskList` and `TaskItem` are exported by tldraw (no separate `@tiptap/*` install). `TaskItem` supports Enter to split, Tab to nest (with `nested: true`) and Shift+Tab to un-nest; the editor command `toggleTaskList()` turns the current line into a tick-box item, or back. tldraw's `isEditingRichTextList` already counts `taskList` as a list for Tab.
- When the paper is **not** being edited, tldraw shows static HTML: `<li data-type="taskItem" data-checked="true"><label><input type="checkbox"><span></span></label><div>…</div></li>`. tldraw ships no styles for it, so the paper's CSS has to provide them.
- **Ticking without editing:** tldraw calls a shape's `onClick(shape)` when it is clicked without a drag. If it returns a change, tldraw applies it (with an undo step) and does **not** select the shape; if it returns nothing, the normal select flow continues. The paper's `onClick` finds which checkbox, if any, is under the pointer and returns the same text with that one item toggled. The box is found from the checkbox elements' on-screen rectangles, so it does not depend on tldraw's pointer-events settings. The Nth checkbox in document order is the Nth `taskItem` in the saved text (both are depth-first, top to bottom).
- Defining `onClick` changes one detail of how tldraw selects the paper: it is selected when the mouse button is released, not when it is pressed. Dragging an unselected paper still moves it (tldraw's embeds and bookmarks work this way); the hand test checks this.
- **Layout-independent shortcut:** Cmd+Shift+9 is detected by the physical key (`event.code === "Digit9"`), not by the character, because Shift+9 types `)` on a Danish keyboard. TipTap's own Mod-Shift-9 only works while editing, so the app handles the shortcut itself, in the capture phase like the other keyboard rules.
- **The button** goes in tldraw's style panel (the white panel on the right with the opacity slider), as its own section after `DefaultStylePanelContent`, through the `components` prop that already carries the toolbar (user request: it first went into `SharePanel`, which put it outside the panel). The style panel is only shown while something is selected, so the button is there when a paper is selected or being edited; with nothing selected, Cmd+Shift+9 still creates a new paper with a tick-box.

**What the button and the shortcut do** (one action, three cases):
1. **Editing a paper:** the current line becomes a tick-box, or goes back to a normal line if it already is one.
2. **One paper selected, not editing:** the paper goes into editing and a new, empty tick-box is added at the end, with the cursor in it. (A blank paper just gets its first tick-box.)
3. **Nothing relevant selected:** a new paper appears at the centre of the view, in editing, with an empty tick-box.
(If something that is not a paper is being edited, such as a text label, nothing happens.)

**Design decisions (proposed, to be confirmed by the user)**
- Enter adds the next item; Enter on an empty item leaves the list.
- Ticked items look finished: the text turns grey and is struck through.
- A click on a box ticks it without selecting the paper. A click anywhere else on the paper selects it as before.
- The box size and the gap follow the paper's fixed font size, so resizing a paper never scales them.

**Files:**
- Create: `src/text/taskItems.ts`, `src/text/taskItems.test.ts`
- Create: `src/text/checklistAction.ts`, `src/text/checklistAction.test.ts`
- Create: `src/text/whenRichTextEditorReady.ts`, `src/text/addChecklistItem.ts`, `src/text/ChecklistControls.tsx`, `public/checklist-icon.svg`
- Modify: `src/text/textOptions.ts`, `src/text/textOptions.test.ts`, `src/text/TypeToEditListener.tsx` (use the shared wait helper), `src/shapes/paper/PaperShapeUtil.tsx`, `src/shapes/registry.tsx`, `src/Desk.tsx`, `src/index.css`

**Interfaces:**
- Consumes: Task 8's paper and `deeskExtensions`; tldraw's `TaskList`, `TaskItem`, `TLRichText`, `Editor#inputs.getCurrentScreenPoint`, `Editor#getContainer`, `Editor#getViewportPageBounds`, `startEditingShapeWithRichText`, `TldrawUiButton`, `TldrawUiButtonIcon`.
- Produces:
  - `taskItems.ts`: `interface Box { left: number; top: number; right: number; bottom: number }`; `toggleTaskItem(richText: TLRichText, index: number): TLRichText` (a new document with the `index`th task item, counted depth-first from 0, ticked or unticked; the same object when there is no such item; never changes its input); `checkboxIndexAt(point: { x: number; y: number }, boxes: Box[], slop?: number): number`.
  - `checklistAction.ts`: `type ChecklistAction = { kind: "toggle-line" } | { kind: "add-to-paper"; paperId: string } | { kind: "new-paper" } | { kind: "none" }`; `interface ChecklistContext { editingShapeId: string | null; editingIsPaper: boolean; onlySelectedPaperId: string | null }`; `chooseChecklistAction(ctx: ChecklistContext): ChecklistAction`; `interface ShortcutKey { code: string; metaKey: boolean; ctrlKey: boolean; altKey: boolean; shiftKey: boolean; isComposing?: boolean }`; `isChecklistShortcut(e: ShortcutKey): boolean`.
  - `whenRichTextEditorReady.ts`: `whenRichTextEditorReady(editor: Editor, run: (textEditor: TextEditor) => void, framesLeft?: number): void` (calls `run` once tldraw's text editor exists; gives up after about 30 frames).
  - `addChecklistItem.ts`: `addChecklistItem(editor: Editor): void`.
  - `ChecklistControls.tsx`: `ChecklistButton(): JSX.Element` (the top-right button) and `ChecklistShortcut(): null` (the Cmd+Shift+9 listener, rendered inside `<Tldraw>`).
  - `PaperShapeUtil.onClick(shape)`.
  - `deeskExtensions` now also holds `TaskList` and `TaskItem.configure({ nested: true })`.

- [x] **Step 1: Write the failing tests**

Add to `src/text/textOptions.test.ts`, inside the existing `describe`:

```ts
  it("lets a line be a tick-box item, and nests them", () => {
    expect(schema.nodes.taskList).toBeDefined();
    expect(schema.nodes.taskItem).toBeDefined();
  });
```

Create `src/text/taskItems.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { checkboxIndexAt, toggleTaskItem, type Box } from "./taskItems";

const text = (t: string) => ({ type: "text", text: t });
const paragraph = (t: string) => ({ type: "paragraph", content: [text(t)] });
const item = (t: string, checked?: boolean, ...nested: unknown[]) => ({
  type: "taskItem",
  attrs: checked === undefined ? {} : { checked },
  content: [paragraph(t), ...nested],
});
const list = (...items: unknown[]) => ({ type: "taskList", content: items });
const doc = (...content: unknown[]) => ({ type: "doc", content });

const checkedFlags = (richText: unknown): boolean[] => {
  const flags: boolean[] = [];
  const walk = (node: any) => {
    if (node?.type === "taskItem") flags.push(!!node.attrs?.checked);
    (node?.content ?? []).forEach(walk);
  };
  walk(richText);
  return flags;
};

describe("toggleTaskItem", () => {
  it("ticks the chosen item and leaves the others", () => {
    const rt = doc(list(item("a", false), item("b", false), item("c", false)));
    expect(checkedFlags(toggleTaskItem(rt, 1))).toEqual([false, true, false]);
  });

  it("unticks a ticked item", () => {
    const rt = doc(list(item("a", true), item("b", true)));
    expect(checkedFlags(toggleTaskItem(rt, 0))).toEqual([false, true]);
  });

  it("treats an item with no checked value as unticked", () => {
    const rt = doc(list(item("a")));
    expect(checkedFlags(toggleTaskItem(rt, 0))).toEqual([true]);
  });

  it("counts nested items depth-first, top to bottom", () => {
    // a, b, b1, b2, c  -> indexes 0, 1, 2, 3, 4
    const rt = doc(
      list(item("a", false), item("b", false, list(item("b1", false), item("b2", false))), item("c", false)),
    );
    expect(checkedFlags(toggleTaskItem(rt, 2))).toEqual([false, false, true, false, false]);
    expect(checkedFlags(toggleTaskItem(rt, 3))).toEqual([false, false, false, true, false]);
    expect(checkedFlags(toggleTaskItem(rt, 4))).toEqual([false, false, false, false, true]);
  });

  it("counts only task items, not other content before them", () => {
    const rt = doc(
      { type: "heading", attrs: { level: 1 }, content: [text("Title")] },
      paragraph("intro"),
      { type: "bulletList", content: [{ type: "listItem", content: [paragraph("x")] }] },
      list(item("a", false), item("b", false)),
    );
    expect(checkedFlags(toggleTaskItem(rt, 1))).toEqual([false, true]);
  });

  it("keeps the text of the toggled item", () => {
    const rt = doc(list(item("keep me", false)));
    const toggled = toggleTaskItem(rt, 0) as any;
    expect(toggled.content[0].content[0].content[0].content[0].text).toBe("keep me");
  });

  it("returns the same document when there is no such item", () => {
    const rt = doc(list(item("a", false)));
    expect(toggleTaskItem(rt, 5)).toBe(rt);
    expect(toggleTaskItem(rt, -1)).toBe(rt);
    expect(toggleTaskItem(doc(paragraph("no boxes")), 0)).toEqual(doc(paragraph("no boxes")));
  });

  it("never changes the document it was given", () => {
    const rt = doc(list(item("a", false)));
    const before = JSON.stringify(rt);
    toggleTaskItem(rt, 0);
    expect(JSON.stringify(rt)).toBe(before);
  });
});

describe("checkboxIndexAt", () => {
  const boxes: Box[] = [
    { left: 10, top: 10, right: 30, bottom: 30 },
    { left: 10, top: 50, right: 30, bottom: 70 },
  ];

  it("finds the box under the pointer", () => {
    expect(checkboxIndexAt({ x: 20, y: 20 }, boxes)).toBe(0);
    expect(checkboxIndexAt({ x: 20, y: 60 }, boxes)).toBe(1);
  });

  it("returns -1 when the pointer is not over a box", () => {
    expect(checkboxIndexAt({ x: 100, y: 20 }, boxes)).toBe(-1);
    expect(checkboxIndexAt({ x: 20, y: 40 }, boxes)).toBe(-1);
    expect(checkboxIndexAt({ x: 20, y: 20 }, [])).toBe(-1);
  });

  it("includes the edges, and allows a little slop around the box", () => {
    expect(checkboxIndexAt({ x: 30, y: 30 }, boxes)).toBe(0);
    expect(checkboxIndexAt({ x: 33, y: 20 }, boxes, 4)).toBe(0);
    expect(checkboxIndexAt({ x: 36, y: 20 }, boxes, 4)).toBe(-1);
  });
});
```

Create `src/text/checklistAction.test.ts`:

```ts
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

  it("adds a tick-box to the selected paper when nothing is being edited", () => {
    expect(
      chooseChecklistAction({ editingShapeId: null, editingIsPaper: false, onlySelectedPaperId: "shape:a" }),
    ).toEqual({ kind: "add-to-paper", paperId: "shape:a" });
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
```

- [x] **Step 2: Run to see them fail**

Run: `npm test`. Expected: FAIL (`./taskItems` and `./checklistAction` cannot be resolved; the schema has no `taskList` yet).

- [x] **Step 3: The pure logic**

Create `src/text/taskItems.ts`:

```ts
import type { TLRichText } from "tldraw";

export interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

type Node = { type?: string; attrs?: Record<string, unknown>; content?: Node[] };

// A copy of the document with the `index`th task item (counted depth-first from 0, which
// is also the order the checkboxes appear on screen) ticked or unticked. The same object
// is returned when there is no such item. The input is never changed.
export function toggleTaskItem(richText: TLRichText, index: number): TLRichText {
  let count = 0;
  let found = false;

  const visit = (node: Node): Node => {
    let next = node;
    if (node.type === "taskItem") {
      if (count === index) {
        found = true;
        next = { ...node, attrs: { ...node.attrs, checked: !node.attrs?.checked } };
      }
      count += 1;
    }
    if (!Array.isArray(node.content)) return next;
    return { ...next, content: node.content.map(visit) };
  };

  const result = visit(richText as Node) as unknown as TLRichText;
  return found ? result : richText;
}

// The index of the first box containing the point (widened by `slop` pixels), or -1.
export function checkboxIndexAt(point: { x: number; y: number }, boxes: Box[], slop = 0): number {
  return boxes.findIndex(
    (b) =>
      point.x >= b.left - slop &&
      point.x <= b.right + slop &&
      point.y >= b.top - slop &&
      point.y <= b.bottom + slop,
  );
}
```

Create `src/text/checklistAction.ts`:

```ts
export type ChecklistAction =
  | { kind: "toggle-line" }
  | { kind: "add-to-paper"; paperId: string }
  | { kind: "new-paper" }
  | { kind: "none" };

export interface ChecklistContext {
  editingShapeId: string | null;
  editingIsPaper: boolean;
  onlySelectedPaperId: string | null;
}

// What the "add a tick-box" button and shortcut should do right now.
export function chooseChecklistAction(ctx: ChecklistContext): ChecklistAction {
  if (ctx.editingShapeId !== null) {
    return ctx.editingIsPaper ? { kind: "toggle-line" } : { kind: "none" };
  }
  if (ctx.onlySelectedPaperId !== null) {
    return { kind: "add-to-paper", paperId: ctx.onlySelectedPaperId };
  }
  return { kind: "new-paper" };
}

export interface ShortcutKey {
  code: string;
  metaKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
  isComposing?: boolean;
}

// Cmd+Shift+9 (Ctrl+Shift+9 elsewhere). Found by the physical key, because Shift+9 types
// ")" on a Danish keyboard, and the character would not match.
export function isChecklistShortcut(e: ShortcutKey): boolean {
  if (e.isComposing || e.altKey) return false;
  return (e.metaKey || e.ctrlKey) && e.shiftKey && e.code === "Digit9";
}
```

Run `npm test`. Expected: the `taskItems` and `checklistAction` tests pass (the schema test still fails).

- [x] **Step 4: Switch on the task list extensions**

In `src/text/textOptions.ts`, import `TaskItem` and `TaskList` from `tldraw` and add them to the list:

```ts
import { TaskItem, TaskList, getTipTapDefaultExtensions } from "tldraw";

// tldraw's TipTap defaults (headers with the "# " markdown rule, bold with Cmd+B, italic,
// lists, links), without Typography so characters stay exactly as typed, plus tick-boxes
// (Tab nests them; the app's button and Cmd+Shift+9 add them).
export const deeskExtensions = [
  ...getTipTapDefaultExtensions().filter((e) => e.name !== "typography"),
  TaskList,
  TaskItem.configure({ nested: true }),
];
```

Run `npm test`. Expected: all pass. Commit: `git add src/text && git commit -m "feat: tick-box logic, action choice and task list extensions"`.

- [x] **Step 5: Tick a box by clicking it, without editing**

In `src/shapes/paper/PaperShapeUtil.tsx`, import `checkboxIndexAt` and `toggleTaskItem` from `../../text/taskItems`, mark the sheet so its checkboxes can be found, and add `onClick`. Check the installed types for `onClick` and `getContainer` and adjust if they differ.

On the sheet element, add the attribute: `<div className="paper" data-paper-id={shape.id} style={...}>`.

Add the method:

```tsx
  // A click on a tick-box ticks it, without editing or selecting the paper. A click anywhere
  // else returns nothing, so tldraw selects the paper as usual.
  override onClick(shape: PaperShape) {
    const sheet = document.querySelector(`[data-paper-id="${shape.id}"]`);
    if (!sheet) return;

    const boxes = [...sheet.querySelectorAll<HTMLElement>('li[data-type="taskItem"] > label')].map(
      (el) => {
        const r = el.getBoundingClientRect();
        return { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
      },
    );

    // tldraw's pointer position is relative to the editor's container; the boxes are
    // measured in window coordinates.
    const container = this.editor.getContainer().getBoundingClientRect();
    const pointer = this.editor.inputs.getCurrentScreenPoint();
    const index = checkboxIndexAt(
      { x: pointer.x + container.left, y: pointer.y + container.top },
      boxes,
      3,
    );
    if (index < 0) return;

    return {
      id: shape.id,
      type: PAPER_TYPE,
      props: { richText: toggleTaskItem(shape.props.richText, index) },
    } as const;
  }
```

- [x] **Step 6: Style the tick-boxes**

tldraw ships no styles for task lists. Add to `src/index.css`:

```css
/* Tick-boxes inside a paper. Sizes use em, so they follow the paper's fixed font size. */
.paper ul[data-type="taskList"] {
  list-style: none;
  margin: 0;
  padding-left: 0;
}

.paper ul[data-type="taskList"] ul[data-type="taskList"] {
  padding-left: 1.5em;
}

.paper li[data-type="taskItem"] {
  display: flex;
  align-items: flex-start;
  gap: 0.5em;
}

.paper li[data-type="taskItem"] > label {
  flex: none;
  display: flex;
  align-items: center;
  height: 1.5em; /* one line of text, so the box lines up with the first line */
  user-select: none;
}

.paper li[data-type="taskItem"] > label input {
  width: 1.05em;
  height: 1.05em;
  margin: 0;
  cursor: pointer;
}

.paper li[data-type="taskItem"] > div {
  flex: 1;
  min-width: 0;
}

.paper li[data-type="taskItem"][data-checked="true"] > div {
  color: #8a8a8a;
  text-decoration: line-through;
}

/* When the paper is not being edited the box is only a picture: clicks are handled by the
   paper's onClick, so the browser must not tick it by itself and get out of step. */
.paper .tl-rich-text-wrapper[data-isediting="false"] li[data-type="taskItem"] input {
  pointer-events: none;
}
```

If the line-up of the box with the first line of text looks off, adjust the label `height` and note the change in Findings.

Run `npm run build && npm test`. Expected: both pass. Commit:

```bash
git add -A
git commit -m "feat: tick-boxes on papers, ticked by clicking even when not editing"
```

- [x] **Step 7: Adding a tick-box: the shared action, the shortcut and the top-right button**

Create `src/text/whenRichTextEditorReady.ts`. tldraw's text editor appears a few frames after editing starts, so callers wait for it. Check the type name for the editor in the installed types (`Editor#getRichTextEditor` returns it) and use that type:

```ts
import type { Editor } from "tldraw";

type TextEditor = NonNullable<ReturnType<Editor["getRichTextEditor"]>>;

// Calls `run` once tldraw's text editor exists. Gives up after about 30 frames.
export function whenRichTextEditorReady(
  editor: Editor,
  run: (textEditor: TextEditor) => void,
  framesLeft = 30,
) {
  const textEditor = editor.getRichTextEditor();
  if (textEditor) {
    run(textEditor);
    return;
  }
  if (framesLeft > 0) {
    requestAnimationFrame(() => whenRichTextEditorReady(editor, run, framesLeft - 1));
  }
}
```

In `src/text/TypeToEditListener.tsx`, replace the local `insertWhenReady` function with a call to this helper (same behaviour: `focus("end")` first, then insert):

```tsx
      whenRichTextEditorReady(editor, (textEditor) =>
        textEditor.chain().focus("end").insertContent(e.key).run(),
      );
```

(import it from `./whenRichTextEditorReady`, and delete `insertWhenReady` and its comment). Run `npm test && npm run build` to confirm nothing changed.

Create `src/text/addChecklistItem.ts`:

```ts
import { createShapeId, startEditingShapeWithRichText, type Editor, type TLShapeId } from "tldraw";
import { paperPlacement } from "../shapes/paper/paperPlacement";
import { PAPER_TYPE, type PaperShape } from "../shapes/paper/paperTypes";
import { chooseChecklistAction } from "./checklistAction";
import { isBlankRichText } from "./blankRichText";
import { whenRichTextEditorReady } from "./whenRichTextEditorReady";

// The button and Cmd+Shift+9 both do this. See chooseChecklistAction for the three cases.
export function addChecklistItem(editor: Editor) {
  const editingId = editor.getEditingShapeId();
  const editingShape = editingId ? editor.getShape(editingId) : undefined;
  const selected = editor.getOnlySelectedShape();

  const action = chooseChecklistAction({
    editingShapeId: editingId,
    editingIsPaper: editingShape?.type === PAPER_TYPE,
    onlySelectedPaperId: selected?.type === PAPER_TYPE ? selected.id : null,
  });

  switch (action.kind) {
    case "toggle-line":
      editor.getRichTextEditor()?.chain().focus().toggleTaskList().run();
      return;

    case "add-to-paper": {
      const paper = editor.getShape(action.paperId as TLShapeId) as PaperShape | undefined;
      if (!paper) return;
      const blank = isBlankRichText(paper.props.richText);
      startEditingShapeWithRichText(editor, paper);
      whenRichTextEditorReady(editor, (textEditor) => {
        const chain = textEditor.chain().focus("end");
        // Start a new line for the new item, unless the paper is blank or already ends on one.
        if (!blank && textEditor.state.doc.lastChild?.textContent.trim() !== "") {
          chain.insertContentAt(textEditor.state.doc.content.size, { type: "paragraph" });
        }
        chain.focus("end").toggleTaskList().run();
      });
      return;
    }

    case "new-paper": {
      const id = createShapeId();
      const { x, y } = paperPlacement(editor.getViewportPageBounds().center);
      editor.createShape({ id, type: PAPER_TYPE, x, y });
      editor.select(id);
      startEditingShapeWithRichText(editor, id);
      whenRichTextEditorReady(editor, (textEditor) =>
        textEditor.chain().focus("end").toggleTaskList().run(),
      );
      return;
    }

    case "none":
      return;
  }
}
```

Create `public/checklist-icon.svg` (a box with a tick; tldraw colours icons itself):

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="2" fill="none" stroke="black" stroke-width="1.5"/><path d="M8 12.5l3 3 5-6" fill="none" stroke="black" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
```

Create `src/text/ChecklistControls.tsx`. Check the installed exports for `TldrawUiButton` and `TldrawUiButtonIcon` and their props (look at how `DefaultToolbar` or other built-in UI uses them) and adjust:

```tsx
import { useEffect } from "react";
import { TldrawUiButton, TldrawUiButtonIcon, useEditor } from "tldraw";
import { addChecklistItem } from "./addChecklistItem";
import { isChecklistShortcut } from "./checklistAction";

// The button in the top-right corner.
export function ChecklistButton() {
  const editor = useEditor();
  return (
    <div style={{ pointerEvents: "all" }}>
      <TldrawUiButton
        type="icon"
        title="Add a tick-box (Cmd+Shift+9)"
        onClick={() => addChecklistItem(editor)}
      >
        <TldrawUiButtonIcon icon="checklist-icon" />
      </TldrawUiButton>
    </div>
  );
}

// Cmd+Shift+9. Capture phase, so it runs before tldraw's and TipTap's own handling, and
// works the same whether or not a paper is being edited.
export function ChecklistShortcut(): null {
  const editor = useEditor();

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!isChecklistShortcut(e)) return;
      e.preventDefault();
      e.stopPropagation();
      addChecklistItem(editor);
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [editor]);

  return null;
}
```

In `src/shapes/registry.tsx`: add `"checklist-icon": "/checklist-icon.svg"` to `assetUrls.icons`, and add `SharePanel: ChecklistButton` to `uiComponents` (import `ChecklistButton` from `../text/ChecklistControls`). If `SharePanel` does not place the button in the top-right corner, try `TopPanel` or `MenuPanel` and note the choice in Findings.

In `src/Desk.tsx`, import `ChecklistShortcut` and render it next to the other listeners inside `<Tldraw>`.

Run `npm run build && npm test`. Expected: both pass. Commit:

```bash
git add -A
git commit -m "feat: add a tick-box from a top-right button or Cmd+Shift+9"
```

- [x] **Step 8: User verifies by hand (agent starts `npm run tauri dev`)**

Give the user this list and wait for answers:
1. **The button.** A tick-box button appears in the top-right corner. Hovering shows what it does.
2. **Nothing selected.** Click the button: a new paper appears at the centre of the view, in editing, with an empty tick-box. Type some text.
3. **A paper selected.** Select a blank paper (single click) and click the button: its first line becomes a tick-box. Select a paper that has text and click the button: it goes into editing and a new tick-box is added at the end, with the cursor in it.
4. **While editing.** Click into a line of a paper and click the button (or press Cmd+Shift+9): that line becomes a tick-box. Do it again: it goes back to a normal line.
5. **Cmd+Shift+9** does the same in all three situations. It works on your keyboard layout.
6. **Enter and Tab.** Enter adds the next item; Enter on an empty item leaves the list. Tab nests an item, Shift+Tab un-nests.
7. **Tick while editing** by clicking a box.
8. **Tick without editing.** Stop editing and deselect the paper. Click a box: it ticks, the text turns grey and struck through, **and the paper does not get selected**. Click again: it unticks.
9. **Undo and redo** (Cmd+Z, Cmd+Shift+Z) a tick, and the adding of a tick-box.
10. **Mixed content.** Put a header, a paragraph, a bullet list and a checklist in one paper. Tick the second box: exactly that one toggles. Tick a nested one: the right one toggles.
11. **Saving.** Tick some boxes, close with the red button, reopen: the ticks are still there.
12. **Resizing and zoom.** Resize the paper: the boxes and text keep their size. Zoom in and out and tick a box at different zoom levels: it always hits the right one.
13. **Nothing else broke.** Dragging an unselected paper still moves it in one go. A click on the text selects the paper (when you release the button). Shift-click still multi-selects. Double-click still edits, at the click point. Enter on a selected paper still edits.
14. **Copy and paste** a paper that has a checklist: the copy ticks independently of the original.
15. **A click just outside a box**, on the text, does not tick it.

- [x] **Step 9: Commit and ask for confirmation**

Fix anything the hand test found (with a test wherever it can be tested without the canvas), commit, tick this task in the plan, record findings, and ask the user for explicit confirmation that Task 9 is done before starting Task 10.

### Task 9b (optional): Reorder tick-box items

- **Goal:** drag a checklist item up or down, or move it with the keyboard.
- **Note:** left out of Task 9 at the user's request for a simpler first version. Expand into steps before building, if wanted.

### Task 10: Figures on papers

**Goal:** boxes, ellipses, lines, arrows, drawings and text that you draw or drop **on a paper** become part of that paper: they move, rotate and get deleted and copied with it, and are clipped at its edge. (Arrows are the one exception to clipping; see below.)

**How (from the installed tldraw source):**
- tldraw's `createShapes` already picks a parent for any new shape that has a position: the topmost shape under that point whose `canReceiveNewChildrenOfType(shape, type)` says yes. So once the paper says yes, **drawing a box on a paper needs no extra code**: the box becomes the paper's child. The paper's default answer is no, which is why nothing happens today.
- For shapes that already exist, tldraw calls `onDragShapesIn` when a dragged shape enters a container, and `onDragShapesOut` when it leaves. A container reparents the shape in `onDragShapesIn` (`editor.reparentShapes`), and back to the page in `onDragShapesOut`.
- Children are clipped by the container's `getClipPath` (a polygon in the paper's own coordinates) and `shouldClipChild` (which children).
- Children are saved with the desk like any other shape, with `parentId` pointing at the paper. **No schema change, so no migration.**
- **Not used on purpose:** tldraw's ready-made `BaseFrameLikeShapeUtil` base class. A "frame-like" shape lets clicks pass through its body (only its title and border select it), which would make a paper impossible to select by clicking its sheet and would break clicking tick-boxes. The paper keeps its current base class (`BaseBoxShapeUtil`), and the container hooks are added by hand, copying the pattern in `BaseFrameLikeShapeUtil.tsx` without `isFrameLike`.

**What it does**
- **What a paper accepts:** every shape type except another paper (papers never nest; overlapping papers just stack). A paper that is locked accepts nothing and lets nothing leave.
- **Clipping:** children are cut off at the paper's edge, **except arrows**, so a connector can leave a paper and run to another paper or to the desk (this is tldraw's own rule for frames).
- **Resizing a paper does not scale or move its figures:** they keep their size and their place relative to the paper's top-left corner (the same rule as the text), and anything beyond the edge is clipped. Pulling the paper back out reveals it again.
- **Dragging** a shape from the desk onto a paper makes it part of the paper. Dragging a figure off the paper makes it a desk shape again.
- **Pasting** while a paper is selected puts pasted figures into that paper (tldraw's own rule once the paper accepts them).

**Design decisions (proposed, to be confirmed by the user)**
- Arrows are not clipped (as above). The alternative is to clip them too, which stops connectors leaving a paper.
- Figures do not scale when the paper is resized (as above).

**Files:**
- Create: `src/shapes/paper/paperContainer.ts`, `src/shapes/paper/paperContainer.test.ts`
- Modify: `src/shapes/paper/PaperShapeUtil.tsx`

**Interfaces:**
- Consumes: Task 7 and 8's `PaperShapeUtil` and `PAPER_TYPE`; tldraw's `Vec`, `TLShape`, `TLDragShapesOutInfo`, `Editor#reparentShapes`, `Editor#hasAncestor`, `Editor#getCurrentPageId`.
- Produces:
  - `paperContainer.ts`: `paperAccepts(type: string, isLocked: boolean): boolean` (false for `"paper"` and when locked); `paperClips(type: string): boolean` (false only for `"arrow"`); `paperClipRect(w: number, h: number): { x: number; y: number }[]` (the four corners of the paper's rectangle, clockwise from the top-left).
  - `PaperShapeUtil` gains `canReceiveNewChildrenOfType`, `canRemoveChildrenOfType`, `canResizeChildren`, `getClipPath`, `shouldClipChild`, `onDragShapesIn`, `onDragShapesOut`.

- [x] **Step 1: Write the failing tests**

Create `src/shapes/paper/paperContainer.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { paperAccepts, paperClipRect, paperClips } from "./paperContainer";

describe("paperAccepts", () => {
  it("accepts the figure types you draw on a paper", () => {
    for (const type of ["geo", "arrow", "draw", "line", "highlight", "text", "note", "image"]) {
      expect(paperAccepts(type, false)).toBe(true);
    }
  });

  it("never accepts another paper, so papers do not nest", () => {
    expect(paperAccepts("paper", false)).toBe(false);
  });

  it("accepts nothing while locked", () => {
    expect(paperAccepts("geo", true)).toBe(false);
    expect(paperAccepts("arrow", true)).toBe(false);
  });
});

describe("paperClips", () => {
  it("clips figures at the paper's edge", () => {
    for (const type of ["geo", "draw", "line", "text", "note", "image"]) {
      expect(paperClips(type)).toBe(true);
    }
  });

  it("lets arrows leave the paper, so connectors can reach other papers", () => {
    expect(paperClips("arrow")).toBe(false);
  });
});

describe("paperClipRect", () => {
  it("is the paper's rectangle, clockwise from the top-left corner", () => {
    expect(paperClipRect(300, 380)).toEqual([
      { x: 0, y: 0 },
      { x: 300, y: 0 },
      { x: 300, y: 380 },
      { x: 0, y: 380 },
    ]);
  });

  it("follows the size, so resizing the paper moves the clip edge", () => {
    expect(paperClipRect(120, 120)[2]).toEqual({ x: 120, y: 120 });
  });
});
```

- [x] **Step 2: Run to see them fail**

Run: `npm test`. Expected: FAIL (`./paperContainer` cannot be resolved).

- [x] **Step 3: The pure rules**

Create `src/shapes/paper/paperContainer.ts`:

```ts
import { PAPER_TYPE } from "./paperTypes";

// Whether a paper takes a shape of this type as one of its figures. Papers never nest, so
// overlapping papers just stack; a locked paper accepts nothing.
export function paperAccepts(type: string, isLocked: boolean): boolean {
  return !isLocked && type !== PAPER_TYPE;
}

// Whether a figure is cut off at the paper's edge. Arrows are not, so a connector can run
// from a paper to something outside it (tldraw's own rule for frames).
export function paperClips(type: string): boolean {
  return type !== "arrow";
}

// The paper's rectangle in its own coordinates, clockwise from the top-left corner.
export function paperClipRect(w: number, h: number): { x: number; y: number }[] {
  return [
    { x: 0, y: 0 },
    { x: w, y: 0 },
    { x: w, y: h },
    { x: 0, y: h },
  ];
}
```

Run `npm test`. Expected: PASS. Commit: `git add src/shapes/paper && git commit -m "feat: paper container rules"`.

- [x] **Step 4: Make the paper a container**

In `src/shapes/paper/PaperShapeUtil.tsx`, import `Vec`, `type TLDragShapesOutInfo` and `type TLShape` from `tldraw`, and the three rules from `./paperContainer`. Check the installed types for each hook (`ShapeUtil.ts` in `@tldraw/editor`) and adjust if they differ. Add these methods to the class:

```tsx
  // The paper is a container for figures: boxes, lines, drawings and so on. tldraw makes a
  // new shape drawn on the paper its child once this says yes.
  override canReceiveNewChildrenOfType(shape: PaperShape, type: TLShape["type"]) {
    return paperAccepts(type, shape.isLocked);
  }

  override canRemoveChildrenOfType(shape: PaperShape, _type: TLShape["type"]) {
    return !shape.isLocked;
  }

  // Resizing the paper changes only the sheet. Figures keep their size and their place
  // relative to its top-left corner, like the text, and are clipped at the new edge.
  override canResizeChildren() {
    return false;
  }

  override getClipPath(shape: PaperShape) {
    return paperClipRect(shape.props.w, shape.props.h).map(({ x, y }) => new Vec(x, y));
  }

  override shouldClipChild(child: TLShape) {
    return paperClips(child.type);
  }

  // Dragging a shape onto the paper makes it a figure on it.
  override onDragShapesIn(shape: PaperShape, draggingShapes: TLShape[]) {
    const incoming = draggingShapes.filter(
      (s) => paperAccepts(s.type, shape.isLocked) && s.parentId !== shape.id,
    );
    if (incoming.length === 0) return;
    // A shape that contains this paper (for example a group) cannot become its child.
    if (incoming.some((s) => this.editor.hasAncestor(shape, s.id))) return;
    this.editor.reparentShapes(incoming, shape.id);
  }

  // Dragging a figure off the paper makes it a desk shape again, unless it is being dragged
  // straight onto another container.
  override onDragShapesOut(shape: PaperShape, draggingShapes: TLShape[], info: TLDragShapesOutInfo) {
    if (info.nextDraggingOverShapeId) return;
    const leaving = draggingShapes.filter((s) => s.parentId === shape.id);
    if (leaving.length === 0) return;
    this.editor.reparentShapes(leaving, this.editor.getCurrentPageId());
  }
```

Run `npm run build && npm test`. Expected: both pass. Commit:

```bash
git add -A
git commit -m "feat: figures drawn or dropped on a paper become part of it"
```

- [x] **Step 5: User verifies by hand (agent starts `npm run tauri dev`)**

Give the user this list and wait for answers:
1. **Drawing on a paper.** With the rectangle tool, draw a box on a paper. Move the paper: the box moves with it. Draw a box that sticks out over the paper's edge: the part outside is cut off.
2. **Other figures.** Do the same with an ellipse, a line, a freehand drawing, a text label and a note.
3. **An arrow on one paper.** Draw two boxes on a paper and an arrow between them. Move the paper: all three move together and the arrow stays attached.
4. **An arrow between two papers.** Draw an arrow from a box on paper A to paper B. It runs out of paper A (it is not cut off), and stays attached when you move either paper.
5. **Dragging in and out.** With the select tool, drag a box from the desk onto a paper: it becomes part of the paper, and moves when the paper moves. Drag a figure off the paper: it becomes a desk shape again and stays put when the paper moves.
6. **Resizing.** Resize the paper smaller and larger: figures keep their size and their place relative to the top-left corner, anything past the edge is cut off, and making the paper bigger again shows it. Pulling the left or top edge moves the figures with that corner.
7. **Papers never nest.** Drag one paper over another: they overlap and stack, and neither becomes part of the other.
8. **Rotating.** Rotate a paper that has figures: they rotate with it and the clipping follows.
9. **Delete and undo.** Delete a paper with figures: they go too, and Cmd+Z brings everything back.
10. **Copy and paste.** Copy a paper with figures: the copy has them too. Copy a box, select a paper, paste: the box lands inside the paper.
11. **Saving.** Close with the red button and reopen: figures are still part of their papers (move a paper to check).
12. **Nothing else broke.** Text editing and tick-boxes still work on a paper with figures. Clicking a figure selects the figure; clicking the sheet selects the paper. Double-click a figure edits its own label; double-click the sheet edits the paper's text.
13. **Undo and redo** drawing a figure and dragging one in or out.
14. **Selecting several papers.** A drag-to-select box over empty desk still selects papers the way it did before.

- [x] **Step 6: Commit and ask for confirmation**

Fix anything the hand test found (with a test wherever it can be tested without the canvas), commit, tick this task in the plan, record findings, and ask the user for explicit confirmation that Task 10 is done before starting Task 11.

### Task 11: Focus dim

- **Goal:** while editing a paper, every other shape is dimmed. The camera never moves.
- **Files:** `src/focus/useFocusDim.ts`, styles. A test asserts the camera is unchanged before and after focusing a paper.
- **Acceptance:** dim on edit, restored on exit, no camera change.

### Task 12: Stickers

- **Goal:** small coloured circles from a fixed palette, placeable on the desk or on a paper.
- **Files:** `src/shapes/sticker/StickerShapeUtil.tsx`, `src/shapes/sticker/palette.ts`, a toolbar entry.
- **Acceptance:** place stickers in each colour; they persist and can sit on papers.

### Task 13: Glue

- **Goal:** a per-paper toggle that blocks move and resize, with a small visual cue.
- **Files:** `src/rules/glue.ts` (pure: can this shape move or resize?), integration in `PaperShapeUtil`, tests in `src/rules/glue.test.ts`.
- **Interfaces:** `isGlued(shape): boolean`; glued papers reject translate and resize.
- **Acceptance:** a glued paper cannot be dragged or resized until unglued.

### Task 14: Pin

- **Goal:** a pin-icon shape. Placing it pins every paper under it. Removing it releases them.
- **Files:** `src/shapes/pin/PinShapeUtil.tsx`, `src/rules/pin.ts` (pure: which papers lie under a pin point; pinned set), tests in `src/rules/pin.test.ts`.
- **Interfaces:** `papersUnderPin(pin, papers): PaperId[]`; pinned papers reject translate and resize until the pin is deleted.
- **Acceptance:** place a pin over several papers, none can move. Delete the pin and they all can. Persists across relaunch.

### Task 15: Images and assets folder

- **Goal:** paste or drop images onto the desk or a paper. Files are stored in `assets/` beside `desk.json`.
- **Files:** `src/persistence/assets.ts`, Tauri fs scope update, tests for asset path handling.
- **Acceptance:** an image survives relaunch and the app stays usable if an asset file is missing (placeholder, no crash).

### Task 16: Command palette, search and built-in canvas aids

- **Goal:** Cmd+K palette, search across paper text, and tldraw's minimap, snapping and alignment guides switched on.
- **Files:** `src/palette/CommandPalette.tsx`, `src/search/index.ts`, tests for the search index.
- **Acceptance:** Cmd+K opens the palette; searching finds papers by text and jumps there only when the user picks a result (an explicit user action, not an automatic camera move).

### Task 17: Themes and export

- **Goal:** a light and dark theme (the table colour for dark is chosen then), plus export of papers or the desk as PNG, SVG and Markdown.
- **Files:** `src/theme.ts` (extend), `src/export/*.ts`, tests for the Markdown exporter.
- **Acceptance:** the theme toggle works and persists; each export format produces a valid file.

---

## Findings

(Added during execution: licence behaviour of the packaged app, tldraw API changes, anything the next session should know.)

- **Tasks 1-3 done (2026-10-27).** Rust 1.99.1 installed by the user. App opens, cream `#FFF6D8` table confirmed by the user, stays cream in macOS dark mode, resizing fine.
- **tldraw 5.5.2 API differences from this plan's Task 3 text:** the `inferDarkMode` prop no longer exists; use `colorScheme="light"` (it defaults to light). The canvas variable is only `--tl-color-background` (no `--color-background`). The licence prop is `licenseKey`, documented as "License key to remove watermark".
- **Dev mode shows a notice at bottom right: "get a license for production".** A hobby key is expected to change this to the "made with tldraw" mark (Task 4).
- **Arrows:** tldraw arrows have `kind: 'arc' | 'elbow'` (elbow = right-angle routing). The user wants angled arrows; they are available in the style panel. A default-kind setting is a possible later task.
- **Known, accepted:** brief delayed rendering of off-screen shapes when zooming back out. Revisit only if it bothers the user with real content.
- **Task 4 result (2026-10-27): the packaged app does NOT work without a licence key.** Built `Deesk.app` (release) opens a window but shows only the cream page background: no toolbar, no canvas. A debug bundle (`npm run tauri build -- --debug --bundles app`, which enables right-click Inspect Element) shows the console error: "No tldraw license key provided! A license is required for production deployments. Please reach out to sales@tldraw.com to purchase a license." So tldraw treats the packaged app as production and refuses to render. `npm run tauri dev` is unaffected.
- **Next for the dock app:** the user requests a tldraw hobby key (https://tldraw.dev/pricing), asking for the host `tauri://localhost` if the form allows it, then puts it in `.env.local` as `VITE_TLDRAW_LICENSE_KEY=...`, and the app is rebuilt with `npm run tauri build`. Whether a hobby key is approved for a `tauri://` origin is not yet known. If it is declined, the fallback is the custom-canvas swap described in the spec.
- **Until the key arrives:** use `npm run tauri dev` for all development and testing (Tasks 5 onward).
- **Licence host details (2026-10-27, from the debug app and `@tldraw/editor` LicenseManager source):** inside the packaged app `location.origin` is `tauri://localhost`, so the hostname tldraw checks is `localhost`. tldraw only treats `http:`/`https:` pages as development, so a `tauri:` origin counts as production. A key's host list is compared against that hostname (so the host to request is `localhost`). tldraw also has a NATIVE_LICENSE flag where hosts are regexes matched against the full URL (`tauri://localhost/`); whether a hobby key can be native is up to tldraw. The user is requesting the hobby key via the form at https://tldraw.dev/pricing, falling back to emailing sales@tldraw.com.
- **Repo is on GitHub (2026-10-27), pushed by the user** at https://github.com/OliverDue/deesk (personal account OliverDue; commits authored as lio@live.dk via repo-local git config). The agent never uses gh or pushes.
- **Task 4 verified with a key (2026-10-27):** with a 14-day tldraw trial key in `.env.local` (user-created; the agent never reads that file), the rebuilt release `Deesk.app` shows the canvas and tools, drawing works, and no watermark appears. The trial expires around 2026-11-10; after that the packaged app goes blank again until a longer-lived key is in `.env.local` and the app is rebuilt. Installing into /Applications and the dock was skipped on purpose for now (Task 4 steps 5 is deferred by the user).
- **Process agreed with the user:** at the end of every task the agent states what was verified and waits for the user's explicit confirmation before starting the next task.
- **Task 5 done (2026-10-27), all hand checks passed by the user.** Autosave, atomic writes, restore of desk and view, backup recovery, damaged-file quarantine and view self-healing all verified. 27 automated tests pass. Deviations from the Task 5 text above, already applied in code:
  - `fs:default` was replaced by the six exact fs permissions plus `fs:scope-appdata` and `fs:scope-appdata-recursive` (the default only grants read, across five folders).
  - **The close handler needs `core:window:allow-destroy`** in `src-tauri/capabilities/default.json`. Without it the red close button silently does nothing (console: "window.destroy not allowed"). Only a real-window test finds this.
  - `ensureDataDir` uses the absolute `appDataDir()` path, not `mkdir("")`.
  - `loadDesk` now writes `desk.json` back immediately after recovering from the backup (`restoreFromBackup`), so a recovered desk does not wait for the next edit.
  - A copied file keeps the source's modification time, so a restored `desk.json` shows the backup's timestamp.
- **Environment note:** `! npm run tauri add fs` failed until `source "$HOME/.cargo/env"` was run first (the `!` shell had no cargo on PATH). `npm run tauri dev` is started by the agent with that line; the user cannot relaunch the dev app by clicking.
- **Known limit:** autosave waits 0.5 s (view: 1 s) after the last change, so Cmd+Q within that window can lose the last edit; the red close button flushes first.
- **Task 6 user feedback (2026-10-27):** the first version zoomed about the window centre, so content under the mouse drifted away as it eased back. Fixed: the spring now zooms about the mouse pointer (`springAnchor`, with a window-centre fallback). Quick repeated pinching during the ease-back cancels the animation by design (tldraw stops camera animations on user input).
- **Task 6 done (2026-10-28), accepted by the user as "fine for now".** 41 automated tests pass. Known limitation, accepted: the spring starts only after the user stops zooming for `SPRING_IDLE_MS`, so continuous zoom spamming can stay past the soft limit indefinitely (up to the hard stops). Possible later improvement: a cap, so the spring also starts after N seconds past a limit even while the user keeps zooming. Numbers (soft 10%-400%, hard 5%-800%, 350 ms idle, rest factor 0.85, 450 ms animation) are unchanged from the proposal and live in `src/camera/springConfig.ts`.
- **Task 7 bug found by the first launch (2026-10-28):** `createTLStore({ shapeUtils: [PaperShapeUtil] })` replaced tldraw's built-in shapes instead of adding to them, so the window stayed blank with "Migration 'com.tldraw.binding.arrow/1' depends on missing migration 'com.tldraw.shape.arrow/4'". The `<Tldraw shapeUtils>` prop merges with the defaults; `createTLStore` does not. Fixed: the store uses `storeShapeUtils = [...defaultShapeUtils, ...shapeUtils]` plus `bindingUtils: defaultBindingUtils` (in `src/shapes/registry.tsx`). A regression test (`src/shapes/registry.test.ts`) builds the real store. **Rule for every later custom shape:** add it to `shapeUtils` in the registry; `storeShapeUtils` picks it up.
- **Task 7 done (2026-10-28), all hand checks passed by the user.** Papers can be created (toolbar button or P; P was confirmed free), moved, rotated, resized (text never scales), stacked, copied, deleted, undone, attached to arrows, and saved/restored with the desk. 49 automated tests pass. Papers show a fixed placeholder line only; editing text is Task 8. Colours are Task 7b.
- **Task 8 done (2026-10-28), all hand checks passed by the user ("all perfect").** Papers take text through tldraw's bundled TipTap (no separate `@tiptap/*` install): headers with `# `, bold with Cmd+B, bullet lists, saved with the desk. Typography is off. Ways in: double-click (cursor at the click point, or at the end when clicking empty space), Enter (cursor at the end), or typing on a **blank** selected paper (a paper with text ignores plain typing). Pasted copies move to the first free spot down and to the right (no counter). 81 automated tests pass. Details of bugs found along the way are in the Task 8 fixes section above.
- **Lessons recorded:** (1) a name differing only by capitals clashes on macOS; (2) tldraw hard-codes select-all for Enter and double-click, so a custom shape takes over those paths through `onDoubleClick` and its own key listener; (3) a counter kept in memory is the wrong tool when the right answer depends on what is on the desk, so look at the desk instead.
- **Known gap, not yet fixed:** if a saved desk fails tldraw's validation on load (for example a paper in an old format), `useDeskStore` throws and the window stays blank; the backup fallback only covers unreadable JSON, not a snapshot that parses but is rejected. Candidate for a small robustness task.
- **Task 9 first hand test (2026-10-28), two findings:** (1) TipTap's *editing* version of a task item (its node view) has **no `data-type=\"taskItem\"` attribute**, only the static HTML has it, so CSS keyed on `li[data-type=\"taskItem\"]` did nothing while editing and the box sat on its own line above the text. The tick-box CSS now matches by structure: `ul[data-type=\"taskList\"] > li` (the task list itself has the attribute in both versions). (2) The same rule keeps the hidden editor under a selected paper from ticking boxes by itself and cancelling the `onClick` toggle (its checkboxes now ignore the pointer while not editing). The `onClick` hit test deliberately still uses `li[data-type=\"taskItem\"] > label`, which only exists in the static version, so each box is counted once.
- **Task 9 nesting indent (2026-10-28):** a nested tick-box was too far right (user). A nested list already sits inside its parent's text column, so the extra 1.5em padding doubled the indent; it is now 0, which halves the distance and lines the nested box up under the parent's text.
- **Task 9 done (2026-10-28), all hand checks passed by the user.** Tick-boxes on papers: added with a button in the style panel or Cmd+Shift+9 (found by physical key, so it works on a Danish keyboard), with three cases (editing: toggle the line; paper selected: add an item at the end; nothing selected: new paper with an item; the button is only visible while something is selected). Ticked by clicking, even when the paper is not being edited and without selecting it. Tab nests (half the original indent), Enter adds the next item, ticked items are grey and struck through. Saving verified on disk (3 items, 1 ticked). 102 automated tests pass. Typing `[ ] ` still works (TipTap's rule) but is not advertised: it needs Option+Shift chords on a Danish keyboard. Drag-to-reorder is Task 9b, optional.
- **Task 10 fixes after the first hand test (2026-10-28), user's six points:**
  1. *Aiming an arrow at a box on a paper needed the outline.* Cause (tldraw `Editor.getShapeAtPoint`): a hollow shape is only a fallback candidate, and reaching a **filled** shape below it (the paper's sheet) returns that one without using the fallback; frames have a special case, papers did not. Fix: `installFigureHitTest` in `src/shapes/editorTweaks.ts` wraps `getShapeAtPoint`; in `hitInside` mode (arrow targeting), when the result is a paper it searches again without the paper and prefers a figure of that paper.
  2. *Freehand strokes should run past the paper's edge.* `paperClips` is now false for `arrow`, `draw` and `highlight`; they stay children of the paper.
  3. *A paper cannot be resized smaller than its figures.* `onResize` computes `contentMinSize` from the clipped figures' bounds in the paper's coordinates (`boundsInParent`) and passes it to `resizeBox` as the minimum. Unclipped types (arrows, strokes) do not count. A figure that already sticks out makes the minimum larger than the current size, so such a paper grows on its next resize.
  4. *Deleting the last anchor of an arrow deletes the arrow.* tldraw runs all before-delete callbacks first, then removes everything at once, so the check cannot live in a delete callback. `installOrphanedArrowCleanup` notes (before-delete) which arrows were bound to the shapes being deleted and, in `registerOperationCompleteHandler`, deletes those with no binding left (`arrowsToDelete`). Applies to every shape on the desk, not only papers. Arrows never anchored, and arrows whose end is dragged off a shape, are untouched.
  5. *Copying papers copies the arrows between their figures.* `installCopyWithConnectors` wraps `getContentFromCurrentPage` (used by copy, cut and export) and adds arrows whose two ends are both anchored inside the copied shapes and their descendants (`connectingArrowIds`). Duplicate (Cmd+D) is not covered.
  6. *Same font for paper text and box text:* the user chose a clean system font (not Shantell Sans). See the font bullet below.
- **`src/shapes/editorTweaks.ts` holds three deliberate patches of editor methods** (`getShapeAtPoint`, `getContentFromCurrentPage`, plus two side-effect handlers), each undone when the component unmounts. They are a workaround for papers being containers; revisit them on a tldraw upgrade.
- **FINDING, offline use (not yet fixed): tldraw loads its fonts and icons from a CDN by default.** tldraw's docs: the SDK's fonts (IBM Plex, Shantell Sans) and assets "are loaded automatically from the CDN or self-hosted static assets". Deesk is meant to be fully local, so without a network it may show missing icons or fall back to other fonts. The fix is to pass `assetUrls` built with `getAssetUrlsByImport()` from `@tldraw/assets/imports.vite` (bundled by Vite). Recommended as its own task (Task 18) before relying on the app offline; check by running the app with the network off.
- **Task 10 fix 4 did not work the first time (user), and why:** tldraw removes an arrow's connections to a shape *before* its before-delete callbacks run (logged: `bindingsToShape=0` inside the callback), so the callback approach could never flag an arrow. Fixed by wrapping `deleteShapes` (look at the arrows anchored to the shapes and their children first, let tldraw delete, then delete the noted arrows with no anchor left).
- **TECHNIQUE: a real tldraw `Editor` runs inside Vitest (jsdom).** `new Editor({ store, shapeUtils: storeShapeUtils, bindingUtils: defaultBindingUtils, tools: [], getContainer })` works, with `editor.updateViewportScreenBounds(new Box(0, 0, 1200, 800))` for hit-testing. `src/shapes/editorTweaks.test.ts` uses it to test deletion, arrow aiming, copy and undo end to end, including control tests that show the bug exists without the tweak. Prefer this to hand-testing whenever behaviour lives in the editor.
- **Font (user, 2026-10-28): a clean system font, not Shantell Sans.** `src/text/deeskTheme.ts` overrides the default theme's `fonts` so that tldraw's `draw` and `sans` font styles use the same stack as the papers (`PAPER_FONT_FAMILY`), `serif` and `mono` use system serif and monospace, and no font has files to download. Existing boxes (saved with `font: draw`) change too, with no change to saved data. Passed to `<Tldraw themes={{ default: deeskTheme }}>`. This also removes tldraw's font downloads from the offline concern; the icons and other assets still come from the CDN (Task 18).
- **Task 10: restored arrow ended up behind a paper after undo (user, 2026-10-28), and why.** tldraw's `ArrowBindingUtil` (`reparentArrow`) keeps an arrow stacked directly above the highest shape it is anchored to, and reapplies that whenever an anchor binding is created or changed, undo included. With one anchor deleted first, undoing the second deletion re-creates a binding to the box on the *lower* paper only, so tldraw dropped the arrow to just above that paper: behind the higher paper it had been in front of. Reproduced on a copy of the user's real desk, and with a minimal two-paper scene (both with and without the editor tweaks, so it is tldraw's rule, not ours). Fix: `DeeskArrowBindingUtil` (`src/shapes/deeskArrowBinding.ts`) extends `ArrowBindingUtil` and wraps the four hooks that restack (`onAfterCreate`, `onAfterChange`, `onAfterChangeFromShape`, `onAfterChangeToShape`) so an arrow is never *lowered*; it may still be raised. It replaces tldraw's arrow binding in both the editor (`<Tldraw bindingUtils>` replaces a default of the same `type`) and the store (`createTLStore({ bindingUtils })`); both use `bindingUtils` from `src/shapes/registry.tsx`. Side effect worth knowing: a newly drawn arrow now stays on top of everything instead of sinking to just above the shapes it connects.
- **Task 10 done (2026-10-28), all hand checks passed by the user.** Papers are containers: shapes drawn or dropped on a paper become its figures (move, rotate, copy, delete and save with it), clipped at its edge except arrows and freehand strokes; papers never nest; resizing never scales figures, and a paper cannot be resized smaller than its clipped figures. Arrows aim at a box anywhere over it, connect figures on different papers, are deleted when their last anchor is deleted, are copied along with the papers they connect, and are never lowered behind a paper by tldraw's restacking rule. All text, in boxes and on papers, uses one system font. 145 automated tests pass, 13 of them against a real tldraw editor (see the TECHNIQUE note above).
- **Open items carried forward:** Task 18 (self-host tldraw's icons and other assets for fully offline use; fonts are already local), a load-failure fallback for a saved desk that parses but fails tldraw's validation (see the Task 8 note), the hobby licence key before the trial ends around 2026-11-10, and the optional Task 9b (reorder tick-box items).
