import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./styles/game-one.css";
import "./game/layout/game-layout.css";
import {
  createKaplayGame,
  type KaplayGameController,
  type RiverBoatUiState
} from "./game/kaplay/createKaplayGame";
import type { Direction } from "./game/input/gameInput";
import { MovementControls } from "./game/input/MovementControls";
import {
  loadMovementControlPreference,
  saveMovementControlPreference,
  type MovementControlMode
} from "./game/input/movementControlPreference";
import {
  createInitialMissionState,
  getMissionTargetNpcId,
  isMissionStageBlocking,
  missionReducer,
  type MissionState,
  type MissionStage
} from "./game/mission/missionState";
import { clearMissionProgress, loadMissionProgress, saveMissionProgress } from "./game/mission/missionPersistence";
import { getMission, getMissions, MISSIONS } from "./game/content/missions";
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
  StoryPresentationOverlay
} from "./game/ui/MissionUi";
import { TutorialOverlay } from "./game/tutorial/TutorialOverlay";
import { createInitialTutorialState, saveTutorialProgress, tutorialAllowsMissionEvent, tutorialReducer, type TutorialStep } from "./game/tutorial/tutorialState";
import { consumeProgressResetRequest } from "./game/progress/resetLearnerProgress";
import { NavigationHud, type PlayerNavigationState } from "./game/navigation/NavigationHud";
import { isSwimmableRiverPoint, PROTOTYPE_MAP } from "./game/map/prototypeMap";
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
  clearExplorationProgress,
  createInitialExplorationProgress,
  isSafeExplorationPosition,
  loadExplorationProgress,
  saveExplorationProgress
} from "./game/world/explorationPersistence";
import { getWorldRegionAtPoint, type WorldRegionId } from "./game/world/worldRegions";
import { ShopInteriorOverlay } from "./game/shop/ShopInteriorOverlay";
import { getShop, type ShopId } from "./game/content/shops";
import {
  createInitialShopTaskState,
  type ShopTaskState
} from "./game/shop/shopTask";
import { CharacterSelectionOverlay } from "./game/player/CharacterSelectionOverlay";
import { getSwimEntryPoint } from "./game/world/swimming";
import {
  DEFAULT_PLAYABLE_CHARACTER_ID,
  getPlayableCharacter,
  loadPlayableCharacterSelection,
  savePlayableCharacterSelection,
  type PlayableCharacterId
} from "./game/player/playableCharacters";
import { clampInteractionPromptPosition } from "./game/layout/gameViewport";
import { useResponsiveInputReset } from "./game/layout/useResponsiveInputReset";
import { OrientationNotice } from "./game/layout/OrientationNotice";
import { GameModalFocusManager } from "./game/layout/GameModalFocusManager";
import { ReadscapeWelcomeOverlay } from "./game/ui/ReadscapeWelcomeOverlay";

type GameStatus = "loading" | "ready" | "error";
type PauseReason = "manual" | "document-hidden" | "exit-dialog";
type WelcomePhase = "visible" | "leaving" | "hidden";

