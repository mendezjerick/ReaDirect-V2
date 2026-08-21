import type { ReactNode, SVGProps } from "react";

export const WORD_RESCUE_WORDS = ["bat", "can", "dot", "gap", "hot"] as const;
export type WordRescueWord = (typeof WORD_RESCUE_WORDS)[number];

type IconProps = SVGProps<SVGSVGElement>;
type WordIcon = (props: IconProps) => ReactNode;

function PixelWordSvg({ path, style, ...props }: IconProps & { path: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      shapeRendering="crispEdges"
      style={{ fill: "currentColor", stroke: "none", ...style }}
      {...props}
    >
      <path d={path} fillRule="evenodd" clipRule="evenodd" />
    </svg>
  );
}

const BatIcon: WordIcon = (props) => (
  <PixelWordSvg
    path="M2 6h4v2h3v2h2v2h2v-2h2V8h3V6h4v5h-2v5h-4v3h-2v3h-4v-3H8v-3H4v-5H2z"
    {...props}
  />
);

const CanIcon: WordIcon = (props) => (
  <PixelWordSvg
    path="M6 2h12v2h2v16h-2v2H6v-2H4V4h2zm1 4v3h10V6zm0 5v3h10v-3zm0 5v3h10v-3z"
    {...props}
  />
);

const DotIcon: WordIcon = (props) => (
  <PixelWordSvg
    path="M8 3h8v2h3v3h2v8h-2v3h-3v2H8v-2H5v-3H3V8h2V5h3zm2 7v4h4v-4z"
    {...props}
  />
);

const GapIcon: WordIcon = (props) => (
  <PixelWordSvg
    path="M2 5h7v4H2zm13 0h7v4h-7zM2 15h7v4H2zm13 0h7v4h-7zM10 7h4v2h-4zm0 8h4v2h-4zM11 2h2v3h-2zm0 17h2v3h-2z"
    {...props}
  />
);

const HotIcon: WordIcon = (props) => (
  <PixelWordSvg
    path="M11 2h4v4h2v3h2v2h2v7h-2v3h-3v2H8v-2H5v-3H3v-6h2V9h3v4h2v-3h2V7h-1zm0 13H9v4h2v2h2v-2h2v-4h-2v2h-2z"
    {...props}
  />
);

export const WORD_RESCUE_ICON_BY_WORD: Record<WordRescueWord, WordIcon> = {
  bat: BatIcon,
  can: CanIcon,
  dot: DotIcon,
  gap: GapIcon,
  hot: HotIcon,
};

/**
 * Word Story uses local, authored pixel-vector icons. The text fallback remains
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
