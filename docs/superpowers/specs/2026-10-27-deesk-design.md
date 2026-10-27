# Deesk — Design

## Purpose

Deesk is a fully local, native desktop app that works like a real-world desk. Checklists and notes live on an infinite canvas as movable "papers". Papers can hold Excalidraw-style figures (boxes, lines, images). The goal is a single visual overview of the state of the user's projects.

Single user, personal use. No accounts, sync, or collaboration. Data stays on the user's machine in files they own. Mouse-and-keyboard desktop use; it launches from the dock like any app.

## Decisions

- **Shell:** Tauri 2 (native app, real filesystem access, dock icon).
- **UI:** React + TypeScript + Vite.
- **Canvas:** tldraw SDK. Excalidraw is not used, embedded or otherwise. tldraw already provides boxes, ellipses, arrows bound to shapes, freehand, images, selection and undo/redo; its "draw" style stands in for the hand-drawn look. Licence terms are to be checked at spec-to-plan time, as they have changed between tldraw versions. Personal use is the only use case.
- **Rich text / checklists:** TipTap (ProseMirror).
- **State:** tldraw's own store plus Zustand for app-level state.
- **Persistence:** JSON snapshot plus an assets folder.
- **Tests:** Vitest, Playwright.

## Architecture

- Tauri's Rust side handles only file access, window setup and the app icon. All other logic is TypeScript in the webview.
- There is one desk, stored as one tldraw document. There is no multi-desk UI. The user groups papers by proximity; there are no grouping or border features.
- Custom shapes, the zoom spring, pin/glue rules and persistence are separate modules. They avoid reaching into tldraw internals beyond what is needed, so the canvas library could be replaced later.

## Canvas behaviour

- Infinite pan and zoom.
- **The app never changes the view on its own.** Only the user moves the camera. The one exception is the zoom spring below.
- **Zoom spring:** zoom has a soft limit. If the user stays past it, zoom eases back toward a slightly more zoomed-out level with an animated transition, not a snap. Applies at both the zoomed-in and zoomed-out ends (to be confirmed by the user). A looping, self-similar "desk inside the desk" zoom is explicitly out of scope; it may be added later.
- Snap/align guides, minimap, undo/redo, command palette (Cmd+K) and keyboard shortcuts.
- Light and dark themes.
- Search across papers.

## Shapes

### Paper
A custom shape with a checklist or text body, edited with TipTap.

- Resizing changes only the frame. Font size is fixed; text reflows or clips and never scales. This is a hard requirement.
- Markdown `#` shortcuts create headers. Cmd+B toggles bold.
- Checklists support nested items, drag to reorder, and check/uncheck. There is no progress indicator.
- A paper acts as a container: figures drawn on it (boxes, arrows, images) move with it and are clipped to its edge.
- Style options: colour and size.
- While a paper is being edited, all other shapes are dimmed. Clicking a paper never moves the camera.

### Sticker
A small circle in a fixed palette of colours. It can sit on the desk or on a paper.

### Pin
A pin-icon shape. When placed, every paper under it becomes pinned: it cannot be moved or resized. Removing the pin releases those papers.

### Glue
A per-paper toggle that fixes that single paper to the table, preventing move and resize. Shown with a small visual cue. Distinct from pin: glue is per paper, pin holds every paper under it.

### Diagrams
Boxes, ellipses, diamonds, text, lines, arrows that stay attached to shapes, freehand pen, and images (paste or drop), with group, align and style (stroke, fill, font). These are tldraw's native shapes, usable on the desk and on papers.

## Persistence

- Autosave is debounced and atomic (write to a temp file, then rename), so a crash cannot corrupt the desk.
- The desk is one JSON snapshot. Images live in an `assets/` folder beside it. The folder can be backed up or kept in git.
- Default location is the app data directory; changing it is a later feature.
- Later: export papers and desks as PNG, SVG and Markdown.

## Testing

- Vitest for pure logic: pin attachment, glue rules, zoom-spring maths, snapshot save and load.
- Playwright for a few key canvas flows in the webview.
- Tauri-specific behaviour (file access, dock icon) is checked manually.

## Out of scope for now

Multiple desks, sync, collaboration, accounts, the looping self-similar zoom, templates, tags, due dates, version history.

## Open items

- Confirm the zoom spring applies at both zoom ends.
- Check the current tldraw licence terms before planning.
