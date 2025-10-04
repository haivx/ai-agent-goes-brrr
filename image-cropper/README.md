# Image Cropper Chrome Extension

A Manifest V3 Chrome extension that lets you load an image, adjust an on-canvas crop box with eight drag handles, and download the cropped result as a PNG or JPEG. The project is written in TypeScript with zero external runtime dependencies and bundles via `tsup` for an easy development workflow.

> **Ghi chú:** Toàn bộ mã nguồn được tạo 100% bằng AI Codex; tác giả dự án chỉ thực hiện việc mô tả yêu cầu.

## Features
- 📂 Select any local image through the popup file picker.
- 🖼️ Responsive canvas preview that letterboxes large images while keeping aspect ratio.
- ✂️ Draggable, resizable crop rectangle with eight accessible handles and minimum size enforcement (32×32 px).
- 🖱️ Supports both mouse and touch interactions for moving or resizing the crop area.
- 💾 Download the cropped region as `PNG` (default) or `JPEG` with a single click.
- ♻️ Reset control that clears the canvas, crop state, and file input.

## Project Structure
```
src/
├── lib/cropper.ts     # Core crop-overlay logic (pointer events, drawing, export helpers)
├── manifest.json      # MV3 definition for the action popup
├── popup.html         # Popup markup rendered by Chrome
├── popup.ts           # Popup controller that wires UI events to the cropper
└── styles.css         # Minimal styling for layout and focus states
```

## Prerequisites
- Node.js 20.x
- [pnpm](https://pnpm.io/)

Install dependencies once:

```bash
pnpm install
```

## Development
To iterate locally, run the watch build and load the generated `dist/` folder as an unpacked extension.

```bash
pnpm dev
```

Then in Chrome: open **chrome://extensions**, enable **Developer mode**, and choose **Load unpacked** → select the `dist/` directory.

## Production Build
Generate a production bundle and zipped package ready for distribution:

```bash
pnpm build
pnpm zip
```

The ZIP archive (`chrome-image-cropper.zip`) can be uploaded to the Chrome Web Store or shared directly.

## Usage
1. Click the extension action to open the popup.
2. Choose an image file from your device.
3. Drag inside the crop box to reposition it, or drag a handle to resize.
4. Use the format dropdown to choose PNG or JPEG.
5. Press **Download Crop** to save the clipped image.
6. Use **Reset** to start over with a new image.

## Tech Highlights
- Strict TypeScript configuration with dedicated modules for crop logic and popup behavior.
- Canvas-based drawing with manual crop overlay rendering for performance.
- Accessible keyboard focus rings and touch-friendly pointer handling.

## License
This repository currently does not declare a license. Add one before publishing if required.
