import { createCropper, type CropRect, type ImageMetrics } from './lib/cropper';

const appRoot = document.querySelector<HTMLDivElement>('#app');

if (!appRoot) {
  throw new Error('Missing #app element in popup.html');
}

const fileInput = appRoot.querySelector<HTMLInputElement>('#image-input');
const canvas = appRoot.querySelector<HTMLCanvasElement>('#image-canvas');
const resetButton = appRoot.querySelector<HTMLButtonElement>('#reset-button');
const downloadButton = appRoot.querySelector<HTMLButtonElement>('#download-button');

if (!fileInput || !canvas || !resetButton || !downloadButton) {
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

const MIN_CROP_SIZE = 32;

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
  delete canvas.dataset.scaleFactor;
  clearCanvas();
  cropper.clear();
  setDownloadState(false);
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

const handleDownload = (): void => {
  if (!hasImageLoaded || !currentCrop || !currentImageMetrics) {
    return;
  }

  // Download logic will be implemented alongside the cropper feature.
};

const initialize = (): void => {
  resetState();
  fileInput.addEventListener('change', handleFileChange);
  resetButton.addEventListener('click', handleReset);
  downloadButton.addEventListener('click', handleDownload);
};

initialize();
