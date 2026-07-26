import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./styles/game-one.css";
import { createKaplayGame, type KaplayGameController } from "./game/kaplay/createKaplayGame";
import type { Direction } from "./game/input/gameInput";
import { MovementControls } from "./game/input/MovementControls";
import {
  loadMovementControlPreference,
  saveMovementControlPreference,
  type MovementControlMode
} from "./game/input/movementControlPreference";
import {
  getMissionTargetNpcId,
  isMissionStageBlocking,
  missionReducer,
  type MissionStage
} from "./game/mission/missionState";
import { getMissions, MISSIONS } from "./game/content/missions";
import { createMissionRounds, createSessionRandom } from "./game/questions/questionRound";
import {
  CompletionOverlay,
  DeferredSavedNotice,
  DeferredQuestionOverlay,
  DeferredResumeOverlay,
  DialogueOverlay,
  HeartRecoveryOverlay,
  HelpOverlay,
  MissionActionOverlay,
  MissionAnnouncements,
  MissionResultOverlay,
  QuestionOverlay,
  QuestionIntroOverlay,
  QuestionsCompletedOverlay,
  ReadingIntroOverlay,
  RemainingQuestionsOverlay,
  StoryPresentationOverlay,
  StoryReviewOverlay
} from "./game/ui/MissionUi";
import { TutorialOverlay } from "./game/tutorial/TutorialOverlay";
import { tutorialAllowsMissionEvent, tutorialReducer, type TutorialStep } from "./game/tutorial/tutorialState";
import { consumeProgressResetRequest } from "./game/progress/resetLearnerProgress";
import { NavigationHud, type PlayerNavigationState } from "./game/navigation/NavigationHud";
import { PROTOTYPE_MAP } from "./game/map/prototypeMap";
import { AudioSettingsOverlay } from "./game/audio/AudioSettingsOverlay";
import { createRpgAudioManager, type AudioPreferences } from "./game/audio/rpgAudioManager";
import { getNpc } from "./game/content/npcs";
import { movementHeadsTowardTarget } from "./game/navigation/navigationModel";
import { LanguageSelectionOverlay } from "./game/localization/LanguageSelectionOverlay";
import { getUiCopy, loadLanguagePreference, saveLanguagePreference, type GameLanguage } from "./game/localization/language";
import { FishingOverlay } from "./game/fishing/FishingOverlay";
import { FISHING_SPOTS, getDiscoveredFishingSpotIds, getFishingProximity, type FishingResultId } from "./game/fishing/fishingSystem";
import { RegionBanner } from "./game/world/RegionBanner";
import {
  createInitialExplorationProgress,
  isSafeExplorationPosition
} from "./game/world/explorationPersistence";
import { getWorldRegionAtPoint, type WorldRegionId } from "./game/world/worldRegions";
import type { GameOneHostAdapter } from "./host/GameOneHostAdapter";
import {
  checkpointKeyForMission,
  createGameOneSaveState,
  GAME_ONE_SAVE_SCHEMA_VERSION,
  hydrateGameOneProgress,
  type HydratedGameOneProgress
} from "./game/persistence/gameOneSaveContract";
import { GameOneSaveCoordinator } from "./game/persistence/GameOneSaveCoordinator";

type GameStatus = "loading" | "ready" | "error";
type PauseReason = "manual" | "document-hidden" | "exit-dialog";

const missingHostAdapter: GameOneHostAdapter = {
  load: () => Promise.reject(new Error("An authenticated Game One host is required.")),
  save: () => Promise.reject(new Error("An authenticated Game One host is required.")),
  reset: () => Promise.reject(new Error("An authenticated Game One host is required."))
};

export function GameRoutePage({
  host = missingHostAdapter
}: {
  host?: GameOneHostAdapter;
}) {
  const navigate = useNavigate();
  const [hydrationAttempt, setHydrationAttempt] = useState(0);
  const [hydration, setHydration] = useState<
    | { status: "loading" }
    | { status: "error"; message: string }
    | { status: "ready"; progress: HydratedGameOneProgress }
  >({ status: "loading" });
  const [storedLanguagePreference] = useState(loadLanguagePreference);
  const preferredLanguage = storedLanguagePreference ?? "en";
  const [random] = useState(createSessionRandom);
  const [initialRounds] = useState(() =>
    createMissionRounds(getMissions(preferredLanguage), random)
  );

  useEffect(() => {
    let cancelled = false;
    setHydration({ status: "loading" });

    void host.load()
      .then(async (save) => {
        if (consumeProgressResetRequest()) {
          await host.reset(save?.revision ?? 0);
          save = null;
        }
        if (cancelled) return;
        setHydration({
          status: "ready",
          progress: hydrateGameOneProgress(
            save,
            initialRounds,
            preferredLanguage
          )
        });
      })
      .catch((reason: unknown) => {
        if (cancelled) return;
        setHydration({
          status: "error",
          message: reason instanceof Error
            ? reason.message
            : "Game One progress could not be loaded."
        });
      });

    return () => {
      cancelled = true;
    };
  }, [host, hydrationAttempt, initialRounds, preferredLanguage]);

  if (hydration.status === "loading") {
    return (
      <main className="game-route">
        <StatusOverlay
          title="Loading your adventure"
          text="ReaDirect is safely loading your Game One progress."
          role="status"
        />
      </main>
    );
  }

  if (hydration.status === "error") {
    return (
      <main className="game-route">
        <StatusOverlay
          title="Your adventure could not load"
          text={hydration.message}
          role="alert"
        >
          <div className="game-route__overlay-actions">
            <button
              type="button"
              className="game-route__overlay-button game-route__overlay-button--primary"
              onClick={() => setHydrationAttempt((attempt) => attempt + 1)}
            >
              Retry
            </button>
            <button
              type="button"
              className="game-route__overlay-button game-route__overlay-button--secondary"
              onClick={() => navigate("/learner/games")}
            >
              Return to Lobby
            </button>
          </div>
        </StatusOverlay>
      </main>
    );
  }

  return <GameOneSession host={host} initialProgress={hydration.progress} />;
}

