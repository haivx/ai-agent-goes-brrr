export type CropRegion = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export const createInitialCropRegion = (imageWidth: number, imageHeight: number): CropRegion => {
  const minSize = 32;
  if (imageWidth < minSize || imageHeight < minSize) {
    return {
      x: 0,
      y: 0,
      width: Math.max(imageWidth, minSize),
      height: Math.max(imageHeight, minSize)
    };
  }

  const shorterSide = Math.min(imageWidth, imageHeight);
  const size = Math.max(minSize, Math.floor(shorterSide * 0.5));

  return {
    x: Math.floor((imageWidth - size) / 2),
    y: Math.floor((imageHeight - size) / 2),
    width: size,
    height: size
  };
};
