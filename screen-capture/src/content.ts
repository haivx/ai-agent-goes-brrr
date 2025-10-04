type Rect = {
  x: number;
  y: number;
  w: number;
  h: number;
};

type HandleDirection = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";
type ActiveHandle = HandleDirection | "create";

declare global {
  interface WindowEventMap {
    "CROP_EXT::TOGGLE": CustomEvent<void>;
  }
}

const MIN_SIZE = 12;

let overlay: HTMLDivElement | null = null;
let box: HTMLDivElement | null = null;
let info: HTMLDivElement | null = null;

let activeHandle: ActiveHandle | null = null;
let pointerStartX = 0;
let pointerStartY = 0;
let startRect: Rect | null = null;

const rect: Rect = { x: 120, y: 120, w: 480, h: 300 };

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function clampRectToViewport(target: Rect) {
  const maxWidth = Math.max(MIN_SIZE, window.innerWidth);
  const maxHeight = Math.max(MIN_SIZE, window.innerHeight);

  target.w = clamp(target.w, MIN_SIZE, maxWidth);
  target.h = clamp(target.h, MIN_SIZE, maxHeight);

  if (target.w > window.innerWidth) {
    target.w = window.innerWidth;
  }
  if (target.h > window.innerHeight) {
    target.h = window.innerHeight;
  }

  if (target.x + target.w > window.innerWidth) {
    target.x = Math.max(0, window.innerWidth - target.w);
  }
  if (target.y + target.h > window.innerHeight) {
    target.y = Math.max(0, window.innerHeight - target.h);
  }

  target.x = clamp(target.x, 0, Math.max(0, window.innerWidth - target.w));
  target.y = clamp(target.y, 0, Math.max(0, window.innerHeight - target.h));
}

function nudge(dx: number, dy: number) {
  rect.x += dx;
  rect.y += dy;
  clampRectToViewport(rect);
  render();
}

function preventScroll(event: Event) {
  event.preventDefault();
}

function onViewportResize() {
  clampRectToViewport(rect);
  render();
}

function ensureStyles() {
  if (document.getElementById("crop-ext-style")) {
    return;
  }

  const style = document.createElement("style");
  style.id = "crop-ext-style";
  style.textContent = `
    .crop-ext-overlay{position:fixed;inset:0;z-index:2147483647;background:rgba(0,0,0,.25);cursor:crosshair;user-select:none}
    .crop-ext-box{position:absolute;outline:2px solid #4ade80;background:rgba(255,255,255,.04);box-shadow:0 0 0 9999px rgba(0,0,0,.25)}
    .crop-ext-handle{position:absolute;width:10px;height:10px;background:#4ade80;border:2px solid #14532d;box-sizing:border-box}
    .crop-ext-handle.nw{top:-6px;left:-6px;cursor:nwse-resize}
    .crop-ext-handle.ne{top:-6px;right:-6px;cursor:nesw-resize}
    .crop-ext-handle.sw{bottom:-6px;left:-6px;cursor:nesw-resize}
    .crop-ext-handle.se{bottom:-6px;right:-6px;cursor:nwse-resize}
    .crop-ext-handle.n{top:-6px;left:50%;transform:translateX(-50%);cursor:ns-resize}
    .crop-ext-handle.s{bottom:-6px;left:50%;transform:translateX(-50%);cursor:ns-resize}
    .crop-ext-handle.w{left:-6px;top:50%;transform:translateY(-50%);cursor:ew-resize}
    .crop-ext-handle.e{right:-6px;top:50%;transform:translateY(-50%);cursor:ew-resize}
    .crop-ext-info{position:absolute;top:-28px;left:0;padding:2px 6px;background:#111827;color:#f9fafb;font:12px/1 monospace;border-radius:6px;outline:1px solid #374151;white-space:nowrap}
  `;

  document.head.appendChild(style);
}

function mount() {
  if (overlay) {
    return;
  }

  ensureStyles();

  overlay = document.createElement("div");
  overlay.className = "crop-ext-overlay";
  overlay.tabIndex = -1;
  overlay.addEventListener("wheel", preventScroll, { passive: false });
  overlay.addEventListener("touchmove", preventScroll, { passive: false });
  overlay.addEventListener("mousedown", onOverlayDown);

  box = document.createElement("div");
  box.className = "crop-ext-box";

  info = document.createElement("div");
  info.className = "crop-ext-info";
  box.appendChild(info);

  const handles: HandleDirection[] = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];
  handles.forEach((handle) => {
    const el = document.createElement("div");
    el.className = `crop-ext-handle ${handle}`;
    el.addEventListener("mousedown", (event) => {
      event.preventDefault();
      event.stopPropagation();
      beginResize(handle, event);
    });
    box!.appendChild(el);
  });

  overlay.appendChild(box);
  document.body.appendChild(overlay);

  clampRectToViewport(rect);
  render();
  overlay.focus({ preventScroll: true });

  document.addEventListener("keydown", onKeydown, true);
  window.addEventListener("resize", onViewportResize);
}