function GameOneSession({
  host,
  initialProgress
}: {
  host: GameOneHostAdapter;
  initialProgress: HydratedGameOneProgress;
}) {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const controllerRef = useRef<KaplayGameController | null>(null);
  const interactionPromptRef = useRef<HTMLButtonElement | null>(null);
  const interactionPromptPositionRef = useRef<{ x: number; y: number } | null>(null);
  const previousInteractionIdRef = useRef<string | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const [status, setStatus] = useState<GameStatus>("loading");
  const [retryKey, setRetryKey] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pauseReasons, setPauseReasons] = useState<PauseReason[]>([]);
  const [exitDialogOpen, setExitDialogOpen] = useState(false);
  const [audioSettingsOpen, setAudioSettingsOpen] = useState(false);
  const [audioManager] = useState(createRpgAudioManager);
  const [audioPreferences, setAudioPreferences] = useState<AudioPreferences>(() => audioManager.getPreferences());
  const [mapOpen, setMapOpen] = useState(false);
  const [showPath, setShowPath] = useState(true);
  const [storedLanguagePreference] = useState(loadLanguagePreference);
  const preferredLanguage = storedLanguagePreference ?? "en";
  const [languageSelectionOpen, setLanguageSelectionOpen] = useState(() => storedLanguagePreference === null);
  const [languageSelectionRequired, setLanguageSelectionRequired] = useState(() => storedLanguagePreference === null);
  const [draftLanguage, setDraftLanguage] = useState<GameLanguage>(preferredLanguage);
  const [initialExplorationProgress] = useState(initialProgress.exploration);
  const [explorationProgress, setExplorationProgress] = useState(initialExplorationProgress);
  const [fishingSpot, setFishingSpot] = useState<(typeof FISHING_SPOTS)[number] | null>(null);
  const [regionBannerId, setRegionBannerId] = useState<WorldRegionId | null>(initialExplorationProgress.currentRegionId);
  const [playerNavigation, setPlayerNavigation] = useState<PlayerNavigationState>({
    position: { ...initialExplorationProgress.safePosition },
    facing: "down"
  });
  const [movementControlMode, setMovementControlMode] = useState<MovementControlMode>(loadMovementControlPreference);
  const [keyboardDirections, setKeyboardDirections] = useState<ReadonlySet<Direction>>(() => new Set());
  const [random] = useState(createSessionRandom);
  const [preparedMissionState] = useState(initialProgress.mission);
  const [missionState, dispatchMission] = useReducer(missionReducer, preparedMissionState);
  const copy = getUiCopy(missionState.language);
  const missionTargetNpcId = getMissionTargetNpcId(missionState);
  const missionStateRef = useRef(missionState);
  const showPathRef = useRef(showPath);
  const explorationProgressRef = useRef(explorationProgress);
  const [tutorialState, dispatchTutorial] = useReducer(
    tutorialReducer,
    initialProgress.tutorial
  );
  const [persistenceError, setPersistenceError] = useState<string | null>(null);
  const [saveCoordinator] = useState(
    () => new GameOneSaveCoordinator(
      host,
      initialProgress.revision,
      (error) => setPersistenceError(error.message)
    )
  );
  const saveEffectsReadyRef = useRef(false);
  const guidedDispatchRef = useRef<(event: Parameters<typeof dispatchMission>[0]) => void>(() => undefined);
  const pauseReasonsCountRef = useRef(0);
  const missionOverlayOpenRef = useRef(false);
  missionStateRef.current = missionState;
  showPathRef.current = showPath;
  explorationProgressRef.current = explorationProgress;
  const activePauseReason = pauseReasons[0];
  const isPaused = pauseReasons.length > 0;
  const missionOverlayOpen =
    missionState.activeDialogue !== null ||
    missionState.helpOpen ||
    mapOpen ||
    audioSettingsOpen ||
    languageSelectionOpen ||
    fishingSpot !== null ||
    isMissionStageBlocking(missionState.stage);
  const tutorialAllowsMovement = tutorialState.active &&
    (tutorialState.step === "movement" || tutorialState.step === "interaction") &&
    missionState.stage === "approachStoryCharacter" && !missionState.activeDialogue;
  const inputEnabled = status === "ready" && persistenceError === null && !isPaused && (!missionOverlayOpen || tutorialAllowsMovement) &&
    (!tutorialState.active || tutorialAllowsMovement) && !languageSelectionOpen;
  const activeFishingSpot = FISHING_SPOTS[0];
  const fishingProximity = getFishingProximity(
    playerNavigation.position,
    playerNavigation.facing,
    activeFishingSpot,
    missionOverlayOpen || isPaused || status !== "ready"
  );
  const fishingReady = fishingProximity === "ready" && missionState.availableInteraction === null;
  const fishingActionLabel = missionState.language === "fil" ? "Mangisda at Magbasa" : "Fish & Read";

  const placeInteractionPrompt = useCallback((position: { x: number; y: number } | null) => {
    interactionPromptPositionRef.current = position;
    const prompt = interactionPromptRef.current;
    if (!prompt || !position) return;
    prompt.style.left = `${clamp(position.x, 0.08, 0.92) * 100}%`;
    const minimumY = window.innerHeight <= 500 ? 0.36 : 0.16;
    prompt.style.top = `${clamp(position.y, minimumY, 0.9) * 100}%`;
  }, []);

  useEffect(() => {
    const reposition = () => placeInteractionPrompt(interactionPromptPositionRef.current);
    reposition();
    window.addEventListener("resize", reposition);
    window.addEventListener("orientationchange", reposition);
    return () => {
      window.removeEventListener("resize", reposition);
      window.removeEventListener("orientationchange", reposition);
    };
  }, [fishingReady, missionState.availableInteraction?.id, placeInteractionPrompt]);

  const dispatchGuided = useCallback((event: Parameters<typeof dispatchMission>[0]) => {
    if (tutorialState.active && tutorialState.skipConfirmationOpen) return;
    if (tutorialState.active && !tutorialAllowsMissionEvent(tutorialState.step, event.type)) return;
    dispatchMission(event);
    if (!tutorialState.active) return;
    if (tutorialState.step === "reading" && event.type === "BEGIN_MISSION_ACTION") {
      dispatchTutorial({ type: "COMPLETE_STEP", step: "reading" });
    } else if (tutorialState.step === "readAgain" && event.type === "CLOSE_STORY_REVIEW") {
      dispatchTutorial({ type: "COMPLETE_STEP", step: "readAgain" });
    } else if (tutorialState.step === "choice" && event.type === "CONTINUE_AFTER_ACTION") {
      dispatchTutorial({ type: "COMPLETE_STEP", step: "choice" });
    } else if (tutorialState.step === "answerLater" && event.type === "CONFIRM_ANSWER_LATER") {
      dispatchTutorial({ type: "COMPLETE_STEP", step: "answerLater" });
    }
  }, [tutorialState]);
  guidedDispatchRef.current = dispatchGuided;

  useEffect(() => {
    if (tutorialState.active && tutorialState.step === "interaction" && missionState.activeDialogue) {
      dispatchTutorial({ type: "COMPLETE_STEP", step: "interaction" });
    }
  }, [missionState.activeDialogue, tutorialState.active, tutorialState.step]);

  const setPauseReason = useCallback((reason: PauseReason, active: boolean) => {
    setPauseReasons((current) => {
      const exists = current.includes(reason);
      if (active && !exists) {
        return [...current, reason];
      }
      if (!active && exists) {
        return current.filter((item) => item !== reason);
      }
      return current;
    });
  }, []);

  useEffect(() => {
    const previousBodyOverflow = document.body.style.overflow;
    const previousBodyTouchAction = document.body.style.touchAction;
    const previousRootOverscroll = document.documentElement.style.overscrollBehavior;
    const previousRootOverflowX = document.documentElement.style.overflowX;

    const keepViewportAtOrigin = () => {
      document.documentElement.scrollLeft = 0;
      document.body.scrollLeft = 0;
    };

    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";
    document.documentElement.style.overscrollBehavior = "none";
    document.documentElement.style.overflowX = "hidden";
    keepViewportAtOrigin();
    window.addEventListener("resize", keepViewportAtOrigin);

    return () => {
      window.removeEventListener("resize", keepViewportAtOrigin);
      document.body.style.overflow = previousBodyOverflow;
      document.body.style.touchAction = previousBodyTouchAction;
      document.documentElement.style.overscrollBehavior = previousRootOverscroll;
      document.documentElement.style.overflowX = previousRootOverflowX;
    };
  }, []);

  useEffect(() => {
    const onVisibilityChange = () => {
      setPauseReason("document-hidden", document.visibilityState === "hidden");
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    onVisibilityChange();

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [setPauseReason]);

  useEffect(() => {
    pauseReasonsCountRef.current = pauseReasons.length;
  }, [pauseReasons.length]);

  useEffect(() => {
    missionOverlayOpenRef.current = missionOverlayOpen;
  }, [missionOverlayOpen]);

  useEffect(() => {
    if (isPaused || missionOverlayOpen) {
      controllerRef.current?.pause();
      audioManager.setPaused(isPaused);
      return;
    }

    controllerRef.current?.resume();
    audioManager.setPaused(false);
  }, [audioManager, isPaused, missionOverlayOpen]);

  useEffect(() => {
    audioManager.setMusicRegion(explorationProgress.currentRegionId);
  }, [audioManager, explorationProgress.currentRegionId]);

  useEffect(() => {
    const unlock = () => audioManager.unlock();
    const narrationState = (event: Event) => audioManager.setDucked(Boolean((event as CustomEvent<{ active: boolean }>).detail?.active));
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    window.addEventListener("readirect:narration-state", narrationState);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      window.removeEventListener("readirect:narration-state", narrationState);
      audioManager.stop();
    };
  }, [audioManager]);

  useEffect(() => {
    if (!inputEnabled) {
      controllerRef.current?.clearInput();
      setKeyboardDirections(new Set());
    }
  }, [inputEnabled]);

  useEffect(() => {
    if (!saveEffectsReadyRef.current) {
      saveEffectsReadyRef.current = true;
      return;
    }

    saveCoordinator.schedule({
      checkpointKey: checkpointKeyForMission(missionState),
      saveSchemaVersion: GAME_ONE_SAVE_SCHEMA_VERSION,
      state: createGameOneSaveState(
        missionState,
        explorationProgress,
        tutorialState
      )
    });
  }, [explorationProgress, missionState, saveCoordinator, tutorialState]);

  useEffect(() => {
    return () => {
      void saveCoordinator.flush().catch(() => undefined);
    };
  }, [saveCoordinator]);

  useEffect(() => {
    if (!regionBannerId) return;
    const timer = window.setTimeout(() => setRegionBannerId(null), 1900);
    return () => window.clearTimeout(timer);
  }, [regionBannerId]);

  useEffect(() => {
    const region = getWorldRegionAtPoint(playerNavigation.position);
    const discovered = getDiscoveredFishingSpotIds(playerNavigation.position);
    setExplorationProgress((current) => {
      const newlyDiscovered = discovered.filter((id) => !current.discoveredFishingSpotIds.includes(id));
      const regionChanged = current.currentRegionId !== region.id;
      const safePositionChanged =
        Math.hypot(
          playerNavigation.position.x - current.safePosition.x,
          playerNavigation.position.y - current.safePosition.y
        ) >= 96 &&
        isSafeExplorationPosition(playerNavigation.position);
      if (!regionChanged && newlyDiscovered.length === 0 && !safePositionChanged) return current;
      if (regionChanged) setRegionBannerId(region.id);
      return {
        ...current,
        currentRegionId: region.id,
        safePosition: regionChanged || safePositionChanged ? { ...playerNavigation.position } : current.safePosition,
        discoveredFishingSpotIds: [...current.discoveredFishingSpotIds, ...newlyDiscovered]
      };
    });
  }, [playerNavigation.position]);

  useEffect(() => {
    controllerRef.current?.setFishingInteraction(fishingReady ? activeFishingSpot : null);
  }, [activeFishingSpot, fishingReady]);

  useEffect(() => {
    if (!tutorialState.active || tutorialState.step !== "movement") return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || !["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "w", "a", "s", "d"].includes(event.key)) return;
      const direction = keyboardDirection(event.key);
      const target = getNpc(MISSIONS[missionState.missionIndex].npcId).interactionPosition;
      if (movementHeadsTowardTarget(direction, playerNavigation.position, target)) {
        dispatchTutorial({ type: "COMPLETE_STEP", step: "movement" });
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [missionState.missionIndex, playerNavigation.position, tutorialState.active, tutorialState.step]);

  useEffect(() => {
    let cancelled = false;

    setStatus("loading");
    setErrorMessage(null);

    Promise.resolve()
      .then(() => {
        if (cancelled || !containerRef.current || controllerRef.current) {
          return;
        }

        controllerRef.current = createKaplayGame(containerRef.current, {
          initialPosition: explorationProgressRef.current.safePosition,
          onInteractionTargetChange: (target) => {
            dispatchMission({ type: "SET_AVAILABLE_INTERACTION", target });
            if (target?.id !== previousInteractionIdRef.current) {
              audioManager.setNearbyTarget(target?.id ?? null);
              if (target) audioManager.interactionAvailable();
              previousInteractionIdRef.current = target?.id ?? null;
            }
          },
          onInteractionPromptPosition: (position) => {
            placeInteractionPrompt(position);
          },
          onPlayerNavigationChange: ({ position, facing }) => {
            setPlayerNavigation({ position, facing });
          },
          onMovementAudioState: ({ moving, terrain, area }) => {
            audioManager.updateLocation(area.key);
            audioManager.updateMovement({ moving, surface: terrain.footstep });
          },
          onKeyboardDirectionChange: (direction, active) => {
            setKeyboardDirections((current) => {
              const next = new Set(current);
              if (active) next.add(direction);
              else next.delete(direction);
              return next;
            });
          },
          onInteract: (target) => {
            guidedDispatchRef.current({ type: "ACTIVATE_INTERACTION", target });
          },
          onFish: (spot) => {
            setFishingSpot(spot);
          }
        });
        const currentMission = missionStateRef.current;
        controllerRef.current.setMissionState({
          activityCompleted: currentMission.activityCompleted,
          targetNpcId: getMissionTargetNpcId(currentMission),
          showPath: showPathRef.current
        });
        if (pauseReasonsCountRef.current > 0 || missionOverlayOpenRef.current) {
          controllerRef.current.pause();
        }
        setStatus("ready");
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : "Unknown initialization error";
        console.error("KAPLAY initialization failed", error);
        if (!cancelled) {
          setErrorMessage(message);
          setStatus("error");
        }
      });

    return () => {
      cancelled = true;
      controllerRef.current?.destroy();
      controllerRef.current = null;
      window.speechSynthesis?.cancel();
    };
  }, [audioManager, placeInteractionPrompt, retryKey]);

  useEffect(() => {
    controllerRef.current?.setMissionState({
      activityCompleted: missionState.activityCompleted,
      targetNpcId: missionTargetNpcId,
      showPath
    });
  }, [missionState.activityCompleted, missionTargetNpcId, showPath]);

  useEffect(() => {
    audioManager.missionActivated();
    audioManager.guideShown();
  }, [audioManager, missionState.missionIndex]);

  useEffect(() => {
    if (missionState.answerStatus === "correct" || missionState.actionStatus === "correct") audioManager.correct();
    else if (missionState.answerStatus === "incorrect" || missionState.actionStatus === "incorrect") audioManager.incorrect();
  }, [audioManager, missionState.actionStatus, missionState.answerStatus]);

  useEffect(() => {
    if (missionState.stage === "missionCompleted" || missionState.activityCompleted) audioManager.completed();
  }, [audioManager, missionState.activityCompleted, missionState.stage]);

  const pauseTitle = useMemo(() => {
    return activePauseReason === "document-hidden" ? copy.hiddenPaused : copy.paused;
  }, [activePauseReason, copy.hiddenPaused, copy.paused]);

  const retry = () => {
    controllerRef.current?.destroy();
    controllerRef.current = null;
    setRetryKey((value) => value + 1);
  };

  const openExitDialog = () => {
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setPauseReason("exit-dialog", true);
    setExitDialogOpen(true);
  };

  const closeExitDialog = useCallback(() => {
    setExitDialogOpen(false);
    setPauseReason("exit-dialog", false);
    window.requestAnimationFrame(() => {
      previousFocusRef.current?.focus();
      previousFocusRef.current = null;
    });
  }, [setPauseReason]);

  const exitToLobby = async () => {
    try {
      await saveCoordinator.flush();
    } catch {
      return;
    }
    navigate("/learner/games");
  };

  const exitWithoutSaving = () => {
    navigate("/learner/games");
  };

  const replayMission = async () => {
    try {
      await saveCoordinator.reset();
    } catch {
      return;
    }
    const nextRounds = createMissionRounds(getMissions(missionState.language), random, missionState.rounds);
    controllerRef.current?.clearInput();
    controllerRef.current?.resetMission();
    setPlayerNavigation({ position: { ...PROTOTYPE_MAP.startPosition }, facing: "down" });
    const resetExploration = createInitialExplorationProgress();
    setExplorationProgress(resetExploration);
    explorationProgressRef.current = resetExploration;
    setFishingSpot(null);
    setMapOpen(false);
    setShowPath(true);
    dispatchMission({ type: "RESET_ACTIVITY", rounds: nextRounds });
  };

  const openLanguageSelection = () => {
    setDraftLanguage(missionState.language);
    setLanguageSelectionRequired(false);
    setLanguageSelectionOpen(true);
  };

  const confirmLanguage = () => {
    window.speechSynthesis?.cancel();
    window.dispatchEvent(new CustomEvent("readirect:narration-stop"));
    dispatchMission({ type: "SET_LANGUAGE", language: draftLanguage });
    saveLanguagePreference(draftLanguage);
    setLanguageSelectionRequired(false);
    setLanguageSelectionOpen(false);
  };

  useEffect(() => {
    if (!exitDialogOpen) {
      return;
    }

    const dialog = dialogRef.current;
    const focusable = getFocusableElements(dialog);
    focusable[0]?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeExitDialog();
        return;
      }

      if (event.key !== "Tab" || focusable.length === 0) {
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [closeExitDialog, exitDialogOpen]);

  return (
    <main lang={missionState.language} className="game-route">
      <section
        aria-label={`${copy.gameTitle} ${copy.gameHost}`}
        className="game-route__stage"
      >
        <header className="game-route__header">
          <div className="game-route__heading">
            <p className="game-route__phase-label">
              {copy.phaseLabel}
            </p>
            <h1 className="game-route__title">
              <span className="game-title-short">{copy.shortTitle}</span>
              <span className="game-title-full">{copy.gameTitle}</span>
            </h1>
          </div>
          <div className="game-route__header-actions">
            <button
              type="button"
              onClick={openLanguageSelection}
              disabled={tutorialState.active}
              aria-label={`${copy.changeLanguage}: ${missionState.language === "en" ? "English" : "Filipino"}`}
              className="game-route__header-button game-language-button"
            >
              <span className="game-language-label-full">{missionState.language === "en" ? "English" : "Filipino"}</span>
              <span className="game-language-label-short" aria-hidden="true">{missionState.language === "en" ? "EN" : "FIL"}</span>
            </button>
            <button
              type="button"
              onClick={() => setAudioSettingsOpen(true)}
              disabled={tutorialState.active}
              className="game-route__header-button"
            >
              {copy.sound}
            </button>
            <button
              type="button"
              onClick={() => setPauseReason("manual", true)}
              disabled={status !== "ready" || missionState.activityCompleted || tutorialState.active}
              className="game-route__header-button game-route__header-button--light"
            >
              {copy.pause}
            </button>
            <button
              type="button"
              onClick={openExitDialog}
              disabled={tutorialState.active}
              className="game-route__header-button game-route__header-button--transparent"
            >
              {copy.exit}
            </button>
          </div>
        </header>

        <div className="game-route__canvas-layer">
          <div
            ref={containerRef}
            data-testid="game-canvas-container"
            className="game-route__canvas-host"
          />

          {status === "loading" && (
            <StatusOverlay
              title={copy.preparing}
              text={copy.loading}
              role="status"
            />
          )}

          {status === "error" && (
            <StatusOverlay
              title={copy.startError}
              text={copy.startErrorHelp}
              role="alert"
            >
              <p className="game-route__visually-hidden">Technical reason: {errorMessage}</p>
              <div className="game-route__overlay-actions">
                <button
                  type="button"
                  onClick={retry}
                  className="game-route__overlay-button game-route__overlay-button--primary"
                >
                  {copy.retry}
                </button>
                <button
                  type="button"
                  onClick={() => void exitToLobby()}
                  className="game-route__overlay-button game-route__overlay-button--secondary"
                >
                  {copy.exitDashboard}
                </button>
              </div>
            </StatusOverlay>
          )}

          {persistenceError && (
            <StatusOverlay
              title="Progress could not be saved"
              text={persistenceError}
              role="alert"
            >
              <div className="game-route__overlay-actions">
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="game-route__overlay-button game-route__overlay-button--primary"
                >
                  Reload Progress
                </button>
                <button
                  type="button"
                  onClick={exitWithoutSaving}
                  className="game-route__overlay-button game-route__overlay-button--secondary"
                >
                  Return to Lobby
                </button>
              </div>
            </StatusOverlay>
          )}

          {isPaused && status !== "error" && !persistenceError && !exitDialogOpen && (
            <StatusOverlay title={pauseTitle} text={copy.pauseMessage}>
              <div className="game-route__overlay-actions">
                <button
                  type="button"
                  onClick={() => setPauseReason("manual", false)}
                  disabled={activePauseReason !== "manual"}
                  className="game-route__overlay-button game-route__overlay-button--primary"
                >
                  {copy.resume}
                </button>
                <button type="button" onClick={() => {
                  setPauseReason("manual", false);
                  dispatchTutorial({ type: "REOPEN", step: tutorialStepForMissionStage(missionState.stage) });
                }} className="game-route__overlay-button game-route__overlay-button--muted">{copy.showTutorial}</button>
                <button type="button" onClick={openLanguageSelection} className="game-route__overlay-button game-route__overlay-button--outline">{copy.changeLanguage}</button>
                <button
                  type="button"
                  onClick={openExitDialog}
                  className="game-route__overlay-button game-route__overlay-button--secondary"
                >
                  {copy.exit}
                </button>
              </div>
            </StatusOverlay>
          )}
        </div>

        {status === "ready" && !missionState.activityCompleted && (
          <NavigationHud
            missionState={missionState}
            player={playerNavigation}
            mapOpen={mapOpen}
            showPath={showPath}
            interactionAvailable={Boolean(missionState.availableInteraction)}
            currentRegionId={explorationProgress.currentRegionId}
            discoveredFishingSpotIds={explorationProgress.discoveredFishingSpotIds}
            onOpenMap={() => { setMapOpen(true); audioManager.mapChanged(); }}
            onCloseMap={() => { setMapOpen(false); audioManager.mapChanged(); }}
            onTogglePath={() => setShowPath((value) => !value)}
          />
        )}

        <MissionAnnouncements message={missionState.announcement} />

        {status === "ready" && regionBannerId && !isPaused && <RegionBanner regionId={regionBannerId} language={missionState.language} />}
        <DeferredSavedNotice state={missionState} />

        <MovementControls
          disabled={!inputEnabled}
          language={missionState.language}
          mode={movementControlMode}
          keyboardDirections={keyboardDirections}
          onModeChange={(mode) => {
            controllerRef.current?.clearInput();
            setKeyboardDirections(new Set());
            setMovementControlMode(mode);
            saveMovementControlPreference(mode);
          }}
          onDirectionChange={(direction, active) => {
            controllerRef.current?.setTouchDirection(direction, active);
          }}
          onAnalogVectorChange={(vector) => {
            controllerRef.current?.setAnalogVector(vector);
          }}
          onDirectionalIntent={(vector) => {
            if (tutorialState.active && tutorialState.step === "movement") {
              const target = getNpc(MISSIONS[missionState.missionIndex].npcId).interactionPosition;
              if (movementHeadsTowardTarget(vector, playerNavigation.position, target)) {
                dispatchTutorial({ type: "COMPLETE_STEP", step: "movement" });
              }
            }
          }}
        />

        <div className="mission-actions">
          <button
            type="button"
            onClick={() => dispatchGuided({ type: "REQUEST_HELP" })}
            disabled={status !== "ready" || isPaused || missionOverlayOpen || tutorialState.active}
            className="mission-action-button mission-help-button"
          >
            {copy.help}
          </button>
        </div>
        {(missionState.availableInteraction || fishingReady) && inputEnabled && (
          <button
            ref={interactionPromptRef}
            type="button"
            onClick={() => controllerRef.current?.interact()}
            aria-label={missionState.availableInteraction
              ? (missionState.language === "en" ? missionState.availableInteraction.description : copy.interact)
              : fishingActionLabel}
            className={`mission-interact-button contextual-interact-button ${fishingReady ? "fishing-interact-button" : ""}`}
          >
            <span className="interaction-desktop-label"><kbd>F</kbd><span>{fishingReady ? fishingActionLabel : copy.interact}</span></span>
            <span className="interaction-mobile-label">{fishingReady ? fishingActionLabel : copy.interact}</span>
          </button>
        )}
        {!missionState.availableInteraction && !fishingReady && inputEnabled && ["nearby", "face-water"].includes(fishingProximity) && (
          <div className="fishing-nearby-prompt" data-state={fishingProximity} role="status">
            <span className="fishing-prompt-code" aria-hidden="true">RIV</span>
            <span className="fishing-prompt-copy">
              <strong>
                {fishingProximity === "face-water"
                  ? (missionState.language === "fil" ? "Humarap sa tubig" : "Face the water")
                  : (missionState.language === "fil" ? "May babasahing huli" : "Reading catch nearby")}
              </strong>
              <small>
                {fishingProximity === "face-water"
                  ? (missionState.language === "fil" ? "Mangisda para sa pahiwatig na babasahin" : "Fish for a clue to read")
                  : (missionState.language === "fil" ? "Lumapit sa pampang ng ilog" : "Move closer to the riverbank")}
              </small>
            </span>
          </div>
        )}

        {!isPaused && !exitDialogOpen && (
          <>
            <DialogueOverlay state={missionState} dispatch={dispatchGuided} />
            <ReadingIntroOverlay state={missionState} dispatch={dispatchGuided} />
            <StoryPresentationOverlay state={missionState} dispatch={dispatchGuided} />
            <StoryReviewOverlay state={missionState} dispatch={dispatchGuided} />
            <MissionActionOverlay state={missionState} dispatch={dispatchGuided} />
            <QuestionIntroOverlay state={missionState} dispatch={dispatchGuided} />
            <QuestionOverlay state={missionState} dispatch={dispatchGuided} />
            <HeartRecoveryOverlay state={missionState} dispatch={dispatchGuided} />
            <DeferredQuestionOverlay state={missionState} dispatch={dispatchGuided} />
            <DeferredResumeOverlay state={missionState} dispatch={dispatchGuided} />
            <QuestionsCompletedOverlay state={missionState} dispatch={dispatchGuided} />
            <HelpOverlay
              state={missionState}
              dispatch={dispatchGuided}
              onOpenMap={() => {
                setMapOpen(true);
                audioManager.mapChanged();
              }}
              onShowTutorial={() => {
                dispatchTutorial({
                  type: "REOPEN",
                  step: tutorialStepForMissionStage(missionState.stage)
                });
              }}
            />
            <RemainingQuestionsOverlay state={missionState} dispatch={dispatchGuided} onDashboard={exitToLobby} />
            <MissionResultOverlay state={missionState} dispatch={dispatchGuided} />
            <CompletionOverlay
              state={missionState}
              onReplay={replayMission}
              onDashboard={exitToLobby}
            />
          </>
        )}
        {status === "ready" && !isPaused && !exitDialogOpen && !languageSelectionOpen && tutorialState.active && !missionState.activeDialogue && (
          <TutorialOverlay
            state={tutorialState}
            interactionAvailable={Boolean(missionState.availableInteraction)}
            onRequestSkip={() => dispatchTutorial({ type: "REQUEST_SKIP" })}
            onKeepLearning={() => dispatchTutorial({ type: "KEEP_LEARNING" })}
            onSkip={() => dispatchTutorial({ type: "CONFIRM_SKIP" })}
            onFinish={() => dispatchTutorial({ type: "FINISH" })}
            onAdvance={() => dispatchTutorial({ type: "COMPLETE_STEP", step: tutorialState.step })}
            language={missionState.language}
            onChangeLanguage={openLanguageSelection}
          />
        )}
        {audioSettingsOpen && (
          <AudioSettingsOverlay
            preferences={audioPreferences}
            onChange={(preferences) => {
              setAudioPreferences(preferences);
              audioManager.setPreferences(preferences);
            }}
            onClose={() => setAudioSettingsOpen(false)}
            language={missionState.language}
            onChangeLanguage={openLanguageSelection}
          />
        )}
        {languageSelectionOpen && (
          <LanguageSelectionOverlay
            selectedLanguage={draftLanguage}
            required={languageSelectionRequired}
            onSelect={setDraftLanguage}
            onConfirm={confirmLanguage}
            onCancel={() => setLanguageSelectionOpen(false)}
          />
        )}
        {fishingSpot && !isPaused && (
          <FishingOverlay
            language={missionState.language}
            spot={fishingSpot}
            caughtResultIds={explorationProgress.caughtResultIds}
            onCancel={() => setFishingSpot(null)}
            onComplete={(resultId: FishingResultId, attempts) => {
              setExplorationProgress((current) => ({
                ...current,
                completedInteractionIds: current.completedInteractionIds.includes(`fishing:${fishingSpot.id}`)
                  ? current.completedInteractionIds
                  : [...current.completedInteractionIds, `fishing:${fishingSpot.id}`],
                fishingParticipation: current.fishingParticipation + 1,
                fishingAttempts: current.fishingAttempts + attempts,
                caughtResultIds: current.caughtResultIds.includes(resultId)
                  ? current.caughtResultIds
                  : [...current.caughtResultIds, resultId]
              }));
              setFishingSpot(null);
            }}
          />
        )}
      </section>

      {exitDialogOpen && (
        <div className="game-route__exit-layer">
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="exit-title"
            aria-describedby="exit-description"
            className="game-route__exit-dialog"
          >
            <h2 id="exit-title" className="game-route__exit-title">
              {copy.exitTitle}
            </h2>
            <p id="exit-description" className="game-route__exit-description">
              {copy.exitDescription}
            </p>
            <div className="game-route__exit-actions">
              <button
                type="button"
                onClick={closeExitDialog}
                className="game-route__exit-button game-route__exit-button--cancel"
              >
                {copy.keepPlaying}
              </button>
              <button
                type="button"
                onClick={() => void exitToLobby()}
                className="game-route__exit-button game-route__exit-button--confirm"
              >
                {copy.exitDashboard}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function StatusOverlay({
  title,
  text,
  children,
  role
}: {
  title: string;
  text: string;
  children?: React.ReactNode;
  role?: "alert" | "status";
}) {
  return (
    <div
      role={role}
      aria-live={role === "alert" ? "assertive" : "polite"}
      className="game-route__status-overlay"
    >
      <div className="game-route__status-content">
        <h2 className="game-route__status-title">{title}</h2>
        <p className="game-route__status-message">{text}</p>
        {children}
      </div>
    </div>
  );
}

function getFocusableElements(root: HTMLElement | null) {
  if (!root) {
    return [];
  }

  return Array.from(
    root.querySelectorAll<HTMLElement>(
      'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
  );
}

function tutorialStepForMissionStage(stage: MissionStage): TutorialStep {
  if (stage === "approachStoryCharacter" || stage === "storyIntroduction") return "missionPanel";
  if (stage === "readingIntro" || stage === "storyPresentation" || stage === "storyReview") return "reading";
  if (stage === "missionAction" || stage === "missionActionFeedback") return "readAgain";
  if (["questionIntro", "questionRound", "answerSelected", "questionFeedback", "deferredConfirmation"].includes(stage)) return "answerLater";
  return "ready";
}

function keyboardDirection(key: string) {
  if (key === "ArrowUp" || key === "w") return { x: 0, y: -1 };
  if (key === "ArrowDown" || key === "s") return { x: 0, y: 1 };
  if (key === "ArrowLeft" || key === "a") return { x: -1, y: 0 };
  return { x: 1, y: 0 };
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}
