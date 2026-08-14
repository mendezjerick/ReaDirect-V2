import { Capacitor } from "@capacitor/core";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";

import { registerNativeLifecycleHandler } from "../../app/nativeLifecycle";
import { BigButton } from "../../components/ui/BigButton";
import { Surface } from "../../components/ui/Surface";
import { useAudioRecorder } from "../assessment/useAudioRecorder";
import {
  playClaraAudioSource,
  stopAllClaraSpeech,
  type ClaraSpeechPlayback,
} from "../clara-audio/claraSpeech";
import { loadLearnerSession } from "../learner-auth/learnerApi";
import { resolveOfflinePracticeProfileId } from "./offlinePracticeIdentity";
import {
  selectOfflineDialogue,
  type OfflineDialogueSelection,
} from "./offlinePracticeDialogue";
import {
  OfflinePracticeRepository,
  type OfflinePracticeInstalledPack,
} from "./offlinePracticeRepository";
import type {
  OfflineLanguage,
  OfflinePracticeItem,
  OfflinePracticeSession,
} from "./offlinePracticeSchemas";
import "./offline-practice.css";

const CLARA_IMAGE_FALLBACK = "/assets/live2d/clara/stills/clara-default.png";

function randomSessionId(): string {
  const value =
    globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
  return `session-${value.replaceAll("-", "")}`;
}

function selectedOfflineLanguage(profileId: string): OfflineLanguage {
  const stored = window.localStorage.getItem(
    `readirect.offline-practice.language:${profileId}`,
  );
  if (stored === "en" || stored === "fil") return stored;
  return loadLearnerSession()?.learner.speech_language === "fil-PH"
    ? "fil"
    : "en";
}

function localAssetUri(uri: string): string {
  return Capacitor.isNativePlatform() ? Capacitor.convertFileSrc(uri) : uri;
}

function createSession(
  profileId: string,
  installed: OfflinePracticeInstalledPack,
): OfflinePracticeSession {
  const now = new Date().toISOString();
  return {
    schemaVersion: 1,
    localSessionId: randomSessionId(),
    localProfileId: profileId,
    packId: installed.record.packId,
    packVersion: installed.record.version,
    moduleKey: installed.record.moduleKey,
    currentItemIndex: 0,
    itemState: [],
    startedAt: now,
    updatedAt: now,
    completedLocally: false,
    classification: "practice-only",
  };
}

function itemStateFor(
  session: OfflinePracticeSession,
  item: OfflinePracticeItem,
) {
  return (
    session.itemState.find(
      (state) => state.practiceItemId === item.practiceItemId,
    ) ?? {
      practiceItemId: item.practiceItemId,
      visited: false,
    }
  );
}

function nextSessionState(
  session: OfflinePracticeSession,
  item: OfflinePracticeItem,
  currentItemIndex: number,
  patch: Partial<OfflinePracticeSession["itemState"][number]>,
): OfflinePracticeSession {
  const existing = itemStateFor(session, item);
  const nextItemState = {
    ...existing,
    ...patch,
    practiceItemId: item.practiceItemId,
    visited: true,
  };
  const itemState = [
    ...session.itemState.filter(
      (state) => state.practiceItemId !== item.practiceItemId,
    ),
    nextItemState,
  ];
  return {
    ...session,
    currentItemIndex,
    itemState,
    updatedAt: new Date().toISOString(),
  };
}

