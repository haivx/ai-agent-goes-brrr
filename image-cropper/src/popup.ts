import { createCropper, type CropRect, type ImageMetrics } from './lib/cropper';

const appRoot = document.querySelector<HTMLDivElement>('#app');

if (!appRoot) {
  throw new Error('Missing #app element in popup.html');
}

const fileInput = appRoot.querySelector<HTMLInputElement>('#image-input');
const canvas = appRoot.querySelector<HTMLCanvasElement>('#image-canvas');
const resetButton = appRoot.querySelector<HTMLButtonElement>('#reset-button');
const downloadButton = appRoot.querySelector<HTMLButtonElement>('#download-button');
const formatSelect = appRoot.querySelector<HTMLSelectElement>('#format-select');

if (!fileInput || !canvas || !resetButton || !downloadButton || !formatSelect) {
  throw new Error('Popup markup is missing required elements');
}

const canvasParent = canvas.parentElement;

if (!canvasParent) {
  throw new Error('Canvas element is missing a parent container');
}

const canvasNextSibling = canvas.nextElementSibling;
const canvasWrapper = document.createElement('div');
canvasWrapper.classList.add('canvas-wrapper');

const overlayCanvas = document.createElement('canvas');
overlayCanvas.id = 'crop-overlay';
overlayCanvas.width = canvas.width;
overlayCanvas.height = canvas.height;
overlayCanvas.setAttribute('aria-hidden', 'true');
overlayCanvas.setAttribute('role', 'presentation');

canvasWrapper.appendChild(canvas);
canvasWrapper.appendChild(overlayCanvas);

if (canvasNextSibling) {
  canvasParent.insertBefore(canvasWrapper, canvasNextSibling);
} else {
  canvasParent.appendChild(canvasWrapper);
}

const context = canvas.getContext('2d');

if (!context) {
  throw new Error('Failed to acquire 2D context for canvas');
}

let hasImageLoaded = false;
let currentScaleFactor = 1;
let currentImageMetrics: ImageMetrics | null = null;
let currentCrop: CropRect | null = null;
let currentImageElement: HTMLImageElement | null = null;

const MIN_CROP_SIZE = 32;
const DEFAULT_EXPORT_FORMAT = 'image/png' as const;

type ExportFormat = 'image/png' | 'image/jpeg';

const cropper = createCropper(overlayCanvas, {
  minSize: MIN_CROP_SIZE,
  onChange: (nextCrop) => {
    currentCrop = nextCrop;
  },
});

const createInitialCrop = (width: number, height: number): CropRect => {
  const desiredWidth = Math.max(MIN_CROP_SIZE, width * 0.8);
  const desiredHeight = Math.max(MIN_CROP_SIZE, height * 0.8);
  const initialWidth = Math.min(width, desiredWidth);
  const initialHeight = Math.min(height, desiredHeight);
  const initialX = (width - initialWidth) / 2;
  const initialY = (height - initialHeight) / 2;

  return {
    x: initialX,
    y: initialY,
    width: initialWidth,
    height: initialHeight,
  };
};

const setDownloadState = (enabled: boolean): void => {
  downloadButton.disabled = !enabled;
};

const clearCanvas = (): void => {
  context.clearRect(0, 0, canvas.width, canvas.height);
};

const resetState = (): void => {
  hasImageLoaded = false;
  currentScaleFactor = 1;
  currentImageMetrics = null;
  currentCrop = null;
  currentImageElement = null;
  delete canvas.dataset.scaleFactor;
  clearCanvas();
  cropper.clear();
  setDownloadState(false);
  formatSelect.value = DEFAULT_EXPORT_FORMAT;
};

const readImage = (file: File): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.decoding = 'async';

    const handleLoad = (): void => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };

    const handleError = (): void => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Unable to load the selected image'));
    };

    image.addEventListener('load', handleLoad, { once: true });
    image.addEventListener('error', handleError, { once: true });
    image.src = objectUrl;
  });

