export type CropRect = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
};

export type ImageMetrics = {
  readonly naturalWidth: number;
  readonly naturalHeight: number;
  readonly drawnWidth: number;
  readonly drawnHeight: number;
  readonly offsetX: number;
  readonly offsetY: number;
  readonly scale: number;
};

export type CropperOptions = {
  readonly minSize: number;
  readonly onChange?: (crop: CropRect) => void;
};

export type Cropper = {
  readonly setImageMetrics: (metrics: ImageMetrics) => void;
  readonly setCrop: (crop: CropRect) => void;
  readonly getCrop: () => CropRect | null;
  readonly clear: () => void;
};

const clamp = (value: number, min: number, max: number): number => {
  if (value < min) {
    return min;
  }

  if (value > max) {
    return max;
  }

  return value;
};

type CropHandle = 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw';

type Interaction =
  | {
      readonly type: 'move';
      readonly startPointer: DOMPointReadOnly;
      readonly startCrop: CropRect;
    }
  | {
      readonly type: 'resize';
      readonly handle: CropHandle;
      readonly startPointer: DOMPointReadOnly;
      readonly startCrop: CropRect;
    };

type CanvasPoint = {
  readonly x: number;
  readonly y: number;
};

type DisplayRect = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
};

type HandleRect = {
  readonly handle: CropHandle;
  readonly x: number;
  readonly y: number;
  readonly size: number;
};

const handleOrder: readonly CropHandle[] = [
  'nw',
  'n',
  'ne',
  'e',
  'se',
  's',
  'sw',
  'w',
];

const getCursorForHandle = (handle: CropHandle): string => {
  if (handle === 'n' || handle === 's') {
    return 'ns-resize';
  }

  if (handle === 'e' || handle === 'w') {
    return 'ew-resize';
  }

  if (handle === 'ne' || handle === 'sw') {
    return 'nesw-resize';
  }

  return 'nwse-resize';
};

const getCenterForHandle = (
  handle: CropHandle,
  rect: DisplayRect,
): CanvasPoint => {
  if (handle === 'nw') {
    return { x: rect.x, y: rect.y };
  }

  if (handle === 'n') {
    return { x: rect.x + rect.width / 2, y: rect.y };
  }

  if (handle === 'ne') {
    return { x: rect.x + rect.width, y: rect.y };
  }

  if (handle === 'e') {
    return { x: rect.x + rect.width, y: rect.y + rect.height / 2 };
  }

  if (handle === 'se') {
    return { x: rect.x + rect.width, y: rect.y + rect.height };
  }

  if (handle === 's') {
    return { x: rect.x + rect.width / 2, y: rect.y + rect.height };
  }

  if (handle === 'sw') {
    return { x: rect.x, y: rect.y + rect.height };
  }

  return { x: rect.x, y: rect.y + rect.height / 2 };
};

