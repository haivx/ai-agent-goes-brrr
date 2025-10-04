# Screen Capture Extension

This project is a Chrome Manifest V3 extension that lets you capture a precise region of the active tab. It was prototyped through a "vibe coding" session and lives alongside other experiments in the `ai-agent-goes-brrr` monorepo.

## Features

- Toggle a "Selected Area" overlay from the action button or keyboard shortcut.
- Draw, resize, and move the selection rectangle with mouse or keyboard controls.
- Press **Enter** to capture the highlighted region of the visible tab and auto-download a cropped PNG.
- Press **Esc** to cancel the overlay and return to browsing.

## Getting Started

```bash
pnpm install
pnpm typecheck
pnpm build
```

Load `dist/` as an unpacked extension in Chrome to try it out. The `pnpm zip` command will package a distributable archive.

## Project Structure

- `src/` – TypeScript source for the background/service worker and content scripts.
- `public/` – Static assets copied into the build output.
- `dist/` – Generated bundle ready to load in Chrome.

Refer to [`AGENTS.md`](./AGENTS.md) for more detailed contributor instructions and release steps.