function ClaraPanel({
  selection,
  imageUri,
  isSpeaking,
  audioAvailable,
  audioBusy,
  audioError,
  onPlay,
  onStop,
  onLanguageChange,
  language,
}: {
  selection: OfflineDialogueSelection;
  imageUri: string;
  isSpeaking: boolean;
  audioAvailable: boolean;
  audioBusy: boolean;
  audioError: string | null;
  onPlay: () => void;
  onStop: () => void;
  onLanguageChange: (language: OfflineLanguage) => void;
  language: OfflineLanguage;
}) {
  return (
    <Surface className="offline-module__clara" kind="panel" padding="normal">
      <div className="offline-module__clara-head">
        <div>
          <p className="offline-practice__eyebrow">Ma’am Clara</p>
          <h2>Guidance for this activity</h2>
        </div>
        <label className="offline-module__language">
          <span>Clara language</span>
          <select
            aria-label="Clara language"
            value={language}
            onChange={(event) =>
              onLanguageChange(event.target.value as OfflineLanguage)
            }
          >
            <option value="en">English</option>
            <option value="fil">Filipino</option>
          </select>
        </label>
      </div>
      <div className="offline-module__clara-body">
        <img src={imageUri} alt="Ma’am Clara" />
        <div className="offline-module__speech" aria-live="polite">
          <p>{selection.dialogue.text}</p>
          {audioAvailable ? (
            <div className="offline-module__speech-actions">
              {isSpeaking ? (
                <BigButton size="regular" variant="quiet" onClick={onStop}>
                  Stop Clara
                </BigButton>
              ) : (
                <BigButton
                  size="regular"
                  variant="secondary"
                  disabled={audioBusy}
                  onClick={onPlay}
                >
                  {audioBusy ? "Preparing audio" : "Hear Clara"}
                </BigButton>
              )}
              <span className="offline-module__audio-note">
                {isSpeaking
                  ? "Clara is speaking."
                  : "Fixed audio is stored on this device."}
              </span>
            </div>
          ) : (
            <p className="offline-module__audio-note">
              Text guidance is available. Audio for this language is not stored
              in this pack.
            </p>
          )}
          {audioError ? (
            <p className="offline-module__inline-error" role="status">
              {audioError} The text guidance is still available.
            </p>
          ) : null}
        </div>
      </div>
    </Surface>
  );
}

function OfflineRecorder({
  resetKey,
  onContinue,
}: {
  resetKey: string;
  onContinue: () => void;
}) {
  const recorder = useAudioRecorder(resetKey, { maximumDurationMs: 15_000 });
  const canContinue =
    recorder.state !== "recording" && recorder.state !== "playing";

  const recordOrStop = () => {
    if (recorder.state === "idle") void recorder.record();
    else if (recorder.state === "recording") recorder.stop();
    else if (recorder.state === "recorded") recorder.play();
  };

  return (
    <Surface className="offline-module__recorder" kind="panel" padding="normal">
      <p className="offline-practice__eyebrow">Your turn</p>
      <h2>Record yourself</h2>
      <p>
        Say the words, then listen to your recording if you want to try again.
      </p>
      <div className="offline-module__recorder-actions">
        <BigButton
          className="offline-module__record-button"
          onClick={recordOrStop}
          disabled={recorder.state === "playing"}
          aria-label={
            recorder.state === "recording"
              ? "Stop recording"
              : recorder.state === "recorded"
                ? "Listen to your recording"
                : "Record yourself"
          }
        >
          {recorder.state === "recording"
            ? "Stop recording"
            : recorder.state === "recorded"
              ? "Listen to your recording"
              : "Record yourself"}
        </BigButton>
        {recorder.state === "recorded" ? (
          <BigButton size="regular" variant="quiet" onClick={recorder.retry}>
            Try again
          </BigButton>
        ) : null}
      </div>
      <p className="offline-module__recording-state" aria-live="polite">
        {recorder.state === "recording"
          ? `Recording ${Math.ceil(recorder.recordingElapsedMs / 1000)} seconds`
          : recorder.state === "playing"
            ? "Playing your recording."
            : recorder.state === "recorded"
              ? "Your recording is ready on this screen only."
              : "No recording is saved."}
      </p>
      {recorder.error ? (
        <p className="offline-module__inline-error" role="alert">
          {recorder.error}
        </p>
      ) : null}
      <BigButton
        className="offline-module__continue"
        variant="primary"
        disabled={!canContinue}
        onClick={() => {
          recorder.retry();
          onContinue();
        }}
      >
        Continue
      </BigButton>
    </Surface>
  );
}

