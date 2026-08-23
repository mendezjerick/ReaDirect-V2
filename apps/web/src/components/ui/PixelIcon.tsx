import type { SVGProps } from "react";

export type PixelIconName =
  | "arrow-left"
  | "arrow-right"
  | "arrow-up"
  | "book"
  | "book-shield"
  | "check"
  | "check-circle"
  | "clara"
  | "clipboard-check"
  | "clock"
  | "close"
  | "comprehension"
  | "cube"
  | "dashboard"
  | "document"
  | "external-link"
  | "flag"
  | "gamepad"
  | "globe"
  | "home"
  | "learner"
  | "leaf"
  | "lightbulb"
  | "lock"
  | "mail"
  | "menu"
  | "microphone"
  | "phrases"
  | "play"
  | "progress"
  | "reader"
  | "replay"
  | "school"
  | "sentences"
  | "shield"
  | "speaker"
  | "speech"
  | "stop"
  | "swap"
  | "teacher"
  | "trend-up"
  | "trophy"
  | "users"
  | "warning"
  | "wifi-off"
  | "words";

interface PixelIconProps extends Omit<SVGProps<SVGSVGElement>, "children"> {
  name: PixelIconName;
}

const iconPaths: Record<PixelIconName, string> = {
  "arrow-left": "M2 11h3V9h2V7h2V5h4v5h9v4h-9v5H9v-2H7v-2H5v-2H2z",
  "arrow-right": "M3 8h7V4h4v3h3v3h4v4h-4v3h-3v3h-4v-4H3z",
  "arrow-up": "M10 3h4v2h3v3h3v4h-5v9H9v-9H4V8h3V5h3z",
  book: "M2 4h8v2h2v15h-2v-2H2zm12 2h2V4h8v15h-8v2h-2zM5 8v2h5V8zm0 4v2h5v-2zm9-4v2h5V8zm0 4v2h5v-2z",
  "book-shield":
    "M2 4h8v2h2v15h-2v-2H2zm12 2h2V4h6v7h-3V8h-5zm3 6h6v7h-2v2h-2v-2h-2zm2 2v3h2v-3zM5 8v2h5V8zm0 4v2h5v-2z",
  check: "M3 11h4v4h3v3h4v-3h3v-3h3V7h-4v3h-3v3h-2v-2H7V8H3z",
  "check-circle":
    "M7 2h10v2h3v3h2v10h-2v3h-3v2H7v-2H4v-3H2V7h2V4h3zm0 5H5v10h2v2h10v-2h2V7h-2V5H7zm0 4h3v3h2v-2h2v-2h4v4h-2v2h-2v2h-4v-2H8v-2H7z",
  clara:
    "M7 2h10v2h3v4h2v11h-3v3H5v-3H2V8h2V4h3zm0 5H5v10h3v2h8v-2h3V7h-3V5H8v2zm0 3h4v3H7zm6 0h4v3h-4zm-4 6h6v2H9z",
  "clipboard-check":
    "M8 2h8v2h4v18H4V4h4zm2 2v2h4V4zM7 8v11h10V8zm1 5h3v2h2v-2h2v-2h3v4h-2v2h-5v-2H8z",
  clock:
    "M7 2h10v2h3v3h2v10h-2v3h-3v2H7v-2H4v-3H2V7h2V4h3zm0 5H5v10h2v2h10v-2h2V7h-2V5H7zm4 0h3v5h4v3h-7z",
  close:
    "M4 3h4v3h2v2h4V6h2V3h4v5h-2v2h-2v4h2v2h2v5h-4v-3h-2v-2h-4v2H8v3H4v-5h2v-2h2v-4H6V8H4z",
  comprehension:
    "M3 3h18v15h-8l-5 4v-4H3zm5 4v3h3V8h3v3h-3v3h4v-2h2V7h-2V5H9v2zm3 9h3v-2h-3z",
  cube: "M9 2h6v2h4v2h3v12h-3v2h-4v2H9v-2H5v-2H2V6h3V4h4zm0 4H6v2h3v2h6V8h3V6h-3V4H9zm-4 4v6h2v2h3v-6H8v-2zm9 2v6h2v-2h3v-6h-3v2z",
  dashboard: "M3 3h8v8H3zm10 0h8v5h-8zM3 13h8v8H3zm10-3h8v11h-8z",
  document: "M5 2h10l4 4v16H5zm3 7v2h8V9zm0 4v2h8v-2zm0 4v2h6v-2zM15 4v3h3z",
  "external-link": "M11 3h10v10h-4V9l-8 8-3-3 8-7h-3zM3 7h6v4H7v6h6v-2h4v6H3z",
  flag: "M4 2h4v2h11v3h-2v3h2v4H8v8H4zm4 5v4h7V7z",
  gamepad:
    "M7 6h10v2h3v3h2v8h-3v2h-4l-2-3h-2l-2 3H5v-2H2v-8h2V8h3zm0 5v2H5v3h2v-2h2v-3zm8 0v3h3v-3z",
  globe:
    "M7 2h10v2h3v3h2v10h-2v3h-3v2H7v-2H4v-3H2V7h2V4h3zm1 3H6v4h3zm4 0v4h3l-1-4zm5 0 1 4h2V7zm-5 6v3h4v-3zm6 0v3h2v-3zM4 11v3h3v-3zm4 5 1 3h3v-3zm6 0-1 3h3v-3zm3 0-1 3h1l2-2v-1zM6 16v1l2 2h1l-1-3z",
  home: "M10 2h4v2h3v3h3v3h2v4h-3v8H5v-8H2v-4h2V7h3V4h3zm0 6H8v2H6v9h4v-6h4v6h4v-9h-2V8h-2V6h-4z",
  learner:
    "M10 3h4v2h4v2h4v4h-3v5h-2v2h-2v2H9v-2H7v-2H5v-5H2V7h4V5h4zM7 9l5 3 5-3-5-3zm1 4v2h2v2h4v-2h2v-2l-4 2z",
  leaf: "M14 2h8v8h-2v4h-2v3h-4v2H8v3H3v-5h3v-5h2V8h3V5h3zm0 6h-2v2h-2v4H8v3h3v-2h4v-2h2V9h2V5h-3v3z",
  lightbulb:
    "M8 2h8v2h3v3h2v7h-2v3h-3v2H8v-2H5v-3H3V7h2V4h3zm0 4H6v7h2v2h2v2h4v-2h2v-2h2V7h-2V5H8zm1 14h6v2H9z",
  lock: "M7 2h10v3h2v5h3v12H2V10h3V5h2zm2 3H8v5h8V5h-1V4H9zm-4 8v6h14v-6z",
  mail: "M2 4h20v16H2zm3 3v2h2v2h2v2h6v-2h2V9h2V7h-3v2h-2v2h-4V9H8V7zm0 5v5h14v-5h-2v2h-2v2H9v-2H7v-2z",
  menu: "M3 4h18v4H3zm0 6h18v4H3zm0 6h18v4H3z",
  microphone:
    "M9 2h6v2h2v9h-2v3H9v-3H7V4h2zm0 12v2h2v2H7v3h10v-3h-4v-2h2v-2h4V9h3v5h-2v3h-3v2h-2v2H9v-2H7v-2H4v-3H2V9h3v5z",
  phrases: "M3 4h12v3H3zm0 6h18v3H3zm0 6h14v3H3zm15-12h3v3h-3z",
  play: "M6 3h5v3h4v3h4v6h-4v3h-4v3H6z",
  progress:
    "M9 2h6v2h3v2h2v3h2v6h-2v3h-2v2h-3v2H9v-2H6v-2H4v-3H2V9h2V6h2V4h3zm0 4H7v2H5v8h2v2h10v-2h2V8h-2V6h-2V4H9zm2 1h3v5h4v3h-7z",
  reader:
    "M2 3h8v2h2v17h-2v-2H2zm12 2h2V3h8v17h-8v2h-2zM5 7v9h5V8H8V7zm9 1v14h2v-2h5V7h-5v1z",
  replay:
    "M6 3h4v3h7v2h3v3h2v6h-2v3h-3v2H7v-2H4v-3H2v-5h4v4h2v2h8v-2h2v-4h-2v-2h-6v3H6z",
  school:
    "M10 2h4v2h4v2h3v3h2v3h-2v8h3v2H0v-2h3v-8H1V9h2V7h3V5h4zm0 6H7v2h10V8h-3V6h-4zm-4 5v7h3v-5h6v5h3v-7zm4 2v5h4v-5z",
  sentences: "M3 4h18v3H3zm0 6h15v3H3zm0 6h12v3H3zm15 0h3v3h-3z",
  shield:
    "M5 3h14v3h3v8h-2v4h-3v2h-3v2h-4v-2H7v-2H4v-4H2V6h3zm3 4H5v6h2v3h3v2h4v-2h3v-3h2V7h-3V5H8z",
  speaker:
    "M2 8h5V6h3V4h4v16h-4v-2H7v-2H2zm14 1h3v2h2v2h-2v2h-3v-3h2v-1h-2zm3-5h3v3h2v10h-2v3h-3v-3h2V7h-2z",
  speech: "M2 3h20v15h-9l-6 4v-4H2zm4 5v3h3V8zm5 0v3h3V8zm5 0v3h3V8z",
  stop: "M5 5h14v14H5z",
  swap: "M3 5h12V2h4v3h3v4h-3v3h-4V9H3zm18 10H9v-3H5v3H2v4h3v3h4v-3h12z",
  teacher:
    "M6 2h7v2h3v7h-2v3h-2v2H7v-2H5v-3H3V4h3zm1 4H6v4h2v3h3v-3h2V5H7zm9 5h3v3h3v3h-3v3h-3v-3h-3v-3h3zM3 17h7v2H3z",
  "trend-up": "M3 17h4v-3h3v-3h3v2h2V9h-2V6h8v8h-3v-2h-2v4h-3v2h-3v2H3z",
  trophy:
    "M6 2h12v3h4v8h-2v3h-4v3h-2v2h5v3H5v-3h5v-2H8v-3H4v-3H2V5h4zm3 3H6v6h2v3h8v-3h2V5h-3v6H9zm-4 3v3h2V8zm12 0v3h2V8z",
  users:
    "M5 2h6v2h2v7h-2v2H5v-2H3V4h2zm10 3h4v2h2v5h-2v2h-4v-2h2v-2h1V7h-3zM3 15h10v2h2v5H1v-5h2zm12 1h5v2h2v4h-5v-5h-2z",
  warning:
    "M10 2h4v3h2v3h2v3h2v3h2v8H2v-8h2v-3h2V8h2V5h2zm1 6v7h3V8zm0 9v3h3v-3z",
  "wifi-off":
    "M3 3h3v3h3v2h6V6h4v2h3v4h-4v-2h-5l3 3h2v3h-2l5 5h-4l-3-3v3h-4v-4h3l-3-3H6v-2h2L5 9H2V6h1z",
  words:
    "M3 5h18v14H3zm3 3v3h3V8zm5 0v3h3V8zm5 0v3h2V8zM6 13v3h6v-3zm8 0v3h4v-3z",
};

export function PixelIcon({
  name,
  className,
  style,
  ...props
}: PixelIconProps) {
  const classes = ["pixel-icon", className].filter(Boolean).join(" ");

  return (
    <svg
      {...props}
      className={classes}
      viewBox="0 0 24 24"
      aria-hidden="true"
      data-pixel-icon={name}
      focusable="false"
      shapeRendering="crispEdges"
      style={{ fill: "currentColor", stroke: "none", ...style }}
    >
      <path d={iconPaths[name]} fillRule="evenodd" clipRule="evenodd" />
    </svg>
  );
}
