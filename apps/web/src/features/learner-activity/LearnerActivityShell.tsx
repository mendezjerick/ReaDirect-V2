import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";

import type {
  ClaraEmotion,
  ClaraPresentationCue,
  ClaraTeachingBehavior,
} from "../intro/live2d/ClaraPresentation";
import { ClaraStage } from "../intro/ClaraStage";
import { PointerTrail } from "../intro/PointerTrail";
import { VectorCursor } from "../intro/VectorCursor";
import { LearnerActivityHomeButton } from "./LearnerActivityHomeButton";

interface LearnerActivityShellProps {
  className?: string;
  overlay?: ReactNode;
  eyebrow: ReactNode;
  title: ReactNode;
  headerAside?: ReactNode;
  itemContent: ReactNode;
  itemPanelAccessory?: ReactNode;
  itemPanelClassName?: string;
  recorderContent?: ReactNode;
  recorderAriaLabel?: string;
  primaryActionKey: string;
  primaryAction: ReactNode;
  secondaryAction?: ReactNode;
  claraEmotion: ClaraEmotion;
  claraBehavior?: ClaraTeachingBehavior;
  claraCue?: ClaraPresentationCue;
  claraSpeaking: boolean;
  claraSpeechLevel: number;
  onClaraReadyChange: (ready: boolean) => void;
  reduceMotion: boolean;
  onHome?: () => void;
  homeLabel?: string;
  claraContent?: ReactNode;
}

export function LearnerActivityShell({
  className = "",
  overlay,
  eyebrow,
  title,
  headerAside,
  itemContent,
  itemPanelAccessory,
  itemPanelClassName = "",
  recorderContent,
  recorderAriaLabel = "Voice recorder",
  primaryActionKey,
  primaryAction,
  secondaryAction,
  claraEmotion,
  claraBehavior = "neutral",
  claraCue = "none",
  claraSpeaking,
  claraSpeechLevel,
  onClaraReadyChange,
  reduceMotion,
  onHome,
  homeLabel,
  claraContent,
}: LearnerActivityShellProps) {
  return (
    <main
      className={`assessment-page learner-flow-page learner-typography-page ${className}`.trim()}
      data-route-focus
      tabIndex={-1}
    >
      {overlay}
      <PointerTrail />
      <VectorCursor />
      <header className="assessment-header">
        <LearnerActivityHomeButton onHome={onHome} label={homeLabel} />
        <div className="assessment-header__copy">
          <p>{eyebrow}</p>
          <h1>{title}</h1>
        </div>
        {headerAside ? (
          <div className="assessment-header__aside">{headerAside}</div>
        ) : null}
      </header>

      <section className={`assessment-item-panel ${itemPanelClassName}`.trim()}>
        <section className="assessment-stage" aria-live="polite">
          {itemContent}
        </section>
        {itemPanelAccessory}
      </section>

      <section className="assessment-interaction-strip">
        {recorderContent !== undefined ? (
          <section
            className="assessment-recorder-panel"
            aria-label={recorderAriaLabel}
          >
            {recorderContent}
          </section>
        ) : null}

        <footer className="assessment-action-dock">
          <div className="assessment-clara">
            {claraContent ?? (
              <ClaraStage
                emotion={claraEmotion}
                behavior={claraBehavior}
                cue={claraCue}
                speaking={claraSpeaking}
                speechLevel={claraSpeechLevel}
                onLoadStateChange={(state) =>
                  onClaraReadyChange(state === "ready")
                }
              />
            )}
          </div>

          <div
            className="assessment-action-slot"
            data-assessment-action-split={secondaryAction ? true : undefined}
          >
            <motion.div
              className="assessment-action-primary"
              layout={!reduceMotion}
              transition={{
                duration: reduceMotion ? 0 : 0.26,
                ease: "easeOut",
              }}
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={primaryActionKey}
                  className="assessment-action-transition"
                  initial={
                    reduceMotion ? false : { opacity: 0, scale: 0.94, y: 8 }
                  }
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={
                    reduceMotion
                      ? undefined
                      : { opacity: 0, scale: 0.97, y: -6 }
                  }
                  transition={{
                    duration: reduceMotion ? 0 : 0.2,
                    ease: "easeOut",
                  }}
                >
                  {primaryAction}
                </motion.div>
              </AnimatePresence>
            </motion.div>
            {secondaryAction}
          </div>
        </footer>
      </section>
    </main>
  );
}