function unmount() {
  if (!overlay) {
    return;
  }

  document.removeEventListener("keydown", onKeydown, true);
  stopInteractions();

  window.removeEventListener("resize", onViewportResize);

  overlay.removeEventListener("wheel", preventScroll);
  overlay.removeEventListener("touchmove", preventScroll);
  overlay.removeEventListener("mousedown", onOverlayDown);
  overlay.remove();
  overlay = null;
  box = null;
  info = null;
}

function beginResize(handle: ActiveHandle, event: MouseEvent, initialRect?: Rect) {
  stopInteractions();

  activeHandle = handle;
  pointerStartX = event.clientX;
  pointerStartY = event.clientY;
  startRect = initialRect ? { ...initialRect } : { ...rect };

  document.addEventListener("mousemove", onResizeMove);
  document.addEventListener("mouseup", onPointerUp);
}

function beginDrag(event: MouseEvent) {
  stopInteractions();

  activeHandle = null;
  pointerStartX = event.clientX;
  pointerStartY = event.clientY;
  startRect = null;

  document.addEventListener("mousemove", onDragMove);
  document.addEventListener("mouseup", onPointerUp);
}

function onOverlayDown(event: MouseEvent) {
  if (!overlay) {
    return;
  }

  event.preventDefault();

  const within =
    event.clientX >= rect.x &&
    event.clientX <= rect.x + rect.w &&
    event.clientY >= rect.y &&
    event.clientY <= rect.y + rect.h;

  if (within) {
    beginDrag(event);
    return;
  }

  const startX = clamp(event.clientX, 0, window.innerWidth);
  const startY = clamp(event.clientY, 0, window.innerHeight);
  rect.x = startX;
  rect.y = startY;
  rect.w = MIN_SIZE;
  rect.h = MIN_SIZE;
  clampRectToViewport(rect);
  render();

  beginResize("create", event, { x: startX, y: startY, w: 0, h: 0 });
}

function onDragMove(event: MouseEvent) {
  event.preventDefault();

  const dx = event.clientX - pointerStartX;
  const dy = event.clientY - pointerStartY;

  pointerStartX = event.clientX;
  pointerStartY = event.clientY;

  rect.x += dx;
  rect.y += dy;

  clampRectToViewport(rect);
  render();
}

function onResizeMove(event: MouseEvent) {
  if (!activeHandle || !startRect) {
    return;
  }

  event.preventDefault();

  const dx = event.clientX - pointerStartX;
  const dy = event.clientY - pointerStartY;

  let nextRect: Rect = { ...startRect };
  const right = startRect.x + startRect.w;
  const bottom = startRect.y + startRect.h;

  switch (activeHandle) {
    case "se":
      nextRect.w = Math.max(MIN_SIZE, startRect.w + dx);
      nextRect.h = Math.max(MIN_SIZE, startRect.h + dy);
      break;
    case "e":
      nextRect.w = Math.max(MIN_SIZE, startRect.w + dx);
      break;
    case "s":
      nextRect.h = Math.max(MIN_SIZE, startRect.h + dy);
      break;
    case "nw": {
      const newX = clamp(startRect.x + dx, 0, right - MIN_SIZE);
      const newY = clamp(startRect.y + dy, 0, bottom - MIN_SIZE);
      nextRect.x = newX;
      nextRect.y = newY;
      nextRect.w = right - newX;
      nextRect.h = bottom - newY;
      break;
    }
    case "ne": {
      const newY = clamp(startRect.y + dy, 0, bottom - MIN_SIZE);
      nextRect.y = newY;
      nextRect.h = bottom - newY;
      nextRect.w = Math.max(MIN_SIZE, startRect.w + dx);
      break;
    }
    case "sw": {
      const newX = clamp(startRect.x + dx, 0, right - MIN_SIZE);
      nextRect.x = newX;
      nextRect.w = right - newX;
      nextRect.h = Math.max(MIN_SIZE, startRect.h + dy);
      break;
    }
    case "n": {
      const newY = clamp(startRect.y + dy, 0, bottom - MIN_SIZE);
      nextRect.y = newY;
      nextRect.h = bottom - newY;
      break;
    }
    case "w": {
      const newX = clamp(startRect.x + dx, 0, right - MIN_SIZE);
      nextRect.x = newX;
      nextRect.w = right - newX;
      break;
    }
    case "create": {
      const anchorX = clamp(startRect.x, 0, window.innerWidth);
      const anchorY = clamp(startRect.y, 0, window.innerHeight);
      const currentX = clamp(startRect.x + dx, 0, window.innerWidth);
      const currentY = clamp(startRect.y + dy, 0, window.innerHeight);

      let left = Math.min(anchorX, currentX);
      let top = Math.min(anchorY, currentY);
      let rightEdge = Math.max(anchorX, currentX);
      let bottomEdge = Math.max(anchorY, currentY);

      if (rightEdge - left < MIN_SIZE) {
        if (currentX >= anchorX) {
          rightEdge = Math.min(window.innerWidth, left + MIN_SIZE);
        } else {
          left = Math.max(0, rightEdge - MIN_SIZE);
        }
      }

      if (bottomEdge - top < MIN_SIZE) {
        if (currentY >= anchorY) {
          bottomEdge = Math.min(window.innerHeight, top + MIN_SIZE);
        } else {
          top = Math.max(0, bottomEdge - MIN_SIZE);
        }
      }

      nextRect = {
        x: left,
        y: top,
        w: rightEdge - left,
        h: bottomEdge - top,
      };
      break;
    }
  }

  clampRectToViewport(nextRect);

  rect.x = nextRect.x;
  rect.y = nextRect.y;
  rect.w = nextRect.w;
  rect.h = nextRect.h;

  render();
}

