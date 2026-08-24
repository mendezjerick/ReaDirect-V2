import type { SVGProps } from "react";

export type GameOneIconName =
  | "character"
  | "close"
  | "exit"
  | "help"
  | "language"
  | "menu"
  | "play"
  | "reset"
  | "sound"
  | "tutorial";

type GameOneVectorIconProps = Omit<SVGProps<SVGSVGElement>, "name"> & {
  name: GameOneIconName;
  size?: number;
};

/** Small inline icons keep the game UI crisp at every viewport and zoom level. */
export function GameOneVectorIcon({
  name,
  size = 24,
  ...props
}: GameOneVectorIconProps) {
  const common = {
    viewBox: "0 0 24 24",
    width: size,
    height: size,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    focusable: false,
    "aria-hidden": true,
    ...props,
  };

  switch (name) {
    case "character":
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="3.5" />
          <path d="M5.5 20c.5-3.4 2.7-5.5 6.5-5.5s6 2.1 6.5 5.5" />
          <path d="M7.5 5.8c1.1-2.1 7.9-2.1 9 0" />
        </svg>
      );
    case "close":
      return (
        <svg {...common}>
          <path d="m6 6 12 12M18 6 6 18" />
        </svg>
      );
    case "exit":
      return (
        <svg {...common}>
          <path d="M10 5H5v14h5M14 8l4 4-4 4M9 12h9" />
        </svg>
      );
    case "help":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M9.8 9a2.3 2.3 0 1 1 3.8 1.7c-1.1.8-1.6 1.2-1.6 2.5" />
          <path d="M12 16.7h.01" />
        </svg>
      );
    case "language":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18M12 3c2.3 2.5 3.4 5.5 3.4 9S14.3 18.5 12 21M12 3C9.7 5.5 8.6 8.5 8.6 12s1.1 6.5 3.4 9" />
        </svg>
      );
    case "menu":
      return (
        <svg {...common}>
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      );
    case "play":
      return (
        <svg {...common} fill="currentColor" stroke="none">
          <path d="m8 5 11 7-11 7z" />
        </svg>
      );
    case "reset":
      return (
        <svg {...common}>
          <path d="M4 11a8 8 0 1 1 2.3 5.7" />
          <path d="M4 5v6h6" />
        </svg>
      );
    case "sound":
      return (
        <svg {...common}>
          <path d="M4 10v4h4l5 4V6l-5 4z" />
          <path d="M17 9.5a4 4 0 0 1 0 5M19.5 7a7.5 7.5 0 0 1 0 10" />
        </svg>
      );
    case "tutorial":
      return (
        <svg {...common}>
          <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21z" />
          <path d="M4 5.5v15M8 7h8M8 11h7" />
        </svg>
      );
  }
}
