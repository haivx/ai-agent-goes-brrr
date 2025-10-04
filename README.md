# AI Agent Goes Brrr

This repository collects a growing set of small "vibe coded" projects that explore creative automation ideas. Some of them happen to be Chrome extensions, others are experiments, but they all share an emphasis on lightweight tooling and AI-assisted iteration.

The first two projects live in this repo today, both focused on browser-based image workflows built with TypeScript and pnpm.

## Repository Structure

| Folder | Description |
| --- | --- |
| [`image-cropper/`](image-cropper) | Popup-based MV3 extension for cropping local images before downloading them. |
| [`screen-capture/`](screen-capture) | MV3 extension that overlays a crop box on the active tab so you can capture and download just the selected viewport area. |

Both projects run independently—install dependencies and build artifacts within the respective folders.

## Prerequisites

- Node.js 20.x
- [pnpm](https://pnpm.io/)

Install dependencies per project:

```bash
cd image-cropper
pnpm install

cd ../screen-capture
pnpm install
```

## Image Cropper Extension

The **Image Cropper** project focuses on manipulating user-provided images inside the extension popup.

- Load an image through the popup file picker and preview it on a canvas.
- Adjust an accessible crop rectangle with eight drag handles, supporting both mouse and touch input.
- Enforce a minimum crop size (32×32 px) so the selection always remains usable.
- Download the cropped output as PNG (default) or JPEG, or reset the UI to start over.

**Development workflow**

```bash
cd image-cropper
pnpm dev           # watch build to dist/
```

Load `image-cropper/dist` as an unpacked extension in Chrome while iterating. For production output run:

```bash
pnpm build
pnpm zip           # creates image-cropper.zip
```

## Screen Capture Extension

The **Screen Capture** project injects an overlay into the active tab so you can crop what you currently see.

- Toggle the overlay from the toolbar icon or the `Ctrl+Shift+Y` command.
- Draw, move, and resize the selection rectangle with the mouse; nudge with arrow keys (hold **Shift** for larger steps).
- Press **Enter** to capture the visible tab, automatically crop the screenshot client-side, and download it as `capture_<timestamp>.png`.
- Press **Esc** to cancel, or click outside the selection to start a new box.

**Build workflow**

```bash
cd screen-capture
pnpm typecheck     # static type analysis
pnpm build         # emits dist/
pnpm zip           # packages screen-capture.zip
```

Chrome loads the compiled assets from `screen-capture/dist`.

---

As new vibe coding experiments appear in the repository, they will be added to the table above with links to their dedicated documentation.

## Contributing

1. Open the project folder you want to modify.
2. Install dependencies with `pnpm install` if you have not already.
3. Follow the build commands listed above and the additional guidance in each sub-project's documentation.
4. Commit changes with a descriptive message and submit a pull request.

## License

No explicit license is provided. Add one before distributing the extensions publicly.
