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
- Project root: `/Users/oliverduenielsen/deesk` (git repo, branch `master`). Commit after every task.
- Commit messages end with the attribution line given in the session's system reminder, when one is present.

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

- [ ] **Step 1: Write the failing tests**

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

- [ ] **Step 2: Run it to see it fail**

Run: `npm test`. Expected: FAIL, because `./spring` and `./springConfig` cannot be resolved.

- [ ] **Step 3: Implement the config and the maths**

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

- [ ] **Step 4: Run it to see it pass, then commit**

Run: `npm test`. Expected: PASS (all earlier tests plus the new ones).

```bash
git add src/camera
git commit -m "feat: zoom spring maths and tuning constants"
```

- [ ] **Step 5: Wire the spring into the editor**

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

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: zoom spring eases the camera back inside the soft limits"
```

- [ ] **Step 7: User verifies by hand (agent starts `npm run tauri dev`)**

Give the user this list and wait for their answers:
1. **Zoom in past the soft limit.** Zoom in with pinch or Cmd+scroll until it stops (about 800%). Let go. After a moment the view eases back to about 340%. The point at the centre of the window stays put while it eases.
2. **Zoom out past the soft limit.** Zoom out until it stops (about 5%). Let go. It eases back in to about 12%.
3. **Normal use stays still.** Zoom and pan anywhere between 10% and 400%. Nothing ever moves by itself.
4. **Interrupting.** While it is easing back, scroll or pan. The animation stops at once and you are in control. It never fights you.
5. **Zoom buttons and keyboard steps** (the zoom control and Cmd+plus / Cmd+minus): the steps still work, and the hard levels also spring back.
6. **Feel.** Is it too early, too late, too fast or too slow? Say what to change. Every number is in `src/camera/springConfig.ts`, so tuning is a one-line change.

- [ ] **Step 8: Tune and commit**

Adjust the constants in `src/camera/springConfig.ts` with the user until it feels right. Run `npm test` (the tests read the limits from the config), then commit: `git commit -am "tune: zoom spring numbers"`. Report what was verified and ask for explicit confirmation that Task 6 is done before starting Task 7.

### Task 7: Paper shape (frame, fixed text size)

- **Goal:** a custom tldraw shape for a paper that can be created, moved, resized and styled (colour, size).
- **Files:** `src/shapes/paper/PaperShapeUtil.tsx`, `src/shapes/paper/paper-types.ts`, registration in `src/Desk.tsx`, tests for the shape's resize behaviour.
- **Interfaces:** shape type `"paper"` with props `{ w: number; h: number; color: string; body: "text" | "checklist" }`. Resizing only changes `w` and `h`.
- **Acceptance:** drag-resizing a paper never changes text size. Text reflows or clips.

### Task 8: Text body with markdown headers and bold

- **Goal:** click a paper to edit text with TipTap. `#` at line start makes headers, Cmd+B toggles bold.
- **Files:** `src/shapes/paper/TextBody.tsx`, `src/editor/tiptap-config.ts`, tests for the config's input rules.
- **Acceptance:** typing `# Title` becomes a header, Cmd+B bolds the selection, and the content is stored in the shape and persists via Task 5.

### Task 9: Checklist body

- **Goal:** checklist papers with nested items, drag-to-reorder and check/uncheck. No progress indicator.
- **Files:** `src/shapes/paper/ChecklistBody.tsx`, reuse of the TipTap task-list extension, tests for nesting and reorder logic.
- **Acceptance:** items nest, reorder and tick. Content persists.

### Task 10: Figures on papers

- **Goal:** boxes, arrows, freehand and images drawn on a paper become its children: they move with it and are clipped to its edge.
- **Files:** changes to `PaperShapeUtil` (child handling and clipping), tests for the parent-child behaviour.
- **Acceptance:** moving or resizing a paper carries its figures; arrows attached between figures stay attached.

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
