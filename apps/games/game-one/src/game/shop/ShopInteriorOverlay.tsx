import { useEffect, useRef, useState } from "react";
import { getShop, type ShopId } from "../content/shops";
import type { Direction } from "../input/gameInput";
import { MovementControls } from "../input/MovementControls";
import type { MovementControlMode } from "../input/movementControlPreference";
import type { GameLanguage } from "../localization/language";
import type { PlayableCharacterId } from "../player/playableCharacters";
import {
  createShopInteriorGame,
  type ShopInteriorGameController
} from "./createShopInteriorGame";
import {
  getShopActionLabel,
  getShopTaskObjective,
  interactWithShopTarget,
  type ShopDialogue,
  type ShopInteractionTarget,
  type ShopTaskState
} from "./shopTask";

type ShopInteriorOverlayProps = {
  shopId: ShopId;
  language: GameLanguage;
  characterId: PlayableCharacterId;
  movementControlMode: MovementControlMode;
  onMovementControlModeChange: (mode: MovementControlMode) => void;
  onMovementAudioState: (state: { moving: boolean }) => void;
  taskState: ShopTaskState;
  onTaskStateChange: (state: ShopTaskState) => void;
  onExit: () => void;
};

const shopCopy = {
  en: {
    exit: "Leave shop",
    loading: "Opening shop...",
    next: "Next",
    close: "Close",
    interactKey: "F"
  },
  fil: {
    exit: "Lumabas",
    loading: "Binubuksan ang tindahan...",
    next: "Susunod",
    close: "Isara",
    interactKey: "F"
  }
} as const;

type ActiveShopDialogue = {
  dialogue: ShopDialogue;
  pageIndex: number;
};

export function ShopInteriorOverlay({
  shopId,
  language,
  characterId,
  movementControlMode,
  onMovementControlModeChange,
  onMovementAudioState,
  taskState,
  onTaskStateChange,
  onExit
}: ShopInteriorOverlayProps) {
  const shop = getShop(shopId);
  const copy = shopCopy[language];
  const hostRef = useRef<HTMLDivElement | null>(null);
  const controllerRef = useRef<ShopInteriorGameController | null>(null);
  const onExitRef = useRef(onExit);
  const languageRef = useRef(language);
  const taskStateRef = useRef(taskState);
  const onTaskStateChangeRef = useRef(onTaskStateChange);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [keyboardDirections, setKeyboardDirections] = useState<ReadonlySet<Direction>>(() => new Set());
  const [activeTarget, setActiveTarget] = useState<ShopInteractionTarget | null>(null);
  const [activeDialogue, setActiveDialogue] = useState<ActiveShopDialogue | null>(null);
  onExitRef.current = onExit;
  languageRef.current = language;
  taskStateRef.current = taskState;
  onTaskStateChangeRef.current = onTaskStateChange;
  const objective = getShopTaskObjective(taskState, language);

  useEffect(() => {
    if (!hostRef.current || controllerRef.current) return;
    try {
      controllerRef.current = createShopInteriorGame(hostRef.current, {
        onExit: () => onExitRef.current(),
        characterId,
        onMovementAudioState,
        onInteractionTargetChange: setActiveTarget,
        onInteract: (targetId) => {
          const result = interactWithShopTarget(taskStateRef.current, targetId);
          taskStateRef.current = result.nextState;
          onTaskStateChangeRef.current(result.nextState);
          setActiveDialogue({ dialogue: result.dialogue, pageIndex: 0 });
          controllerRef.current?.setInputEnabled(false);
          setKeyboardDirections(new Set());
        },
        onKeyboardDirectionChange: (direction, active) => {
          setKeyboardDirections((current) => {
            const next = new Set(current);
            if (active) next.add(direction);
            else next.delete(direction);
            return next;
          });
        }
      });
      setStatus("ready");
    } catch (error) {
      console.error("Shop interior initialization failed", error);
      setStatus("error");
    }
    return () => {
      controllerRef.current?.destroy();
      controllerRef.current = null;
    };
  }, []);

  return (
    <section className="shop-map-overlay" role="dialog" aria-modal="true" aria-label={shop.displayName[language]}>
      <div ref={hostRef} className="shop-map-host" />
      {status !== "ready" && (
        <div className="shop-map-status" role="status">
          {status === "error" ? "Shop map could not open." : copy.loading}
        </div>
      )}
      <div className="shop-map-title">{shop.displayName[language]}</div>
      <div className="shop-task-objective" aria-live="polite">
        <strong>{objective.label}</strong>
        <span>{objective.text}</span>
      </div>
      <button type="button" className="shop-map-exit-button" onClick={() => onExitRef.current()}>
        {copy.exit}
      </button>
      {activeTarget && !activeDialogue && status === "ready" && (
        <button
          type="button"
          className="shop-interact-button"
          onClick={() => controllerRef.current?.interact()}
          aria-label={getShopActionLabel(activeTarget, language)}
        >
          <kbd>{copy.interactKey}</kbd>
          <span>{getShopActionLabel(activeTarget, language)}</span>
        </button>
      )}
      {activeDialogue && (
        <div className="shop-dialogue-layer">
          <div
            className="shop-dialogue-panel"
            role="dialog"
            aria-modal="true"
            aria-label={activeDialogue.dialogue.speaker[language]}
          >
            <strong>{activeDialogue.dialogue.speaker[language]}</strong>
            <p>{activeDialogue.dialogue.pages[language][activeDialogue.pageIndex]}</p>
            <button
              type="button"
              onClick={() => {
                const lastPage = activeDialogue.dialogue.pages[language].length - 1;
                if (activeDialogue.pageIndex < lastPage) {
                  setActiveDialogue({
                    ...activeDialogue,
                    pageIndex: activeDialogue.pageIndex + 1
                  });
                  return;
                }
                setActiveDialogue(null);
                controllerRef.current?.setInputEnabled(true);
              }}
            >
              {activeDialogue.pageIndex < activeDialogue.dialogue.pages[language].length - 1
                ? copy.next
                : copy.close}
            </button>
          </div>
        </div>
      )}
      <MovementControls
        disabled={status !== "ready" || activeDialogue !== null}
        language={language}
        mode={movementControlMode}
        keyboardDirections={keyboardDirections}
        onModeChange={(mode) => {
          controllerRef.current?.clearInput();
          setKeyboardDirections(new Set());
          onMovementControlModeChange(mode);
        }}
        onDirectionChange={(direction, active) => controllerRef.current?.setTouchDirection(direction, active)}
        onAnalogVectorChange={(vector) => controllerRef.current?.setAnalogVector(vector)}
      />
    </section>
  );
}