function ComprehensionChoices({
  item,
  selectedChoiceId,
  onSelect,
  onContinue,
}: {
  item: OfflinePracticeItem;
  selectedChoiceId?: string;
  onSelect: (choiceId: string) => void;
  onContinue: () => void;
}) {
  const comprehension = item.comprehension;
  if (!comprehension) return null;
  const selected = comprehension.choices.find(
    (choice) => choice.choiceId === selectedChoiceId,
  );
  const isAnswer = selectedChoiceId === comprehension.correctChoiceId;

  return (
    <Surface className="offline-module__choices" kind="panel" padding="normal">
      <p className="offline-practice__eyebrow">Practice question</p>
      <h2>Choose an answer from the text.</h2>
      <div
        className="offline-module__choice-list"
        role="group"
        aria-label="Practice answers"
      >
        {comprehension.choices.map((choice) => (
          <button
            key={choice.choiceId}
            type="button"
            className="offline-module__choice"
            data-selected={choice.choiceId === selectedChoiceId}
            aria-pressed={choice.choiceId === selectedChoiceId}
            onClick={() => onSelect(choice.choiceId)}
          >
            {choice.label}
          </button>
        ))}
      </div>
      {selected ? (
        <p className="offline-module__feedback" role="status">
          {isAnswer
            ? comprehension.feedbackText
            : "Let’s look at that together. Read the text again and try another choice."}
        </p>
      ) : null}
      <BigButton disabled={!selected} onClick={onContinue}>
        Continue
      </BigButton>
    </Surface>
  );
}