export const createCropper = (
  canvas: HTMLCanvasElement,
  options: CropperOptions,
): Cropper => {
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('Unable to obtain 2D context for crop overlay');
  }

  canvas.style.touchAction = 'none';

  let metrics: ImageMetrics | null = null;
  let crop: CropRect | null = null;
  let interaction: Interaction | null = null;
  let pointerId: number | null = null;
  let rafId: number | null = null;
  let handleRects: HandleRect[] = [];

  const getMinWidth = (): number => {
    if (!metrics) {
      return options.minSize;
    }

    return Math.min(options.minSize, metrics.naturalWidth);
  };

  const getMinHeight = (): number => {
    if (!metrics) {
      return options.minSize;
    }

    return Math.min(options.minSize, metrics.naturalHeight);
  };

  const clearOverlay = (): void => {
    context.clearRect(0, 0, canvas.width, canvas.height);
  };

  const notifyChange = (): void => {
    if (!crop || !options.onChange) {
      return;
    }

    options.onChange(crop);
  };

  const scheduleDraw = (): void => {
    if (rafId !== null) {
      return;
    }

    rafId = window.requestAnimationFrame(() => {
      rafId = null;

      if (!metrics || !crop) {
        clearOverlay();
        return;
      }

      const { offsetX, offsetY, scale } = metrics;
      const displayX = offsetX + crop.x * scale;
      const displayY = offsetY + crop.y * scale;
      const displayWidth = crop.width * scale;
      const displayHeight = crop.height * scale;
      const rect: DisplayRect = {
        x: displayX,
        y: displayY,
        width: displayWidth,
        height: displayHeight,
      };

      handleRects = handleOrder.map((handle) => {
        const center = getCenterForHandle(handle, rect);
        const size = 12;
        return {
          handle,
          x: center.x - size / 2,
          y: center.y - size / 2,
          size,
        };
      });

      context.clearRect(0, 0, canvas.width, canvas.height);
      context.save();
      context.fillStyle = 'rgba(15, 23, 42, 0.55)';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.clearRect(displayX, displayY, displayWidth, displayHeight);
      context.restore();

      context.save();
      context.lineWidth = 2;
      context.strokeStyle = '#38bdf8';
      context.strokeRect(displayX + 1, displayY + 1, displayWidth - 2, displayHeight - 2);
      context.restore();

      context.save();
      context.fillStyle = '#38bdf8';
      context.strokeStyle = '#0f172a';
      context.lineWidth = 1;
      handleRects.forEach(({ x, y, size }) => {
        context.fillRect(x, y, size, size);
        context.strokeRect(x + 0.5, y + 0.5, size - 1, size - 1);
      });
      context.restore();
    });
  };

  const sanitizeCrop = (rawCrop: CropRect): CropRect => {
    if (!metrics) {
      return rawCrop;
    }

    const maxWidth = metrics.naturalWidth;
    const maxHeight = metrics.naturalHeight;
    const minWidth = getMinWidth();
    const minHeight = getMinHeight();

    const width = clamp(rawCrop.width, minWidth, maxWidth);
    const height = clamp(rawCrop.height, minHeight, maxHeight);
    const x = clamp(rawCrop.x, 0, maxWidth - width);
    const y = clamp(rawCrop.y, 0, maxHeight - height);

    return {
      x,
      y,
      width,
      height,
    };
  };

  const setCropInternal = (nextCrop: CropRect, shouldNotify: boolean): void => {
    crop = sanitizeCrop(nextCrop);
    scheduleDraw();

    if (!shouldNotify) {
      return;
    }

    notifyChange();
  };

  const canvasToImagePoint = ({ x, y }: CanvasPoint): DOMPointReadOnly => {
    if (!metrics) {
      return new DOMPointReadOnly(x, y);
    }

    const imageX = clamp(
      (x - metrics.offsetX) / metrics.scale,
      0,
      metrics.naturalWidth,
    );
    const imageY = clamp(
      (y - metrics.offsetY) / metrics.scale,
      0,
      metrics.naturalHeight,
    );

    return new DOMPointReadOnly(imageX, imageY);
  };

  const getPointerPosition = (event: PointerEvent): CanvasPoint => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) * canvas.width) / rect.width,
      y: ((event.clientY - rect.top) * canvas.height) / rect.height,
    };
  };

  const findHandleAtPoint = (point: CanvasPoint): CropHandle | null => {
    if (!crop) {
      return null;
    }

    const hitSize = 20;

    for (const { handle, x, y } of handleRects) {
      const centerX = x + 6;
      const centerY = y + 6;
      const half = hitSize / 2;

      if (
        point.x >= centerX - half &&
        point.x <= centerX + half &&
        point.y >= centerY - half &&
        point.y <= centerY + half
      ) {
        return handle;
      }
    }

    return null;
  };

  const isPointInsideCrop = (point: DOMPointReadOnly): boolean => {
    if (!crop) {
      return false;
    }

    const withinX = point.x >= crop.x && point.x <= crop.x + crop.width;
    const withinY = point.y >= crop.y && point.y <= crop.y + crop.height;

    return withinX && withinY;
  };

  const updateCursor = (event: PointerEvent): void => {
    if (!metrics || !crop) {
      canvas.style.cursor = 'default';
      return;
    }

    const point = getPointerPosition(event);
    const handle = findHandleAtPoint(point);

    if (handle) {
      canvas.style.cursor = getCursorForHandle(handle);
      return;
    }

    const imagePoint = canvasToImagePoint(point);

    if (isPointInsideCrop(imagePoint)) {
      canvas.style.cursor = 'move';
      return;
    }

    canvas.style.cursor = 'default';
  };

  const handlePointerDown = (event: PointerEvent): void => {
    if (!metrics || !crop) {
      return;
    }

    const point = getPointerPosition(event);
    const handle = findHandleAtPoint(point);
    const imagePoint = canvasToImagePoint(point);

    if (handle) {
      interaction = {
        type: 'resize',
        handle,
        startPointer: imagePoint,
        startCrop: crop,
      };
    } else if (isPointInsideCrop(imagePoint)) {
      interaction = {
        type: 'move',
        startPointer: imagePoint,
        startCrop: crop,
      };
    } else {
      interaction = null;
    }

    if (!interaction) {
      return;
    }

    pointerId = event.pointerId;
    canvas.setPointerCapture(pointerId);
    event.preventDefault();
  };

  const applyMove = (point: DOMPointReadOnly, start: Interaction): void => {
    if (!crop || !metrics) {
      return;
    }

    const deltaX = point.x - start.startPointer.x;
    const deltaY = point.y - start.startPointer.y;
    const maxX = metrics.naturalWidth - start.startCrop.width;
    const maxY = metrics.naturalHeight - start.startCrop.height;

    const nextX = clamp(start.startCrop.x + deltaX, 0, maxX);
    const nextY = clamp(start.startCrop.y + deltaY, 0, maxY);

    setCropInternal(
      {
        x: nextX,
        y: nextY,
        width: start.startCrop.width,
        height: start.startCrop.height,
      },
      true,
    );
  };

  const applyResize = (point: DOMPointReadOnly, start: Extract<Interaction, { type: 'resize' }>): void => {
    if (!metrics) {
      return;
    }

    const deltaX = point.x - start.startPointer.x;
    const deltaY = point.y - start.startPointer.y;
    let nextX = start.startCrop.x;
    let nextY = start.startCrop.y;
    let nextWidth = start.startCrop.width;
    let nextHeight = start.startCrop.height;

    const minWidth = getMinWidth();
    const minHeight = getMinHeight();

    if (start.handle === 'w' || start.handle === 'nw' || start.handle === 'sw') {
      const minX = 0;
      const maxX = start.startCrop.x + start.startCrop.width - minWidth;
      const candidateX = clamp(start.startCrop.x + deltaX, minX, maxX);
      const deltaApplied = candidateX - start.startCrop.x;
      nextX = candidateX;
      nextWidth = start.startCrop.width - deltaApplied;
    }

    if (start.handle === 'e' || start.handle === 'ne' || start.handle === 'se') {
      const maxWidth = metrics.naturalWidth - start.startCrop.x;
      const candidateWidth = clamp(
        start.startCrop.width + deltaX,
        minWidth,
        maxWidth,
      );
      nextWidth = candidateWidth;
    }

    if (start.handle === 'n' || start.handle === 'ne' || start.handle === 'nw') {
      const minY = 0;
      const maxY = start.startCrop.y + start.startCrop.height - minHeight;
      const candidateY = clamp(start.startCrop.y + deltaY, minY, maxY);
      const deltaApplied = candidateY - start.startCrop.y;
      nextY = candidateY;
      nextHeight = start.startCrop.height - deltaApplied;
    }

    if (start.handle === 's' || start.handle === 'se' || start.handle === 'sw') {
      const maxHeight = metrics.naturalHeight - start.startCrop.y;
      const candidateHeight = clamp(
        start.startCrop.height + deltaY,
        minHeight,
        maxHeight,
      );
      nextHeight = candidateHeight;
    }

    nextX = clamp(nextX, 0, metrics.naturalWidth - nextWidth);
    nextY = clamp(nextY, 0, metrics.naturalHeight - nextHeight);

    setCropInternal(
      {
        x: nextX,
        y: nextY,
        width: nextWidth,
        height: nextHeight,
      },
      true,
    );
  };

  const handlePointerMove = (event: PointerEvent): void => {
    if (!interaction) {
      updateCursor(event);
      return;
    }

    if (pointerId !== event.pointerId) {
      return;
    }

    const point = getPointerPosition(event);
    const imagePoint = canvasToImagePoint(point);

    if (interaction.type === 'move') {
      applyMove(imagePoint, interaction);
    } else {
      applyResize(imagePoint, interaction);
    }

    event.preventDefault();
  };

  const endInteraction = (): void => {
    if (pointerId !== null) {
      canvas.releasePointerCapture(pointerId);
    }

    pointerId = null;
    interaction = null;
  };

  const handlePointerUp = (event: PointerEvent): void => {
    if (pointerId !== event.pointerId) {
      return;
    }

    endInteraction();
    event.preventDefault();
  };

  const handlePointerCancel = (event: PointerEvent): void => {
    if (pointerId !== event.pointerId) {
      return;
    }

    endInteraction();
  };

  const setImageMetrics = (nextMetrics: ImageMetrics): void => {
    metrics = nextMetrics;

    if (crop) {
      crop = sanitizeCrop(crop);
    }

    canvas.style.cursor = 'default';
    scheduleDraw();
  };

  const setCrop = (nextCrop: CropRect): void => {
    setCropInternal(nextCrop, true);
  };

  const getCrop = (): CropRect | null => crop;

  const clear = (): void => {
    endInteraction();
    metrics = null;
    crop = null;
    handleRects = [];
    canvas.style.cursor = 'default';
    clearOverlay();
  };

  canvas.addEventListener('pointerdown', handlePointerDown);
  canvas.addEventListener('pointermove', handlePointerMove);
  canvas.addEventListener('pointerup', handlePointerUp);
  canvas.addEventListener('pointerleave', handlePointerUp);
  canvas.addEventListener('pointercancel', handlePointerCancel);

  return {
    setImageMetrics,
    setCrop,
    getCrop,
    clear,
  };
};
