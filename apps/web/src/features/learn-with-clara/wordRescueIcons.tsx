import type { ReactNode, SVGProps } from "react";

export const WORD_RESCUE_WORDS = ["bat", "can", "dot", "gap", "hot"] as const;
export type WordRescueWord = (typeof WORD_RESCUE_WORDS)[number];

type IconProps = SVGProps<SVGSVGElement>;
type WordIcon = (props: IconProps) => ReactNode;

const BatIcon: WordIcon = (props) => (
  <svg viewBox="0 0 64 64" {...props}>
    <path d="M8 23c9-1 15 2 24 8 9-6 15-9 24-8l-8 8 5 10-12-3-9 11-9-11-12 3 5-10-8-8Z" />
    <path d="M32 31v18M26 27l6 4 6-4" />
  </svg>
);

const CanIcon: WordIcon = (props) => (
  <svg viewBox="0 0 64 64" {...props}>
    <ellipse cx="32" cy="16" rx="17" ry="6" />
    <path d="M15 16v31c0 4 8 7 17 7s17-3 17-7V16" />
    <path d="M20 29h24M20 39h24" />
  </svg>
);

const DotIcon: WordIcon = (props) => (
  <svg viewBox="0 0 64 64" {...props}>
    <circle cx="32" cy="32" r="17" />
    <circle cx="32" cy="32" r="5" fill="currentColor" stroke="none" />
  </svg>
);

const GapIcon: WordIcon = (props) => (
  <svg viewBox="0 0 64 64" {...props}>
    <path d="M8 43h17M39 43h17M8 25h17M39 25h17" />
    <path d="M25 43h14M25 25h14" strokeDasharray="3 5" />
    <path d="m27 14 5 6 5-6M27 54l5-6 5 6" />
  </svg>
);

const HotIcon: WordIcon = (props) => (
  <svg viewBox="0 0 64 64" {...props}>
    <path d="M33 8c5 11-5 14-1 22 2 4 7 4 8-3 8 7 11 13 9 21-2 9-9 14-18 14-11 0-20-7-20-18 0-8 5-14 12-21 0 8 4 10 7 6 4-5-2-12 3-21Z" />
    <path d="M32 39c4 4 5 7 4 11-1 4-4 6-7 6-4 0-7-3-7-7 0-3 2-6 6-10 0 4 2 4 4 0Z" />
  </svg>
);

export const WORD_RESCUE_ICON_BY_WORD: Record<WordRescueWord, WordIcon> = {
  bat: BatIcon,
  can: CanIcon,
  dot: DotIcon,
  gap: GapIcon,
  hot: HotIcon,
};

/**
 * Word Story uses local, authored vector icons. The text fallback remains
 * available for any future vocabulary item that is not in this mapping.
 */
export function WordRescueIcon({
  word,
  ...props
}: { word: string } & IconProps) {
  const Icon = WORD_RESCUE_ICON_BY_WORD[word as WordRescueWord];
  if (!Icon) {
    return (
      <span className="word-rescue-icon word-rescue-icon__fallback">
        {word}
      </span>
    );
  }

  return (
    <Icon
      className="word-rescue-icon"
      aria-hidden="true"
      focusable="false"
      {...props}
    />
  );
}