function onPointerUp() {
  stopInteractions();
}

function stopInteractions() {
  activeHandle = null;
  startRect = null;
  pointerStartX = 0;
  pointerStartY = 0;

  document.removeEventListener("mousemove", onDragMove);
  document.removeEventListener("mousemove", onResizeMove);
  document.removeEventListener("mouseup", onPointerUp);
}

function onKeydown(event: KeyboardEvent) {
  if (!overlay) {
    return;
  }

  if (event.key === "Escape") {
    event.preventDefault();
    event.stopPropagation();
    unmount();
  } else if (event.key === "Enter") {
    event.preventDefault();
    event.stopPropagation();
    doCapture();
  } else {
    const step = event.shiftKey ? 10 : 1;
    switch (event.key) {
      case "ArrowLeft":
        event.preventDefault();
        event.stopPropagation();
        nudge(-step, 0);
        break;
      case "ArrowRight":
        event.preventDefault();
        event.stopPropagation();
        nudge(step, 0);
        break;
      case "ArrowUp":
        event.preventDefault();
        event.stopPropagation();
        nudge(0, -step);
        break;
      case "ArrowDown":
        event.preventDefault();
        event.stopPropagation();
        nudge(0, step);
        break;
    }
  }
}

async function doCapture() {
  try {
    const resp = (await chrome.runtime.sendMessage({
      type: "CROP_EXT::CAPTURE",
    })) as { ok: boolean; dataUrl?: string; error?: string };

    if (!resp?.ok || !resp.dataUrl) {
      console.error("[CROP_EXT] capture failed:", resp?.error);
      return;
    }

    const img = await dataUrlToImage(resp.dataUrl);

    const dpr = window.devicePixelRatio || 1;
    const sx = Math.max(0, Math.floor(rect.x * dpr));
    const sy = Math.max(0, Math.floor(rect.y * dpr));
    const x2 = Math.min(img.width, Math.ceil((rect.x + rect.w) * dpr));
    const y2 = Math.min(img.height, Math.ceil((rect.y + rect.h) * dpr));
    const sw = Math.max(1, x2 - sx);
    const sh = Math.max(1, y2 - sy);

    const canvas = document.createElement("canvas");
    canvas.width = sw;
    canvas.height = sh;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      console.error("[CROP_EXT] unable to acquire 2d context");
      return;
    }

    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);

    const outDataUrl = canvas.toDataURL("image/png");
    const fileName = `capture_${Date.now()}.png`;

    const dl = (await chrome.runtime.sendMessage({
      type: "CROP_EXT::DOWNLOAD",
      dataUrl: outDataUrl,
      fileName,
    })) as { ok: boolean; error?: string };

    if (!dl?.ok) {
      console.error("[CROP_EXT] download failed:", dl?.error);
    }
  } catch (err) {
    console.error("[CROP_EXT] doCapture error:", err);
  } finally {
    unmount();
  }
}

function dataUrlToImage(dataUrl: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load captured image"));
    img.src = dataUrl;
  });
}

function render() {
  if (!overlay || !box || !info) {
    return;
  }

  box.style.left = `${rect.x}px`;
  box.style.top = `${rect.y}px`;
  box.style.width = `${rect.w}px`;
  box.style.height = `${rect.h}px`;
  info.textContent = `${Math.round(rect.w)}×${Math.round(rect.h)} @ (${Math.round(rect.x)},${Math.round(rect.y)})`;
}

window.addEventListener("CROP_EXT::TOGGLE", () => {
  if (overlay) {
    unmount();
  } else {
    mount();
  }
});

export {};
