import { useEffect, useRef } from "react";

export function VectorCursor() {
  const cursorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cursor = cursorRef.current;
    const finePointer = window.matchMedia("(pointer: fine)");

    if (!cursor || !finePointer.matches) {
      return;
    }

    const moveCursor = (event: PointerEvent) => {
      cursor.style.setProperty("--cursor-x", `${event.clientX}px`);
      cursor.style.setProperty("--cursor-y", `${event.clientY}px`);
      cursor.dataset.visible = "true";
    };

    const hideCursor = () => {
      cursor.dataset.visible = "false";
    };

    window.addEventListener("pointermove", moveCursor);
    document.documentElement.addEventListener("mouseleave", hideCursor);
    window.addEventListener("blur", hideCursor);

    return () => {
      window.removeEventListener("pointermove", moveCursor);
      document.documentElement.removeEventListener("mouseleave", hideCursor);
      window.removeEventListener("blur", hideCursor);
    };
  }, []);

  return (
    <div
      ref={cursorRef}
      className="vector-cursor"
      data-visible="false"
      aria-hidden="true"
    >
      <span className="vector-cursor__tip" />
      <span className="vector-cursor__dot" />
    </div>
  );
}
