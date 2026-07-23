import type { ReactNode } from "react";

import { ClaraStage, type ClaraStageLoadState } from "./ClaraStage";
import type {
  ClaraEmotion,
  ClaraPresentationCue,
  ClaraTeachingBehavior,
} from "./live2d/ClaraPresentation";
import { PointerTrail } from "./PointerTrail";
import { VectorCursor } from "./VectorCursor";

interface ClaraIntroStageProps {
  ariaLabelledBy: string;
  children: ReactNode;
  emotion?: ClaraEmotion;
  behavior?: ClaraTeachingBehavior;
  cue?: ClaraPresentationCue;
  overlay?: ReactNode;
  speaking?: boolean;
  speechLevel?: number;
  className?: string;
  routeFocus?: boolean;
  onClaraLoadStateChange?: (state: ClaraStageLoadState) => void;
}

function joinClasses(...values: Array<string | undefined>): string {
  return values.filter(Boolean).join(" ");
}

export function ClaraIntroStage({
  ariaLabelledBy,
  children,
  emotion = "default",
  behavior = "neutral",
  cue = "none",
  overlay,
  speaking = false,
  speechLevel,
  className,
  routeFocus = false,
  onClaraLoadStateChange,
}: ClaraIntroStageProps) {
  const preventDefault = (event: { preventDefault: () => void }): void =>
    event.preventDefault();

  return (
    <main
      className={joinClasses("intro-page learner-typography-page", className)}
      aria-labelledby={ariaLabelledBy}
      data-route-focus={routeFocus || undefined}
      tabIndex={routeFocus ? -1 : undefined}
      onContextMenu={preventDefault}
      onCopy={preventDefault}
      onCut={preventDefault}
      onDragStart={preventDefault}
    >
      <PointerTrail />
      <VectorCursor />
      {overlay}

      <section className="intro-page__content">
        <div className="intro-page__brand">{children}</div>
        <ClaraStage
          emotion={emotion}
          behavior={behavior}
          cue={cue}
          speaking={speaking}
          speechLevel={speechLevel}
          onLoadStateChange={onClaraLoadStateChange}
        />
      </section>
    </main>
  );
}
