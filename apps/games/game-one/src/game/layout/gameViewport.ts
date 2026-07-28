export type NormalizedPosition = {
  x: number;
  y: number;
};

export type ViewportSize = {
  width: number;
  height: number;
};

export const GAME_ASPECT_RATIO = 16 / 9;

export function fitAspectWithin(
  viewport: ViewportSize,
  aspectRatio = GAME_ASPECT_RATIO
): ViewportSize {
  const width = Math.max(1, viewport.width);
  const height = Math.max(1, viewport.height);

  if (width / height > aspectRatio) {
    return { width: height * aspectRatio, height };
  }

  return { width, height: width / aspectRatio };
}

export function clampInteractionPromptPosition(
  position: NormalizedPosition,
  viewport: ViewportSize
): NormalizedPosition {
  const width = Math.max(1, viewport.width);
  const height = Math.max(1, viewport.height);
  const shortLandscape = width > height && height <= 500;
  const topReserve = shortLandscape ? 64 : 88;
  const bottomReserve = shortLandscape ? 112 : 80;
  const minimumY = clamp(topReserve / height, 0.12, 0.42);
  const maximumY = clamp(1 - bottomReserve / height, minimumY, 0.9);

  return {
    x: clamp(position.x, 0.06, 0.94),
    y: clamp(position.y, minimumY, maximumY)
  };
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}