export function GameRoutePage() {
  consumeProgressResetRequest();
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const controllerRef = useRef<KaplayGameController | null>(null);
  const interactionPromptRef = useRef<HTMLButtonElement | null>(null);
  const interactionPromptPositionRef = useRef<{ x: number; y: number } | null>(null);
  const previousInteractionIdRef = useRef<string | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const [status, setStatus] = useState<GameStatus>("loading");
  const [welcomePhase, setWelcomePhase] = useState<WelcomePhase>("visible");
  const [retryKey, setRetryKey] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pauseReasons, setPauseReasons] = useState<PauseReason[]>([]);
  const [exitDialogOpen, setExitDialogOpen] = useState(false);
  const [audioSettingsOpen, setAudioSettingsOpen] = useState(false);
  const [audioManager] = useState(createRpgAudioManager);
  const [audioPreferences, setAudioPreferences] = useState<AudioPreferences>(() => audioManager.getPreferences());
  const [activeShopId, setActiveShopId] = useState<ShopId | null>(null);
  const [shopTaskState, setShopTaskState] = useState<ShopTaskState>(createInitialShopTaskState);
  const [mapOpen, setMapOpen] = useState(false);
  const [journeyBagOpen, setJourneyBagOpen] = useState(false);
  const [showPath, setShowPath] = useState(true);
  const [storedCharacterPreference] = useState(loadPlayableCharacterSelection);
  const [selectedCharacterId, setSelectedCharacterId] = useState<PlayableCharacterId>(
    storedCharacterPreference ?? DEFAULT_PLAYABLE_CHARACTER_ID
  );
  const [draftCharacterId, setDraftCharacterId] = useState<PlayableCharacterId>(
    storedCharacterPreference ?? DEFAULT_PLAYABLE_CHARACTER_ID
  );
  const [characterSelectionOpen, setCharacterSelectionOpen] = useState(
    () => storedCharacterPreference === null
  );
  const [characterSelectionRequired, setCharacterSelectionRequired] = useState(
    () => storedCharacterPreference === null
  );
  const [storedLanguagePreference] = useState(loadLanguagePreference);
  const preferredLanguage = storedLanguagePreference ?? "en";
  const [languageSelectionOpen, setLanguageSelectionOpen] = useState(() => storedLanguagePreference === null);
  const [languageSelectionRequired, setLanguageSelectionRequired] = useState(() => storedLanguagePreference === null);
  const [draftLanguage, setDraftLanguage] = useState<GameLanguage>(preferredLanguage);
  const [initialExplorationProgress] = useState(loadExplorationProgress);
  const [explorationProgress, setExplorationProgress] = useState(initialExplorationProgress);
  const [fishingSpot, setFishingSpot] = useState<(typeof FISHING_SPOTS)[number] | null>(null);
  const [riverBoatUi, setRiverBoatUi] = useState<RiverBoatUiState>({
    riding: false,
    actionAvailable: false,
    proximity: "hidden"
  });
  const [regionBannerId, setRegionBannerId] = useState<WorldRegionId | null>(initialExplorationProgress.currentRegionId);
  const [playerNavigation, setPlayerNavigation] = useState<PlayerNavigationState>({
    position: { ...initialExplorationProgress.safePosition },
    facing: "down"
  });
  const [movementControlMode, setMovementControlMode] = useState<MovementControlMode>(loadMovementControlPreference);
  const [keyboardDirections, setKeyboardDirections] = useState<ReadonlySet<Direction>>(() => new Set());
  const clearResponsiveInput = useCallback(() => {
    controllerRef.current?.clearInput();
    setKeyboardDirections(new Set());
  }, []);
  const portrait = useResponsiveInputReset(clearResponsiveInput);
  const [random] = useState(createSessionRandom);
  const [initialRounds] = useState(() => createMissionRounds(getMissions(preferredLanguage), random));
  const [preparedMissionState] = useState(() => loadMissionProgress(initialRounds) ?? createInitialMissionState(initialRounds, preferredLanguage));
  const [missionState, dispatchMission] = useReducer(missionReducer, preparedMissionState);
  const copy = getUiCopy(missionState.language);
  const missionTargetNpcId = getMissionTargetNpcId(missionState);
  const missionStateRef = useRef(missionState);
  const showPathRef = useRef(showPath);
  const explorationProgressRef = useRef(explorationProgress);
  const [tutorialState, dispatchTutorial] = useReducer(tutorialReducer, undefined, createInitialTutorialState);
  const guidedDispatchRef = useRef<(event: Parameters<typeof dispatchMission>[0]) => void>(() => undefined);
  const pauseReasonsCountRef = useRef(0);
  const missionOverlayOpenRef = useRef(false);
  missionStateRef.current = missionState;
  showPathRef.current = showPath;
  explorationProgressRef.current = explorationProgress;
  const activePauseReason = pauseReasons[0];
  const isPaused = pauseReasons.length > 0;
  const welcomeOpen = welcomePhase !== "hidden";
  const shopOpen = activeShopId !== null;
  const missionOverlayOpen =
    missionState.activeDialogue !== null ||
    missionState.helpOpen ||
    mapOpen ||
    journeyBagOpen ||
    audioSettingsOpen ||
    characterSelectionOpen ||
    languageSelectionOpen ||
    shopOpen ||
    fishingSpot !== null ||
    isMissionStageBlocking(missionState.stage);
  const tutorialAllowsMovement = tutorialState.active &&
    (tutorialState.step === "movement" || tutorialState.step === "interaction") &&
    missionState.stage === "approachStoryCharacter" && !missionState.activeDialogue;
  const inputEnabled = status === "ready" && !isPaused && (!missionOverlayOpen || tutorialAllowsMovement) &&
    (!tutorialState.active || tutorialAllowsMovement) && !characterSelectionOpen && !languageSelectionOpen && !shopOpen && !welcomeOpen;
  const activeFishingSpot = FISHING_SPOTS[0];
  const isSwimming = isSwimmableRiverPoint(playerNavigation.position);
  const fishingProximity = getFishingProximity(
    playerNavigation.position,
    playerNavigation.facing,
    activeFishingSpot,
    missionOverlayOpen || riverBoatUi.riding || isPaused || status !== "ready"
  );
  const fishingReady = !isSwimming
    && fishingProximity === "ready"
    && missionState.availableInteraction === null;
  const fishingActionLabel = missionState.language === "fil" ? "Mangisda at Magbasa" : "Fish & Read";
  const riverBoatReady = riverBoatUi.actionAvailable
    && !isSwimming
    && missionState.availableInteraction === null
    && !fishingReady;
  const riverBoatActionLabel = missionState.language === "fil"
    ? (riverBoatUi.riding ? "Bumaba sa Bangka" : "Sumakay sa Bangka")
    : (riverBoatUi.riding ? "Get Off Boat" : "Ride Boat");
  const swimmingReady = !riverBoatUi.riding
    && missionState.availableInteraction === null
    && !fishingReady
    && (isSwimming || getSwimEntryPoint(playerNavigation.position, playerNavigation.facing) !== null);
  const swimmingActionLabel = missionState.language === "fil"
    ? (isSwimming ? "Umahon" : "Lumangoy")
    : (isSwimming ? "Get Out" : "Swim");
  const interactionActionLabel = missionState.availableInteraction?.kind === "landmark"
    ? (missionState.language === "fil" ? "Basahin" : "Read")
    : missionState.availableInteraction?.kind === "shop"
      ? (missionState.language === "fil" ? "Pumasok" : "Enter Shop")
      : copy.interact;

  const placeInteractionPrompt = useCallback((position: { x: number; y: number } | null) => {
    interactionPromptPositionRef.current = position;
    const prompt = interactionPromptRef.current;
    if (!prompt || !position) return;
    const bounds = containerRef.current?.getBoundingClientRect();
    const clamped = clampInteractionPromptPosition(position, {
      width: bounds?.width ?? window.innerWidth,
      height: bounds?.height ?? window.innerHeight
    });
    prompt.style.left = `${clamped.x * 100}%`;
    prompt.style.top = `${clamped.y * 100}%`;
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
  }, [fishingReady, riverBoatReady, swimmingReady, missionState.availableInteraction?.id, placeInteractionPrompt]);

  const dispatchGuided = useCallback((event: Parameters<typeof dispatchMission>[0]) => {
    if (tutorialState.active && tutorialState.skipConfirmationOpen) return;
    if (tutorialState.active && !tutorialAllowsMissionEvent(tutorialState.step, event.type)) return;
    dispatchMission(event);
    if (!tutorialState.active) return;
    if (tutorialState.step === "reading" && event.type === "FINISH_STORY") {
      dispatchTutorial({ type: "COMPLETE_STEP", step: "reading" });
    } else if (tutorialState.step === "choice" && event.type === "CONTINUE_AFTER_ACTION") {
      dispatchTutorial({ type: "COMPLETE_STEP", step: "choice" });
      dispatchTutorial({ type: "COMPLETE_STEP", step: "continueQuestions" });
    } else if (tutorialState.step === "continueQuestions" && event.type === "CONTINUE_AFTER_ACTION") {
      dispatchTutorial({ type: "COMPLETE_STEP", step: "continueQuestions" });
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

  useEffect(() => {
    if (
      tutorialState.active &&
      tutorialState.step === "choice" &&
      missionState.stage === "missionActionFeedback" &&
      missionState.actionStatus === "correct"
    ) {
      dispatchTutorial({ type: "COMPLETE_STEP", step: "choice" });
    }
  }, [missionState.actionStatus, missionState.stage, tutorialState.active, tutorialState.step]);

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
    saveMissionProgress(missionState);
  }, [missionState]);

  useEffect(() => {
    saveExplorationProgress(explorationProgress);
  }, [explorationProgress]);

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
    saveTutorialProgress(tutorialState);
  }, [tutorialState]);

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

  const dismissWelcome = useCallback(() => {
    setWelcomePhase((phase) => phase === "visible" ? "leaving" : phase);
  }, []);

  useEffect(() => {
    if (status !== "ready" || welcomePhase !== "visible") return;
    const timer = window.setTimeout(dismissWelcome, 2600);
    return () => window.clearTimeout(timer);
  }, [dismissWelcome, status, welcomePhase]);

  useEffect(() => {
    if (welcomePhase !== "leaving") return;
    const timer = window.setTimeout(() => setWelcomePhase("hidden"), 420);
    return () => window.clearTimeout(timer);
  }, [welcomePhase]);

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
          characterId: selectedCharacterId,
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
          onSwimmingAudioState: ({ swimming, moving }) => {
            audioManager.updateSwimming({ swimming, moving });
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
          onEnterShop: (shopId) => {
            const shop = getShop(shopId);
            controllerRef.current?.clearInput();
            setKeyboardDirections(new Set());
            setPlayerNavigation((current) => ({ ...current, position: { ...shop.entrancePosition } }));
            setExplorationProgress((current) => ({ ...current, safePosition: { ...shop.entrancePosition } }));
            setActiveShopId(shopId);
            audioManager.mapChanged();
          },
          onFish: (spot) => {
            setFishingSpot(spot);
          },
          onRiverBoatStateChange: setRiverBoatUi
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

  const exitToDashboard = () => {
    navigate("/learner/games");
  };

  const replayMission = () => {
    const nextRounds = createMissionRounds(getMissions(missionState.language), random, missionState.rounds);
    controllerRef.current?.clearInput();
    controllerRef.current?.resetMission();
    setPlayerNavigation({ position: { ...PROTOTYPE_MAP.startPosition }, facing: "down" });
    const resetExploration = createInitialExplorationProgress();
    setExplorationProgress(resetExploration);
    explorationProgressRef.current = resetExploration;
    clearExplorationProgress();
    setFishingSpot(null);
    setMapOpen(false);
    setShowPath(true);
    clearMissionProgress();
    dispatchMission({ type: "RESET_ACTIVITY", rounds: nextRounds });
  };

  const openLanguageSelection = () => {
    setDraftLanguage(missionState.language);
    setLanguageSelectionRequired(false);
    setLanguageSelectionOpen(true);
  };

  const openCharacterSelection = () => {
    setDraftCharacterId(selectedCharacterId);
    setCharacterSelectionRequired(false);
    setCharacterSelectionOpen(true);
  };

  const confirmCharacterSelection = () => {
    const changed = selectedCharacterId !== draftCharacterId;
    savePlayableCharacterSelection(draftCharacterId);
    setSelectedCharacterId(draftCharacterId);
    setCharacterSelectionRequired(false);
    setCharacterSelectionOpen(false);
    if (changed) {
      controllerRef.current?.clearInput();
      setKeyboardDirections(new Set());
      controllerRef.current?.setCharacter(draftCharacterId);
    }
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
      <GameModalFocusManager />
      <section
        aria-label={`${copy.gameTitle} ${copy.gameHost}`}
        className="game-route__stage"
      >
        <header className="game-topbar game-topbar--controls-only">
          <div className="game-system-controls">
            <button
              type="button"
              onClick={openCharacterSelection}
              disabled={tutorialState.active || shopOpen}
              aria-label={`Change character: ${getPlayableCharacter(selectedCharacterId).name[missionState.language]}`}
              className="game-character-button"
            >
              <span className="game-command-icon game-command-icon--character" aria-hidden="true" />
              <span className="game-character-label-full">Choose Character</span>
              <span className="game-character-label-short" aria-hidden="true">Choose</span>
            </button>
            <button
              type="button"
              onClick={openLanguageSelection}
              disabled={tutorialState.active}
              aria-label={`${copy.changeLanguage}: ${missionState.language === "en" ? "English" : "Filipino"}`}
              className="game-system-button game-language-button"
            >
              <span className="game-command-icon game-command-icon--language" aria-hidden="true">A</span>
              <span className="game-language-label-full">{missionState.language === "en" ? "English" : "Filipino"}</span>
              <span className="game-language-label-short" aria-hidden="true">{missionState.language === "en" ? "EN" : "FIL"}</span>
            </button>
            <button
              type="button"
              onClick={() => setAudioSettingsOpen(true)}
              disabled={tutorialState.active}
              className="game-system-button"
            >
              <span className="game-command-icon game-command-icon--sound" aria-hidden="true">SFX</span>
              <span>{copy.sound}</span>
            </button>
            <button
              type="button"
              onClick={() => setPauseReason("manual", true)}
              disabled={status !== "ready" || missionState.activityCompleted || tutorialState.active}
              className="game-system-button game-system-button--primary"
            >
              <span className="game-command-icon game-command-icon--pause" aria-hidden="true">||</span>
              <span>{copy.pause}</span>
            </button>
            <button
              type="button"
              onClick={openExitDialog}
              disabled={tutorialState.active}
              className="game-system-button"
            >
              <span className="game-command-icon game-command-icon--exit" aria-hidden="true">X</span>
              <span>{copy.exit}</span>
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
              <p className="sr-only">Technical reason: {errorMessage}</p>
              <div className="mt-5 flex flex-wrap justify-center gap-3">
                <button
                  type="button"
                  onClick={retry}
                  className="min-h-12 rounded-md bg-[#facc15] px-5 font-extrabold text-[#13251d]"
                >
                  {copy.retry}
                </button>
                <button
                  type="button"
                  onClick={exitToDashboard}
                  className="min-h-12 rounded-md bg-white px-5 font-extrabold text-[#13251d]"
                >
                  {copy.exitDashboard}
                </button>
              </div>
            </StatusOverlay>
          )}

          {status === "ready" && (
            <ReadscapeWelcomeOverlay phase={welcomePhase} onDismiss={dismissWelcome} />
          )}

          {isPaused && status !== "error" && !exitDialogOpen && (
            <StatusOverlay
              title={pauseTitle}
              text={copy.pauseMessage}
              variant="pause"
              eyebrow={missionState.language === "fil" ? "NAKA-PAUSE" : "GAME PAUSED"}
            >
              <div className="pause-panel__actions">
                <button
                  type="button"
                  onClick={() => setPauseReason("manual", false)}
                  disabled={activePauseReason !== "manual"}
                  className="pause-panel__resume"
                >
                  {copy.resume}
                </button>
                <button type="button" onClick={() => {
                  setPauseReason("manual", false);
                  dispatchTutorial({ type: "REOPEN", step: tutorialStepForMissionStage(missionState.stage) });
                }} className="pause-panel__utility">{copy.showTutorial}</button>
                <button type="button" onClick={openLanguageSelection} className="pause-panel__utility">{copy.changeLanguage}</button>
                <button
                  type="button"
                  onClick={openExitDialog}
                  className="pause-panel__exit"
                >
                  {copy.exit}
                </button>
              </div>
            </StatusOverlay>
          )}
        </div>

        {status === "ready" && !missionState.activityCompleted && !shopOpen && (
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

        {!shopOpen && <MissionAnnouncements message={missionState.announcement} />}

        {status === "ready" && regionBannerId && !isPaused && !shopOpen && <RegionBanner regionId={regionBannerId} language={missionState.language} />}
        {!shopOpen && <DeferredSavedNotice state={missionState} />}

        {!shopOpen && <MovementControls
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
        />}

        {!shopOpen && <div className="mission-actions">
          <button
            type="button"
            onClick={() => dispatchGuided({ type: "REQUEST_HELP" })}
            disabled={status !== "ready" || isPaused || missionOverlayOpen || tutorialState.active}
            className="mission-action-button mission-help-button"
          >
            {copy.help}
          </button>
        </div>}
        {!shopOpen && status === "ready" && (
          <nav className="adventure-dock" aria-label={missionState.language === "fil" ? "Mga gamit sa pakikipagsapalaran" : "Adventure tools"}>
            <button
              type="button"
              className="adventure-dock__button adventure-dock__button--quests"
              onClick={() => dispatchGuided({ type: "REQUEST_HELP" })}
              disabled={isPaused || missionOverlayOpen || tutorialState.active}
            >
              <span className="adventure-dock__icon adventure-dock__icon--book" aria-hidden="true" />
              <span>{missionState.language === "fil" ? "Gabay" : "Quests"}</span>
            </button>
            <button
              type="button"
              className="adventure-dock__button adventure-dock__button--bag"
              onClick={() => setJourneyBagOpen(true)}
              disabled={isPaused || missionOverlayOpen || tutorialState.active}
            >
              <span className="adventure-dock__icon adventure-dock__icon--bag" aria-hidden="true" />
              <span>{missionState.language === "fil" ? "Bag" : "Inventory"}</span>
            </button>
            <button
              type="button"
              className="adventure-dock__button adventure-dock__button--explore"
              onClick={() => {
                setMapOpen(true);
                audioManager.mapChanged();
              }}
              disabled={isPaused || missionOverlayOpen || tutorialState.active}
            >
              <span className="adventure-dock__icon adventure-dock__icon--explore" aria-hidden="true" />
              <span>{missionState.language === "fil" ? "Galugarin" : "Explore"}</span>
            </button>
          </nav>
        )}
        {(missionState.availableInteraction || fishingReady || riverBoatReady || swimmingReady) && inputEnabled && (
          <button
            ref={interactionPromptRef}
            type="button"
            onClick={() => controllerRef.current?.interact()}
            aria-label={missionState.availableInteraction
              ? (missionState.language === "en" ? missionState.availableInteraction.description : copy.interact)
              : fishingReady
                ? fishingActionLabel
                : riverBoatReady
                  ? riverBoatActionLabel
                  : swimmingActionLabel}
            className={`mission-interact-button contextual-interact-button ${fishingReady ? "fishing-interact-button" : swimmingReady ? "swimming-interact-button" : ""}`}
          >
            <span className="interaction-desktop-label">
              <kbd>F</kbd>
              <span>
                {missionState.availableInteraction
                  ? interactionActionLabel
                  : fishingReady
                    ? fishingActionLabel
                    : riverBoatReady
                      ? riverBoatActionLabel
                      : swimmingActionLabel}
              </span>
            </span>
            <span className="interaction-mobile-label">
              {missionState.availableInteraction
                ? interactionActionLabel
                : fishingReady
                  ? fishingActionLabel
                  : riverBoatReady
                    ? riverBoatActionLabel
                    : swimmingActionLabel}
            </span>
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

        {!isPaused && !exitDialogOpen && !shopOpen && (
          <>
            <DialogueOverlay state={missionState} dispatch={dispatchGuided} />
            <ReadingIntroOverlay state={missionState} dispatch={dispatchGuided} />
            <StoryPresentationOverlay state={missionState} dispatch={dispatchGuided} />
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
            {journeyBagOpen && (
              <JourneyBagOverlay
                language={missionState.language}
                missionId={missionState.missionId}
                missionIndex={missionState.missionIndex}
                completedInteractionIds={explorationProgress.completedInteractionIds}
                caughtResultIds={explorationProgress.caughtResultIds}
                onClose={() => setJourneyBagOpen(false)}
              />
            )}
            <RemainingQuestionsOverlay state={missionState} dispatch={dispatchGuided} onDashboard={exitToDashboard} />
            <MissionResultOverlay state={missionState} dispatch={dispatchGuided} />
            <CompletionOverlay
              state={missionState}
              onReplay={replayMission}
              onDashboard={exitToDashboard}
            />
          </>
        )}
        {status === "ready" && !isPaused && !exitDialogOpen && !characterSelectionOpen && !languageSelectionOpen && tutorialState.active && !missionState.activeDialogue && (
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
        {characterSelectionOpen && (
          <CharacterSelectionOverlay
            selectedCharacterId={draftCharacterId}
            language={missionState.language}
            required={characterSelectionRequired}
            onSelect={setDraftCharacterId}
            onConfirm={confirmCharacterSelection}
            onCancel={() => setCharacterSelectionOpen(false)}
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
        {activeShopId && (
          <ShopInteriorOverlay
            shopId={activeShopId}
            language={missionState.language}
            characterId={selectedCharacterId}
            movementControlMode={movementControlMode}
            onMovementAudioState={({ moving }) => {
              audioManager.updateMovement({ moving, surface: "wood" });
            }}
            taskState={shopTaskState}
            onMovementControlModeChange={(mode) => {
              setMovementControlMode(mode);
              saveMovementControlPreference(mode);
            }}
            onTaskStateChange={(nextState) => {
              setShopTaskState(nextState);
              if (nextState.stage === "completed") {
                setExplorationProgress((current) => ({
                  ...current,
                  completedInteractionIds: current.completedInteractionIds.includes("shop:waterproof-map-paper")
                    ? current.completedInteractionIds
                    : [...current.completedInteractionIds, "shop:waterproof-map-paper"]
                }));
              }
            }}
            onExit={() => {
              setActiveShopId(null);
              setRetryKey((current) => current + 1);
              audioManager.mapChanged();
            }}
          />
        )}

        <OrientationNotice
          hidden={status !== "ready" || missionOverlayOpen || isPaused || tutorialState.active}
          language={missionState.language}
          portrait={portrait}
          onContinue={clearResponsiveInput}
          onExit={openExitDialog}
        />
      </section>

      {exitDialogOpen && (
        <div className="game-modal-layer exit-dialog-layer fixed inset-0 z-[70] grid place-items-center bg-black/70 p-6">
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="exit-title"
            aria-describedby="exit-description"
            className="game-modal-panel exit-dialog-panel w-full max-w-md rounded-lg bg-white p-6 text-[#13251d] shadow-2xl"
          >
            <h2 id="exit-title" className="text-2xl font-black">
              {copy.exitTitle}
            </h2>
            <p id="exit-description" className="mt-3 text-lg leading-7 text-[#315343]">
              {copy.exitDescription}
            </p>
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={closeExitDialog}
                className="game-modal-secondary min-h-12 rounded-md border-2 border-[#176b4d] px-5 font-extrabold text-[#176b4d]"
              >
                {copy.keepPlaying}
              </button>
              <button
                type="button"
                onClick={exitToDashboard}
                className="game-modal-primary min-h-12 rounded-md bg-[#176b4d] px-5 font-extrabold text-white"
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
  role,
  variant,
  eyebrow
}: {
  title: string;
  text: string;
  children?: React.ReactNode;
  role?: "alert" | "status";
  variant?: "pause";
  eyebrow?: string;
}) {
  return (
    <div
      role={role}
      aria-live={role === "alert" ? "assertive" : "polite"}
      className={`game-status-overlay ${variant ? `game-status-overlay--${variant}` : ""}`}
    >
      <div className={`game-status-panel ${variant ? `game-status-panel--${variant}` : ""}`}>
        {eyebrow && <p className="game-status-panel__eyebrow">{eyebrow}</p>}
        <h2>{title}</h2>
        <p>{text}</p>
        {children}
      </div>
    </div>
  );
}

function JourneyBagOverlay({
  language,
  missionId,
  missionIndex,
  completedInteractionIds,
  caughtResultIds,
  onClose
}: {
  language: GameLanguage;
  missionId: MissionState["missionId"];
  missionIndex: number;
  completedInteractionIds: readonly string[];
  caughtResultIds: readonly FishingResultId[];
  onClose: () => void;
}) {
  const isFilipino = language === "fil";
  const items = getJourneyInventory({ language, missionId, missionIndex, completedInteractionIds, caughtResultIds });
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const selectedItem = items.find((item) => item.id === selectedItemId) ?? items[0] ?? null;

  return (
    <div className="journey-bag-overlay" role="presentation">
      <section className="journey-bag" role="dialog" aria-modal="true" aria-labelledby="journey-bag-title">
        <header className="journey-bag__header">
          <span className="journey-bag__badge" aria-hidden="true">BAG</span>
          <div>
            <p>{isFilipino ? "MGA NATIPON" : "JOURNEY BAG"}</p>
            <h2 id="journey-bag-title">{isFilipino ? "Imbentaryo" : "Inventory"}</h2>
          </div>
          <button type="button" className="journey-bag__close" onClick={onClose} aria-label={isFilipino ? "Isara ang bag" : "Close bag"}>X</button>
        </header>
        <div className="journey-bag__content">
          <div className="journey-bag__inventory-heading">
            <span>{isFilipino ? "MGA GAMIT" : "ITEMS"}</span>
            <strong>{items.length}/12</strong>
          </div>
          <ul className="journey-bag__inventory" aria-label={isFilipino ? "Mga gamit sa imbentaryo" : "Inventory items"}>
            {Array.from({ length: 12 }, (_, index) => {
              const item = items[index];
              return item ? (
                <li key={item.id}>
                  <button
                    type="button"
                    aria-pressed={selectedItem?.id === item.id}
                    className={`inventory-slot inventory-slot--${item.kind} ${selectedItem?.id === item.id ? "is-selected" : ""}`}
                    onClick={() => setSelectedItemId(item.id)}
                  >
                    <span className="inventory-slot__token" aria-hidden="true">{item.token}</span>
                    <span className="inventory-slot__count">x{item.quantity}</span>
                    <span className="sr-only">{item.name}</span>
                  </button>
                </li>
              ) : <li key={`empty-${index}`} className="inventory-slot inventory-slot--empty" aria-hidden="true" />;
            })}
          </ul>
          <section className="journey-bag__item-detail" aria-live="polite">
            {selectedItem ? (
              <>
                <span className={`journey-bag__item-token journey-bag__item-token--${selectedItem.kind}`} aria-hidden="true">{selectedItem.token}</span>
                <div>
                  <p>{selectedItem.category}</p>
                  <h3>{selectedItem.name}</h3>
                  <span>{selectedItem.description}</span>
                </div>
                <strong>x{selectedItem.quantity}</strong>
              </>
            ) : (
              <p className="journey-bag__empty-copy">{isFilipino ? "Wala ka pang gamit. Maglaro para makakuha ng item." : "No items yet. Play to collect an item."}</p>
            )}
          </section>
        </div>
        <button type="button" className="journey-bag__done" onClick={onClose}>{isFilipino ? "Bumalik" : "Back to game"}</button>
      </section>
    </div>
  );
}

type JourneyInventoryItem = {
  id: string;
  name: string;
  description: string;
  category: string;
  kind: "quest" | "tool" | "catch" | "reward";
  quantity: number;
  token: string;
};

function getJourneyInventory({
  language,
  missionId,
  missionIndex,
  completedInteractionIds,
  caughtResultIds
}: {
  language: GameLanguage;
  missionId: MissionState["missionId"];
  missionIndex: number;
  completedInteractionIds: readonly string[];
  caughtResultIds: readonly FishingResultId[];
}): JourneyInventoryItem[] {
  const filipino = language === "fil";
  const items: JourneyInventoryItem[] = [];

  for (let index = 0; index < missionIndex; index += 1) {
    const mission = getMission(MISSIONS[index].id, language);
    items.push({
      id: `reward-${mission.id}`,
      name: mission.reward,
      description: filipino ? "Gantimpala ito matapos ang misyon." : "You earned this after finishing a mission.",
      category: filipino ? "GANTIMPALA" : "MISSION REWARD",
      kind: "reward",
      quantity: 1,
      token: "RWD"
    });
  }

  if (missionId === "village-delivery") {
    items.unshift(
      {
        id: "activity-supply-crate",
        name: filipino ? "Kahon ng gamit" : "Packed supply crate",
        description: filipino ? "May tela, mangga, at mga pitsel ito." : "It holds the cloth, mangoes, and water pitchers.",
        category: filipino ? "MISYON" : "QUEST ITEM",
        kind: "quest",
        quantity: 1,
        token: "BOX"
      },
      {
        id: "delivery-table-cloth",
        name: filipino ? "Tiniklop na telang mesa" : "Folded table cloth",
        description: filipino ? "Ito ang unang inilagay sa kahon." : "This was packed first in the crate.",
        category: filipino ? "MISYON" : "QUEST ITEM",
        kind: "quest",
        quantity: 1,
        token: "CLTH"
      },
      {
        id: "delivery-mangoes",
        name: filipino ? "Mangga" : "Mangoes",
        description: filipino ? "Tatlong mangga para sa activity." : "Three mangoes for the activity.",
        category: filipino ? "MISYON" : "QUEST ITEM",
        kind: "quest",
        quantity: 3,
        token: "MNG"
      },
      {
        id: "delivery-water-pitchers",
        name: filipino ? "Mga pitsel ng tubig" : "Water pitchers",
        description: filipino ? "Dalawang pitsel ng tubig para sa activity." : "Two water pitchers for the activity.",
        category: filipino ? "MISYON" : "QUEST ITEM",
        kind: "quest",
        quantity: 2,
        token: "WATR"
      }
    );
  }

  if (completedInteractionIds.includes("shop:waterproof-map-paper")) {
    items.push({
      id: "waterproof-map-paper",
      name: filipino ? "Waterproof na map paper" : "Waterproof map paper",
      description: filipino ? "Pinoprotektahan nito ang mapa laban sa ulan." : "This keeps a map safe from rain.",
      category: filipino ? "GAMIT" : "TOOL",
      kind: "tool",
      quantity: 1,
      token: "MAP"
    });
  }

  for (const resultId of caughtResultIds) {
    const isBottle = resultId === "message-bottle";
    items.push({
      id: resultId,
      name: isBottle ? (filipino ? "Bote na may mensahe" : "Message bottle") : (filipino ? "Pilak na isda" : "Silver fish"),
      description: isBottle
        ? (filipino ? "May maikling babasahin sa loob." : "There is a short reading clue inside.")
        : (filipino ? "Nakuha ito sa ilog." : "You caught this in the river."),
      category: filipino ? "HULI" : "FISHING FIND",
      kind: "catch",
      quantity: 1,
      token: isBottle ? "NOTE" : "FISH"
    });
  }

  return items.slice(0, 12);
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
  if (stage === "readingIntro" || stage === "storyPresentation") return "reading";
  if (stage === "missionAction" || stage === "missionActionFeedback") return "choice";
  if (["questionIntro", "questionRound", "answerSelected", "questionFeedback", "deferredConfirmation"].includes(stage)) return "answerLater";
  return "ready";
}

function keyboardDirection(key: string) {
  if (key === "ArrowUp" || key === "w") return { x: 0, y: -1 };
  if (key === "ArrowDown" || key === "s") return { x: 0, y: 1 };
  if (key === "ArrowLeft" || key === "a") return { x: -1, y: 0 };
  return { x: 1, y: 0 };
}