function OfflinePracticeItemView({
  installed,
  session,
  profileId,
  item,
  onSessionChange,
  onBack,
}: {
  installed: OfflinePracticeInstalledPack;
  session: OfflinePracticeSession;
  profileId: string;
  item: OfflinePracticeItem;
  onSessionChange: (session: OfflinePracticeSession) => void;
  onBack: () => void;
}) {
  const repositoryRef = useRef(new OfflinePracticeRepository());
  const playbackRef = useRef<ClaraSpeechPlayback | null>(null);
  const speechRequestRef = useRef(0);
  const [language, setLanguage] = useState<OfflineLanguage>(() =>
    selectedOfflineLanguage(profileId),
  );
  const [audioBusy, setAudioBusy] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [imageUri, setImageUri] = useState(CLARA_IMAGE_FALLBACK);
  const state = itemStateFor(session, item);
  const selection = useMemo(
    () => selectOfflineDialogue(installed.pack.content, item, language),
    [installed.pack.content, item, language],
  );

  const stopDialogue = useCallback(() => {
    speechRequestRef.current += 1;
    playbackRef.current?.stop();
    playbackRef.current = null;
    stopAllClaraSpeech();
    setIsSpeaking(false);
    setAudioBusy(false);
  }, []);

  useEffect(() => {
    let active = true;
    const imageAsset = item.assetIds
      .map((assetId) =>
        installed.pack.manifest.assets.find(
          (asset) => asset.assetId === assetId,
        ),
      )
      .find((asset) => asset?.kind === "image");
    if (!imageAsset) {
      setImageUri(CLARA_IMAGE_FALLBACK);
      return () => {
        active = false;
      };
    }
    void repositoryRef.current
      .resolveLocalAsset(
        installed.record.packId,
        imageAsset.assetId,
        installed.record.version,
      )
      .then((asset) => {
        if (active) setImageUri(localAssetUri(asset.uri));
      })
      .catch(() => {
        if (active) setImageUri(CLARA_IMAGE_FALLBACK);
      });
    return () => {
      active = false;
    };
  }, [installed, item]);

  useEffect(() => {
    stopDialogue();
    window.localStorage.setItem(
      `readirect.offline-practice.language:${profileId}`,
      language,
    );
    return stopDialogue;
  }, [language, profileId, stopDialogue]);

  useEffect(() => {
    const unregister = registerNativeLifecycleHandler({
      onPause: () => {
        stopDialogue();
        void repositoryRef.current.writePracticeSession(profileId, session);
      },
    });
    return unregister;
  }, [onBack, profileId, session, stopDialogue]);

  useEffect(() => () => stopDialogue(), [stopDialogue]);

  const playDialogue = async () => {
    if (!selection.audioAssetId) return;
    stopDialogue();
    const requestId = speechRequestRef.current;
    setAudioBusy(true);
    setAudioError(null);
    try {
      const asset = await repositoryRef.current.resolveLocalAsset(
        installed.record.packId,
        selection.audioAssetId,
        installed.record.version,
      );
      if (requestId !== speechRequestRef.current) return;
      const playback = await playClaraAudioSource(localAssetUri(asset.uri));
      if (requestId !== speechRequestRef.current) {
        playback.stop();
        return;
      }
      playbackRef.current = playback;
      setAudioBusy(false);
      setIsSpeaking(true);
      await playback.finished;
      if (requestId === speechRequestRef.current) {
        playbackRef.current = null;
        setIsSpeaking(false);
      }
    } catch {
      if (requestId === speechRequestRef.current) {
        setAudioBusy(false);
        setIsSpeaking(false);
        setAudioError("Clara’s audio could not play right now.");
      }
    }
  };

  const updateItem = (
    patch: Partial<OfflinePracticeSession["itemState"][number]>,
  ) => {
    const next = nextSessionState(
      session,
      item,
      session.currentItemIndex,
      patch,
    );
    onSessionChange(next);
  };

  const continueItem = () => {
    stopDialogue();
    const nextIndex = session.currentItemIndex + 1;
    const next = nextSessionState(session, item, nextIndex, {
      acknowledgedFeedback:
        item.interactionMode === "comprehension_choice" ? true : undefined,
    });
    onSessionChange({
      ...next,
      completedLocally:
        nextIndex >= installed.pack.content.modules[0].items.length,
    });
  };

  const itemCount = installed.pack.content.modules[0].items.length;
  const itemNumber = session.currentItemIndex + 1;
  const letterText = item.displayText.trim();

  return (
    <main
      className="offline-practice-page offline-module"
      data-route-focus
      tabIndex={-1}
    >
      <div className="offline-module__shell">
        <header className="offline-module__header">
          <BigButton
            className="offline-module__back"
            size="regular"
            variant="quiet"
            onClick={onBack}
            aria-label="Back to Offline Practice"
          >
            Back
          </BigButton>
          <div className="offline-module__header-copy">
            <p className="offline-practice__eyebrow">Practice only</p>
            <h1>{installed.record.title}</h1>
            <p>Say each letter out loud and listen to yourself.</p>
          </div>
          <div
            className="offline-module__progress"
            aria-label={`Item ${itemNumber} of ${itemCount}`}
          >
            <strong>
              {itemNumber} <span>of</span> {itemCount}
            </strong>
            <span className="offline-module__progress-track" aria-hidden="true">
              <span
                className="offline-module__progress-fill"
                style={{ width: `${(itemNumber / itemCount) * 100}%` }}
              />
            </span>
          </div>
        </header>
        <p className="offline-module__persistent-label">
          Practice only — does not change lesson progress.
        </p>
        <ClaraPanel
          selection={selection}
          imageUri={imageUri}
          isSpeaking={isSpeaking}
          audioAvailable={Boolean(selection.audioAssetId)}
          audioBusy={audioBusy}
          audioError={audioError}
          onPlay={() => void playDialogue()}
          onStop={stopDialogue}
          onLanguageChange={(nextLanguage) => {
            stopDialogue();
            setLanguage(nextLanguage);
          }}
          language={language}
        />
        {item.interactionMode === "letter_read" ? (
          <Surface
            className="offline-module__prompt offline-module__prompt--letter"
            kind="frame"
            padding="roomy"
            aria-label={`Letter prompt: ${letterText}`}
          >
            <p className="offline-practice__eyebrow">Letter to read</p>
            <div className="offline-module__letter-cards">
              <div className="offline-module__letter-card">
                <span>{letterText.toUpperCase()}</span>
                <small>Big letter</small>
              </div>
              <div className="offline-module__letter-card">
                <span>{letterText.toLowerCase()}</span>
                <small>Small letter</small>
              </div>
            </div>
          </Surface>
        ) : (
          <Surface
            className={`offline-module__prompt offline-module__prompt--${item.interactionMode}`}
            kind="frame"
            padding="roomy"
          >
            <p className="offline-practice__eyebrow">Read this</p>
            <p className="offline-module__display-text">{item.displayText}</p>
          </Surface>
        )}
        {item.interactionMode === "comprehension_choice" ? (
          <ComprehensionChoices
            item={item}
            selectedChoiceId={state.selectedChoiceId}
            onSelect={(choiceId) =>
              updateItem({
                selectedChoiceId: choiceId,
                acknowledgedFeedback: true,
              })
            }
            onContinue={continueItem}
          />
        ) : (
          <OfflineRecorder
            resetKey={`${installed.record.packId}:${installed.record.version}:${item.practiceItemId}`}
            onContinue={continueItem}
          />
        )}
      </div>
    </main>
  );
}

