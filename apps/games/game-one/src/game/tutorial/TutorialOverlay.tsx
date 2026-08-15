import { useEffect, useLayoutEffect, useState } from "react";
import { useNarration } from "../narration/useNarration";
import { useTypewriterPreference, useTypewriterText } from "../narration/useTypewriterText";
import { tutorialInstruction, tutorialTarget } from "./tutorialContent";
import type { TutorialState } from "./tutorialState";
import { getUiCopy, type GameLanguage } from "../localization/language";

type TutorialOverlayProps = {
  state: TutorialState;
  interactionAvailable: boolean;
  onKeepLearning: () => void;
  onSkip: () => void;
  onRequestSkip: () => void;
  onFinish: () => void;
  onAdvance: () => void;
  language?: GameLanguage;
  onChangeLanguage?: () => void;
};

export function TutorialOverlay({
  state,
  interactionAvailable,
  onKeepLearning,
  onSkip,
  onRequestSkip,
  onFinish,
  onAdvance,
  language = "en",
  onChangeLanguage
}: TutorialOverlayProps) {
  const copy = getUiCopy(language);
  const readyStep = state.step === "ready";
  const confirmingAnswerLater = state.step === "answerLater" &&
    typeof document !== "undefined" &&
    document.querySelector('[data-tutorial="save-for-later"]') !== null;
  const instruction = confirmingAnswerLater
    ? (language === "fil" ? "Pindutin ang I-save para Mamaya." : "Tap Save for Later.")
    : tutorialInstruction(state.step, interactionAvailable, language);
  const selector = readyStep ? null : tutorialTarget(state.step, interactionAvailable);
  const target = useTargetRectangle(selector, state.active);
  const activityPanel = useTargetRectangle(
    readyStep ? null : '.mission-overlay [role="dialog"]',
    state.active
  );
  const { enabled, toggle } = useTypewriterPreference();
  const typewriter = useTypewriterText(instruction, enabled);
  const narration = useNarration(instruction, state.active && !state.skipConfirmationOpen, language);
  const replayNarration = narration.replay;

  useEffect(() => {
    if (!state.active || state.skipConfirmationOpen || state.step === "ready") return;
    const reminder = window.setTimeout(() => replayNarration(), 8000);
    return () => window.clearTimeout(reminder);
  }, [replayNarration, state.active, state.skipConfirmationOpen, state.step]);

  if (!state.active) return null;
  const placementBoundary = activityPanel ?? target;
  const sidePlacement = getSidePlacement(placementBoundary);
  const placeAtSide = target !== null && sidePlacement !== null;
  const placeAtTop = Boolean(placementBoundary && (
    placementBoundary.top > window.innerHeight / 2 ||
    placementBoundary.bottom > window.innerHeight * 0.65
  ));
  const narratorStyle = placeAtSide && placementBoundary && sidePlacement
    ? sideNarratorStyle(placementBoundary, sidePlacement)
    : undefined;
  const readingStep = ["reading", "choice", "answerLater"].includes(state.step);

  return (
    <div className="tutorial-layer" aria-label={copy.guidedTutorial}>
      {target && (
        <>
          <div
            className="tutorial-spotlight"
            data-tutorial-target={state.step}
            style={{ left: target.left, top: target.top, width: target.width, height: target.height }}
          />
          <div
            className="tutorial-pointer"
            aria-hidden="true"
            style={{ left: Math.max(12, target.left + target.width / 2 - 14), top: pointerTop(target) }}
          >
            <span className="tutorial-pointer-finger" />
            <span className="tutorial-pointer-palm" />
          </div>
        </>
      )}

      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="tutorial-speaker"
        className={`tutorial-narrator ${readingStep ? "is-reading-step " : ""}${readyStep ? "is-ready" : !target ? "is-targetless" : placeAtSide ? `is-side is-${sidePlacement}` : placeAtTop ? "is-top" : "is-bottom"}`}
        style={narratorStyle}
        onClick={() => {
          if (!typewriter.isComplete) typewriter.complete();
        }}
      >
        <div className="tutorial-message">
          <p id="tutorial-speaker" className="tutorial-speaker">{copy.narrator}</p>
          <p className="tutorial-copy" aria-label={instruction}>{typewriter.displayedText}</p>
          {!typewriter.isComplete && <span className="tutorial-more-arrow" aria-hidden="true">v</span>}
        </div>
        <div className="tutorial-tools">
          {narration.supported && (
            <>
              <button type="button" onClick={(event) => { event.stopPropagation(); narration.replay(); }} disabled={narration.muted}>{copy.replayVoice}</button>
              <button type="button" onClick={(event) => { event.stopPropagation(); narration.toggleMute(); }}>{narration.muted ? copy.turnVoiceOn : copy.mute}</button>
            </>
          )}
          <button type="button" onClick={(event) => { event.stopPropagation(); toggle(); }}>{enabled ? copy.textEffectOff : copy.textEffectOn}</button>
          {onChangeLanguage && <button type="button" onClick={(event) => { event.stopPropagation(); onChangeLanguage(); }}>{copy.changeLanguage}</button>}
          {state.step === "ready" ? (
            <button type="button" data-tutorial="finish" className="tutorial-finish" onClick={(event) => { event.stopPropagation(); onFinish(); }}>{copy.startAdventure}</button>
          ) : isNavigationInfoStep(state.step) ? (
            <>
              <button type="button" className="tutorial-finish" onClick={(event) => { event.stopPropagation(); onAdvance(); }}>{copy.gotIt}</button>
              <button type="button" onClick={(event) => { event.stopPropagation(); onRequestSkip(); }}>{copy.skipTutorial}</button>
            </>
          ) : (
            <button type="button" className="tutorial-skip" onClick={(event) => { event.stopPropagation(); onRequestSkip(); }}>{copy.skipTutorial}</button>
          )}
        </div>
      </section>

      {state.skipConfirmationOpen && (
        <div className="tutorial-confirm-layer">
          <section role="alertdialog" aria-modal="true" aria-labelledby="skip-tutorial-title" className="tutorial-confirm">
            <p className="tutorial-speaker">{copy.narrator}</p>
            <h2 id="skip-tutorial-title">{copy.skipTutorialTitle}</h2>
            <div>
              <button type="button" autoFocus onClick={onKeepLearning}>{copy.keepLearning}</button>
              <button type="button" onClick={onSkip}>{copy.skipTutorial}</button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function isNavigationInfoStep(step: TutorialState["step"]) {
  return ["missionPanel", "directionArrow", "navigationTrail", "minimap"].includes(step);
}

function useTargetRectangle(selector: string | null, active: boolean) {
  const [rectangle, setRectangle] = useState<DOMRect | null>(null);
  useLayoutEffect(() => {
    if (!active || !selector) {
      setRectangle(null);
      return;
    }
    let frame = 0;
    const update = () => {
      frame = window.requestAnimationFrame(() => {
        const element = document.querySelector<HTMLElement>(selector);
        if (!element) {
          setRectangle(null);
          return;
        }
        element.scrollIntoView?.({ block: "nearest", inline: "nearest" });
        const rect = element.getBoundingClientRect();
        const padding = 8;
        const left = Math.max(4, rect.left - padding);
        const top = Math.max(4, rect.top - padding);
        const right = Math.min(window.innerWidth - 4, rect.right + padding);
        const bottom = Math.min(window.innerHeight - 4, rect.bottom + padding);
        setRectangle(new DOMRect(
          left,
          top,
          Math.max(1, right - left),
          Math.max(1, bottom - top)
        ));
      });
    };
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
    };
  }, [active, selector]);
  return rectangle;
}

function pointerTop(target: DOMRect) {
  const below = target.top + target.height + 8;
  return below + 42 < window.innerHeight ? below : Math.max(4, target.top - 48);
}

function getSidePlacement(target: DOMRect | null): "left" | "right" | null {
  if (
    !target ||
    window.innerWidth <= window.innerHeight ||
    window.innerWidth < 760 ||
    window.innerHeight < 430
  ) return null;
  const leftSpace = target.left - 12;
  const rightSpace = window.innerWidth - target.right - 12;
  const minimumWidth = 280;
  if (rightSpace >= minimumWidth) return "right";
  if (leftSpace >= minimumWidth) return "left";
  return null;
}

function sideNarratorStyle(target: DOMRect, side: "left" | "right") {
  const availableWidth = side === "right"
    ? window.innerWidth - target.right - 20
    : target.left - 20;
  const width = Math.min(320, availableWidth);
  const top = Math.max(8, Math.min(target.top, window.innerHeight - 300));
  return {
    left: side === "right" ? target.right + 12 : target.left - width - 12,
    top,
    width,
    maxHeight: window.innerHeight - top - 8,
    transform: "none"
  };
}
