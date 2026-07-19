const CSS_IMAGE_URL_PATTERN =
  /^url\(\s*(?:"([^"]+)"|'([^']+)'|([^)'"\s][^)]*))\s*\)$/;

export function getCssImageTokenUrl(token: string): string | null {
  const value = window
    .getComputedStyle(document.documentElement)
    .getPropertyValue(token)
    .trim();
  const match = CSS_IMAGE_URL_PATTERN.exec(value);
  const url = match?.[1] ?? match?.[2] ?? match?.[3];

  return url?.trim() || null;
}

export function preloadCssImageToken(token: string): HTMLImageElement | null {
  const url = getCssImageTokenUrl(token);

  if (!url) {
    return null;
  }

  const image = new Image();
  image.decoding = "async";
  image.src = url;
  return image;
}
