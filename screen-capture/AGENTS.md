# Working folder: screen-capture

## Goal
Build a Chrome MV3 extension that captures a **selected area** of the current tab as PNG:
- Toggle "Selected Area" mode
- Drag/resize/move a selection rectangle
- Press **Enter** to capture, **Esc** to cancel
- Auto-download the cropped PNG

## Commands
- Install: `pnpm install`
- Dev (typecheck): `pnpm typecheck`
- Build: `pnpm build`  → outputs `/dist`
- Zip: `pnpm zip`      → builds a `screen-capture.zip` for release

## Steps
1. Run `pnpm typecheck`.
2. Run `pnpm build`.
3. Ensure `dist/manifest.json`, `dist/background.js`, `dist/content.js` exist.
4. Zip `/dist` into `screen-capture.zip`.
