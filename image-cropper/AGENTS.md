# AGENTS.md

## Goal
A Chrome Extension (Manifest V3) that allows users to:
1. Select an image (via file input).
2. Crop the image with a draggable/resizable crop area (mouse + touch).
3. Download the cropped result (PNG/JPEG) locally.

## Tooling & Scripts
- Node: 20.x
- Package manager: pnpm
- Install dependencies: `pnpm install`
- Development build: `pnpm dev` (watch build to `/dist`)
- Load unpacked: open Chrome → Extensions → Load `/dist`
- Production build: `pnpm build` → package with `pnpm zip`

## Project Structure
- `/src/manifest.json` (MV3)
- `/src/popup.html`
- `/src/popup.ts`
- `/src/styles.css`
- `/src/lib/cropper.ts` (crop logic: drag, resize, clip canvas)
- `/dist` (build output)

## Coding Conventions
- Strict TypeScript
- Arrow functions with early returns
- Event handlers prefixed with `handle*`
- No external libraries in v1
- Minimal UI (Tailwind or plain CSS)
- Accessibility: focus rings for crop handles

## Workflow for Agents
1. Read this file and `package.json`
2. Create or update code following the acceptance criteria below
3. Run `pnpm typecheck && pnpm lint && pnpm build`
4. If build fails → fix until passing

## Acceptance Criteria v1
- Valid `manifest.json` (MV3, popup action).
- Popup allows: choose image → preview → overlay crop area.
- Crop area: resizable from 8 handles + draggable inside the box.
- Support both mouse and touch.
- Minimum crop size: 32×32.
- Download button: exports cropped image as PNG or JPEG, preserving original resolution.
- Reset button: clears state and resets UI.
- No crashes with large images (≥ 4000px on any dimension).