const drawImageToCanvas = async (file: File): Promise<void> => {
  const image = await readImage(file);

  const imageWidth = image.naturalWidth;
  const imageHeight = image.naturalHeight;

  if (imageWidth === 0 || imageHeight === 0) {
    throw new Error('Invalid image dimensions');
  }

  const widthRatio = canvas.width / imageWidth;
  const heightRatio = canvas.height / imageHeight;
  const scale = Math.min(widthRatio, heightRatio);

  const drawnWidth = imageWidth * scale;
  const drawnHeight = imageHeight * scale;
  const offsetX = (canvas.width - drawnWidth) / 2;
  const offsetY = (canvas.height - drawnHeight) / 2;

  clearCanvas();
  context.drawImage(image, offsetX, offsetY, drawnWidth, drawnHeight);

  const metrics: ImageMetrics = {
    naturalWidth: imageWidth,
    naturalHeight: imageHeight,
    drawnWidth,
    drawnHeight,
    offsetX,
    offsetY,
    scale,
  };

  currentImageMetrics = metrics;
  cropper.setImageMetrics(metrics);
  cropper.setCrop(createInitialCrop(imageWidth, imageHeight));

  currentScaleFactor = scale;
  canvas.dataset.scaleFactor = String(currentScaleFactor);
  hasImageLoaded = true;
  currentImageElement = image;
  setDownloadState(true);
};

const handleFileChange = async (event: Event): Promise<void> => {
  const target = event.currentTarget as HTMLInputElement;
  const { files } = target;

  if (!files || files.length === 0) {
    resetState();
    return;
  }

  const file = files.item(0);

  if (!file) {
    resetState();
    return;
  }

  if (!file.type.startsWith('image/')) {
    resetState();
    return;
  }

  try {
    await drawImageToCanvas(file);
  } catch (error) {
    console.error(error);
    resetState();
  }
};

const handleReset = (): void => {
  fileInput.value = '';
  resetState();
};

const createDownloadLink = (blob: Blob, extension: string): void => {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = `crop.${extension}`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(objectUrl);
};

const exportCrop = async (format: ExportFormat): Promise<void> => {
  if (!currentCrop || !currentImageElement) {
    return;
  }

  const tempCanvas = document.createElement('canvas');
  const cropWidth = Math.max(1, Math.round(currentCrop.width));
  const cropHeight = Math.max(1, Math.round(currentCrop.height));
  const maxSourceX = Math.max(0, currentImageElement.naturalWidth - 1);
  const maxSourceY = Math.max(0, currentImageElement.naturalHeight - 1);
  const sourceX = Math.min(Math.max(0, Math.round(currentCrop.x)), maxSourceX);
  const sourceY = Math.min(Math.max(0, Math.round(currentCrop.y)), maxSourceY);
  const maxAvailableWidth = Math.max(1, currentImageElement.naturalWidth - sourceX);
  const maxAvailableHeight = Math.max(1, currentImageElement.naturalHeight - sourceY);
  const outputWidth = Math.min(cropWidth, maxAvailableWidth);
  const outputHeight = Math.min(cropHeight, maxAvailableHeight);

  tempCanvas.width = outputWidth;
  tempCanvas.height = outputHeight;

  const tempContext = tempCanvas.getContext('2d');

  if (!tempContext) {
    throw new Error('Failed to acquire 2D context for export canvas');
  }

  tempContext.drawImage(
    currentImageElement,
    sourceX,
    sourceY,
    outputWidth,
    outputHeight,
    0,
    0,
    outputWidth,
    outputHeight,
  );

  const blob = await new Promise<Blob | null>((resolve) => {
    tempCanvas.toBlob(
      (result) => {
        resolve(result);
      },
      format,
      format === 'image/jpeg' ? 0.92 : undefined,
    );
  });

  if (!blob) {
    throw new Error('Failed to export cropped image');
  }

  const extension = format === 'image/png' ? 'png' : 'jpg';
  createDownloadLink(blob, extension);
};

const handleDownload = async (): Promise<void> => {
  if (!hasImageLoaded || !currentCrop || !currentImageMetrics) {
    return;
  }

  const selectedFormat =
    formatSelect.value === 'image/jpeg' ? ('image/jpeg' as const) : DEFAULT_EXPORT_FORMAT;

  try {
    await exportCrop(selectedFormat);
  } catch (error) {
    console.error(error);
  }
};

const initialize = (): void => {
  resetState();
  fileInput.addEventListener('change', handleFileChange);
  resetButton.addEventListener('click', handleReset);
  downloadButton.addEventListener('click', handleDownload);
};

initialize();
