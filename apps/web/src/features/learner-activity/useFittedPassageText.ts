import { useLayoutEffect, useRef, useState } from "react";

const PASSAGE_FIT_ATTEMPTS = 10;

export const RESPONSIVE_PASSAGE_MIN_FONT_PX = 14;

export function findLargestFittingFontSize(
  minFontSize: number,
  maxFontSize: number,
  fitsAtSize: (fontSize: number) => boolean,
) {
  if (fitsAtSize(maxFontSize)) return maxFontSize;

  let lowerBound = minFontSize;
  let upperBound = maxFontSize;
  let fittedSize = minFontSize;

  for (let attempt = 0; attempt < PASSAGE_FIT_ATTEMPTS; attempt += 1) {
    const candidate = (lowerBound + upperBound) / 2;

    if (fitsAtSize(candidate)) {
      fittedSize = candidate;
      lowerBound = candidate;
    } else {
      upperBound = candidate;
    }
  }

  return Math.floor(fittedSize * 10) / 10;
}

export function useFittedPassageText(
  passage: string,
  maxFontSize: number,
  minFontSize = RESPONSIVE_PASSAGE_MIN_FONT_PX,
) {
  const passageRef = useRef<HTMLElement>(null);
  const textRef = useRef<HTMLParagraphElement>(null);
  const [fontSize, setFontSize] = useState(maxFontSize);

  useLayoutEffect(() => {
    const passageElement = passageRef.current;
    const textElement = textRef.current;

    if (!passageElement || !textElement) return;

    let animationFrame = 0;
    let disposed = false;

    const fitPassage = () => {
      animationFrame = 0;
      if (
        disposed ||
        textElement.clientWidth <= 0 ||
        textElement.clientHeight <= 0
      ) {
        return;
      }

      const fittedSize = findLargestFittingFontSize(
        minFontSize,
        maxFontSize,
        (candidate) => {
          textElement.style.fontSize = `${candidate}px`;
          return (
            textElement.scrollHeight <= textElement.clientHeight + 1 &&
            textElement.scrollWidth <= textElement.clientWidth + 1
          );
        },
      );

      textElement.style.fontSize = `${fittedSize}px`;
      setFontSize(fittedSize);
    };

    const scheduleFit = () => {
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(fitPassage);
    };

    const resizeObserver =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(scheduleFit);

    resizeObserver?.observe(passageElement);
    window.addEventListener("resize", scheduleFit);
    void document.fonts?.ready.then(scheduleFit);
    scheduleFit();

    return () => {
      disposed = true;
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
      resizeObserver?.disconnect();
      window.removeEventListener("resize", scheduleFit);
      textElement.style.fontSize = "";
    };
  }, [maxFontSize, minFontSize, passage]);

  return { passageRef, textRef, fontSize };
}