export function OfflinePracticeModulePage() {
  const { packId } = useParams<{ packId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const offlineHomePath =
    searchParams.get("from") === "dashboard"
      ? "/learner/offline?from=dashboard"
      : "/learner/offline";
  const repositoryRef = useRef(new OfflinePracticeRepository());
  const [profileId, setProfileId] = useState<string | null>(null);
  const [installed, setInstalled] =
    useState<OfflinePracticeInstalledPack | null>(null);
  const [session, setSession] = useState<OfflinePracticeSession | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!packId) {
      navigate(offlineHomePath, { replace: true });
      return;
    }
    void (async () => {
      try {
        const [resolvedProfileId, localPack] = await Promise.all([
          resolveOfflinePracticeProfileId(),
          repositoryRef.current.getActivePack(packId),
        ]);
        if (!localPack) {
          if (active) navigate(offlineHomePath, { replace: true });
          return;
        }
        const saved = await repositoryRef.current.readPracticeSession(
          resolvedProfileId,
          localPack.record.packId,
          localPack.record.version,
        );
        if (active) {
          setProfileId(resolvedProfileId);
          setInstalled(localPack);
          setSession(saved ?? createSession(resolvedProfileId, localPack));
        }
      } catch {
        if (active)
          setError(
            "This practice pack could not be opened. Return to Offline Practice and try again.",
          );
      }
    })();
    return () => {
      active = false;
      stopAllClaraSpeech();
    };
  }, [navigate, offlineHomePath, packId]);

  useEffect(() => {
    if (!profileId || !session) return;
    void repositoryRef.current.writePracticeSession(profileId, session);
  }, [profileId, session]);

  useEffect(() => {
    const unregister = registerNativeLifecycleHandler({
      onBackButton: () => {
        stopAllClaraSpeech();
        navigate(offlineHomePath);
        return true;
      },
    });
    return unregister;
  }, [navigate, offlineHomePath]);

  const moduleItems = installed?.pack.content.modules[0]?.items ?? [];
  const isComplete = Boolean(
    session?.completedLocally ||
    (session?.currentItemIndex ?? 0) >= moduleItems.length,
  );

  if (error) {
    return (
      <main
        className="offline-practice-page offline-module"
        data-route-focus
        tabIndex={-1}
      >
        <Surface className="offline-module__error" kind="panel" padding="roomy">
          <h1>Practice is unavailable</h1>
          <p>{error}</p>
          <BigButton onClick={() => navigate(offlineHomePath)}>
            Back to Offline Practice
          </BigButton>
        </Surface>
      </main>
    );
  }

  if (!installed || !session || !profileId) {
    return (
      <main
        className="offline-practice-page offline-module"
        data-route-focus
        tabIndex={-1}
      >
        <Surface
          className="offline-module__loading"
          kind="panel"
          padding="roomy"
        >
          <p role="status">Opening your saved practice pack…</p>
        </Surface>
      </main>
    );
  }

  if (isComplete) {
    return (
      <main
        className="offline-practice-page offline-module"
        data-route-focus
        tabIndex={-1}
      >
        <Surface
          className="offline-module__complete"
          kind="frame"
          padding="roomy"
        >
          <p className="offline-practice__eyebrow">Practice complete</p>
          <h1>You reached the end of this pack.</h1>
          <p>This was practice only. It did not change your lesson progress.</p>
      <BigButton onClick={() => navigate(offlineHomePath)}>
            Back to Offline Practice
          </BigButton>
        </Surface>
      </main>
    );
  }

  const item = moduleItems[session.currentItemIndex];
  if (!item) {
    return null;
  }

  return (
    <OfflinePracticeItemView
      installed={installed}
      session={session}
      profileId={profileId}
      item={item}
      onSessionChange={setSession}
      onBack={() => navigate(offlineHomePath)}
    />
  );
}
