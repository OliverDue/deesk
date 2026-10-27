# Deesk

A personal, fully local notes app that works like a real-world desk. Checklists and notes sit on an infinite canvas as movable "papers", next to stickers, pins and simple diagrams, so one view shows the state of your projects.

Everything stays on your machine: no accounts, no sync, no servers.

**Status:** early development. At the moment it opens a blank table canvas; papers, saving, stickers and the rest are planned.

## Built with

- [Tauri 2](https://tauri.app) (native desktop shell)
- React, TypeScript and Vite
- [tldraw](https://tldraw.dev) SDK for the canvas

Deesk is a non-commercial personal project. tldraw requires a licence key for production builds, so the packaged app needs one; development mode does not.

## Run it

Requires Node.js and [Rust](https://rustup.rs).

```
npm install
npm run tauri dev
```

Run the tests with `npm test`.

## Design

The design spec and implementation plan are in [`docs/superpowers`](docs/superpowers).
