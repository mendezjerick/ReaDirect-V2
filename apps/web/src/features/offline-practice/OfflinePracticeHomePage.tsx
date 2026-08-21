import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";

import { BigButton } from "../../components/ui/BigButton";
import { PixelIcon } from "../../components/ui/PixelIcon";
import { Surface } from "../../components/ui/Surface";
import { useButtonCommit } from "../../components/ui/useButtonCommit";
import { useConnectivity } from "../connectivity/connectivityContext";
import { loadLearnerSession } from "../learner-auth/learnerApi";
import { resolveOfflinePracticeProfileId } from "./offlinePracticeIdentity";
import {
  OfflinePracticeDownloadError,
  OfflinePracticeDownloadService,
} from "./offlinePracticeDownloadService";
import {
  OfflinePracticeRepository,
  type OfflinePracticeInstalledPack,
} from "./offlinePracticeRepository";
import {
  categoryDescription,
  categoryForPack,
  categoryTitle,
  OFFLINE_PRACTICE_CATEGORIES,
} from "./offlinePracticeCatalog";
import type {
  OfflinePackListEntry,
  OfflinePackRecord,
  OfflinePracticeCategoryKey,
} from "./offlinePracticeSchemas";
import "./offline-practice.css";

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function friendlyDownloadError(error: unknown): string {
  if (!(error instanceof OfflinePracticeDownloadError)) {
    return "That download could not be completed. Your existing pack is still safe.";
  }
  switch (error.code) {
    case "unauthorized":
      return "Sign in again while online before downloading a practice pack.";
    case "network":
      return "The download needs a stable internet connection. Please try again.";
    case "storage":
      return "There is not enough space for that pack. Delete an old pack and try again.";
    case "validation":
    case "invalid_response":
      return "That practice pack could not be verified. Your existing pack is still safe.";
  }
}

function localStatus(
  local: OfflinePackRecord | undefined,
  remote: OfflinePackListEntry | undefined,
): "available" | "update" | "download" {
  if (!local) return "download";
  if (remote && remote.version !== local.version) return "update";
  return "available";
}

function PracticeBookIcon() {
  return <PixelIcon name="book" />;
}

function PracticeLeafIcon() {
  return <PixelIcon name="leaf" />;
}

interface PackCardProps {
  readonly local?: OfflinePackRecord;
  readonly remote?: OfflinePackListEntry;
  readonly downloading: boolean;
  readonly onDownload: () => void;
  readonly onDelete: () => void;
  readonly onStart: () => void;
  readonly resuming: boolean;
}

function PackCard({
  local,
  remote,
  downloading,
  onDownload,
  onDelete,
  onStart,
  resuming,
}: PackCardProps) {
  const status = localStatus(local, remote);
  const title = local?.title ?? remote?.title ?? "Offline Practice";
  const version = local?.version ?? remote?.version;
  const bytes = local?.totalBytes ?? remote?.totalBytes;
  const cardIcon = local ? <PracticeLeafIcon /> : <PracticeBookIcon />;

  return (
    <Surface
      className="offline-practice__pack-card"
      kind="panel"
      padding="normal"
    >
      <div className="offline-practice__pack-heading">
        <div className="offline-practice__pack-title">
          <span
            className={`offline-practice__pack-icon${local ? " offline-practice__pack-icon--local" : ""}`}
            aria-hidden="true"
          >
            {cardIcon}
          </span>
          <div>
            <p className="offline-practice__eyebrow">Practice pack</p>
            <h2>{title}</h2>
          </div>
        </div>
        <span
          className={`offline-practice__status offline-practice__status--${status}`}
        >
          {status === "available"
            ? "Available offline"
            : status === "update"
              ? "Update available"
              : "Ready to download"}
        </span>
      </div>
      <dl className="offline-practice__pack-details">
        <div>
          <dt>Version</dt>
          <dd>{version ?? "Unknown"}</dd>
        </div>
        <div>
          <dt>Size</dt>
          <dd>{bytes === undefined ? "Unknown" : formatBytes(bytes)}</dd>
        </div>
      </dl>
      <p className="offline-practice__pack-note">
        Practice only — does not change lesson progress.
      </p>
      <div className="offline-practice__pack-actions">
        {local ? (
          <BigButton
            className="offline-practice__start"
            size="regular"
            onClick={onStart}
            aria-label={`${resuming ? "Continue" : "Start"} ${title} practice`}
          >
            {resuming ? "Continue Practice" : "Start Practice"}
          </BigButton>
        ) : null}
        {remote && status !== "available" ? (
          <BigButton
            size="regular"
            variant={status === "update" ? "primary" : "secondary"}
            disabled={downloading}
            busy={downloading}
            busyLabel="Downloading"
            onClick={onDownload}
          >
            {status === "update" ? "Update" : "Download"}
          </BigButton>
        ) : null}
        {local ? (
          <BigButton
            size="regular"
            variant="quiet"
            onClick={onDelete}
            aria-label={`Delete ${title} download`}
          >
            Delete
          </BigButton>
        ) : null}
      </div>
    </Surface>
  );
}

export function OfflinePracticeHomePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fromDashboard = searchParams.get("from") === "dashboard";
  const offlineHomePath = fromDashboard
    ? "/learner/offline?from=dashboard"
    : "/learner/offline";
  const { categoryKey: routeCategoryKey } = useParams<{
    categoryKey?: OfflinePracticeCategoryKey;
  }>();
  const categoryKey = OFFLINE_PRACTICE_CATEGORIES.some(
    (category) => category.key === routeCategoryKey,
  )
    ? routeCategoryKey
    : undefined;
  const connectivity = useConnectivity();
  const refreshConnectivity = connectivity.refresh;
  const repositoryRef = useRef(new OfflinePracticeRepository());
  const serviceRef = useRef(
    new OfflinePracticeDownloadService(repositoryRef.current),
  );
  const [installed, setInstalled] = useState<OfflinePracticeInstalledPack[]>(
    [],
  );
  const [resumablePackIds, setResumablePackIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [available, setAvailable] = useState<OfflinePackListEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingPackId, setDownloadingPackId] = useState<string | null>(
    null,
  );
  const [downloadingCategoryKey, setDownloadingCategoryKey] =
    useState<OfflinePracticeCategoryKey | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const deleteAllCommit = useButtonCommit();

  const refreshLocal = useCallback(async () => {
    try {
      const records = await repositoryRef.current.listCommittedPacks();
      const profileId = await resolveOfflinePracticeProfileId();
      const packs = await Promise.all(
        records.map(async (record) => {
          const pack = await repositoryRef.current.getActivePack(record.packId);
          return pack;
        }),
      );
      const resumable = new Set<string>();
      if (typeof repositoryRef.current.readPracticeSession === "function") {
        await Promise.all(
          records.map(async (record) => {
            const saved = await repositoryRef.current.readPracticeSession(
              profileId,
              record.packId,
              record.version,
            );
            if (saved && !saved.completedLocally) resumable.add(record.packId);
          }),
        );
      }
      setInstalled(
        packs.filter(
          (pack): pack is OfflinePracticeInstalledPack => pack !== null,
        ),
      );
      setResumablePackIds(resumable);
    } catch {
      setMessage(
        "Your Offline Practice library needs attention. Try opening it again.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshRemote = useCallback(async () => {
    const session = loadLearnerSession();
    if (
      !session?.token ||
      connectivity.api !== "reachable" ||
      connectivity.learnerSession !== "present"
    ) {
      setAvailable([]);
      return;
    }

    try {
      setAvailable(
        await serviceRef.current.listAvailablePacks({ token: session.token }),
      );
    } catch (error) {
      setAvailable([]);
      setMessage(friendlyDownloadError(error));
    }
  }, [connectivity.api, connectivity.learnerSession]);

  useEffect(() => {
    void refreshLocal();
  }, [refreshLocal]);

  useEffect(() => {
    const hasSession = Boolean(loadLearnerSession()?.token);
    if (
      connectivity.api === "unknown" ||
      (hasSession && connectivity.learnerSession === "signed_out")
    ) {
      void refreshConnectivity();
    }
  }, [connectivity.api, connectivity.learnerSession, refreshConnectivity]);

  useEffect(() => {
    void refreshRemote();
  }, [refreshRemote]);

  const packCards = useMemo(() => {
    const localById = new Map(
      installed.map((item) => [item.record.packId, item.record]),
    );
    const remoteById = new Map(available.map((item) => [item.packId, item]));
    const ids = [...new Set([...localById.keys(), ...remoteById.keys()])];
    return ids.map((packId) => ({
      packId,
      local: localById.get(packId),
      remote: remoteById.get(packId),
    }));
  }, [available, installed]);

  const categoryCards = useMemo(
    () =>
      OFFLINE_PRACTICE_CATEGORIES.map((category) => {
        const cards = packCards.filter(
          (card) =>
            categoryForPack(card.local ?? card.remote ?? { moduleKey: "" }) ===
            category.key,
        );
        const downloadedCount = cards.filter((card) => card.local).length;
        return { ...category, cards, downloadedCount };
      }),
    [packCards],
  );

  const downloadPack = async (metadata: OfflinePackListEntry) => {
    const token = loadLearnerSession()?.token;
    if (!token) {
      navigate(
        `/learner/login?returnTo=${encodeURIComponent(offlineHomePath)}`,
      );
      return;
    }
    setMessage(null);
    setDownloadingPackId(metadata.packId);
    try {
      await serviceRef.current.downloadPack(metadata, { token });
      setMessage(`${metadata.title} is now available offline.`);
      await refreshLocal();
      await refreshRemote();
    } catch (error) {
      setMessage(friendlyDownloadError(error));
    } finally {
      setDownloadingPackId(null);
    }
  };

  const downloadCategory = async (key: OfflinePracticeCategoryKey) => {
    const token = loadLearnerSession()?.token;
    if (!token) {
      navigate(
        `/learner/login?returnTo=${encodeURIComponent(offlineHomePath)}`,
      );
      return;
    }
    const categoryCardsForDownload = packCards.filter(
      (card) =>
        categoryForPack(card.local ?? card.remote ?? { moduleKey: "" }) ===
          key &&
        card.remote &&
        localStatus(card.local, card.remote) !== "available",
    );
    setMessage(null);
    setDownloadingCategoryKey(key);
    try {
      const result = await serviceRef.current.downloadPacks(
        categoryCardsForDownload.flatMap((card) =>
          card.remote ? [card.remote] : [],
        ),
        { token },
      );
      setMessage(
        result.failed.length === 0
          ? `${categoryTitle(key)} is ready on this device.`
          : `${result.committed.length} module(s) downloaded. ${result.failed.length} module(s) still need attention.`,
      );
      await refreshLocal();
      await refreshRemote();
    } finally {
      setDownloadingCategoryKey(null);
    }
  };

  const deletePack = async (pack: OfflinePackRecord) => {
    if (!window.confirm(`Delete the ${pack.title} download?`)) return;
    await repositoryRef.current.deletePack(pack.packId);
    setMessage(`${pack.title} was removed from this device.`);
    await refreshLocal();
  };

  const deleteCategory = async (key: OfflinePracticeCategoryKey) => {
    const category = categoryCards.find((item) => item.key === key);
    const localPacks =
      category?.cards.flatMap((card) => (card.local ? [card.local] : [])) ?? [];
    if (!localPacks.length) return;
    if (!window.confirm(`Delete all ${categoryTitle(key)} downloads?`)) return;
    for (const pack of localPacks) {
      await repositoryRef.current.deletePack(pack.packId);
    }
    setMessage(
      `${categoryTitle(key)} downloads were removed from this device.`,
    );
    await refreshLocal();
  };

  const deleteAll = () => {
    deleteAllCommit.commit(async () => {
      if (
        !window.confirm(
          "Delete all Offline Practice downloads from this device?",
        )
      )
        return;
      await repositoryRef.current.deleteAll();
      setMessage(
        "All Offline Practice downloads were removed from this device.",
      );
      await refreshLocal();
    });
  };

  return (
    <main
      className="offline-practice-page learner-flow-page"
      aria-label="Offline Practice"
      data-route-focus
      tabIndex={-1}
    >
      <div className="offline-practice__shell">
        <Surface
          className="offline-practice__header"
          kind="frame"
          padding="roomy"
        >
          <button
            type="button"
            className="offline-practice__back"
            onClick={() =>
              navigate(
                categoryKey
                  ? offlineHomePath
                  : fromDashboard
                    ? "/learner/dashboard"
                    : "/learner/modes",
              )
            }
          >
            Back
          </button>
          <div className="offline-practice__header-copy">
            <span className="offline-practice__header-icon" aria-hidden="true">
              <PracticeLeafIcon />
            </span>
            <div>
              <p className="offline-practice__eyebrow">
                Practice at your own pace
              </p>
              <h1>
                {categoryKey ? categoryTitle(categoryKey) : "Practice Offline"}
              </h1>
              <p>
                {categoryKey
                  ? categoryDescription(categoryKey)
                  : "Downloaded packs stay on this device, so you can practice even when the internet is away."}
              </p>
            </div>
          </div>
          <span className="offline-practice__privacy-note">
            Practice only — does not change lesson progress.
          </span>
        </Surface>

        <section className="offline-practice__status-panel" aria-live="polite">
          <span className="offline-practice__status-icon" aria-hidden="true">
            <PracticeLeafIcon />
          </span>
          <div>
            <strong>
              {connectivity.api === "reachable"
                ? "Online downloads are available."
                : connectivity.api === "unauthorized"
                  ? "Sign in again to download new packs."
                  : "You can still use packs already saved here."}
            </strong>
            <span>
              {connectivity.device === "offline"
                ? "Your device is offline."
                : connectivity.api === "unreachable"
                  ? "The ReaDirect service is unavailable right now."
                  : "Your saved practice library is ready to check."}
            </span>
          </div>
        </section>

        {message ? (
          <p
            className="offline-practice__message"
            role="status"
            aria-live="polite"
          >
            {message}
          </p>
        ) : null}

        <section
          className="offline-practice__library"
          aria-labelledby="offline-library-title"
        >
          <div className="offline-practice__section-heading">
            <div className="offline-practice__section-title">
              <span
                className="offline-practice__section-icon"
                aria-hidden="true"
              >
                <PracticeBookIcon />
              </span>
              <div>
                <p className="offline-practice__eyebrow">On this device</p>
                <h2 id="offline-library-title">
                  {categoryKey ? "Practice Modules" : "Offline Downloads"}
                </h2>
              </div>
            </div>
            {installed.length > 0 ? (
              <BigButton
                size="regular"
                variant="quiet"
                committing={deleteAllCommit.committing}
                onClick={deleteAll}
              >
                Delete All
              </BigButton>
            ) : null}
          </div>

          {loading ? (
            <Surface
              className="offline-practice__empty"
              kind="panel"
              padding="roomy"
            >
              <p role="status" aria-live="polite">
                Opening your saved practice library...
              </p>
            </Surface>
          ) : categoryKey ? (
            (() => {
              const category = categoryCards.find(
                (item) => item.key === categoryKey,
              );
              const cards = category?.cards ?? [];
              return (
                <>
                  <div className="offline-practice__category-toolbar">
                    <p>
                      {cards.filter((card) => card.local).length} of{" "}
                      {cards.length} modules downloaded
                    </p>
                    {cards.some((card) => card.local) ? (
                      <BigButton
                        size="regular"
                        variant="quiet"
                        onClick={() => void deleteCategory(categoryKey)}
                      >
                        Delete Category Downloads
                      </BigButton>
                    ) : null}
                    {cards.some(
                      (card) =>
                        card.remote &&
                        localStatus(card.local, card.remote) !== "available",
                    ) ? (
                      <BigButton
                        size="regular"
                        variant="secondary"
                        disabled={downloadingCategoryKey === categoryKey}
                        busy={downloadingCategoryKey === categoryKey}
                        busyLabel="Downloading"
                        onClick={() => void downloadCategory(categoryKey)}
                      >
                        Download Category
                      </BigButton>
                    ) : null}
                  </div>
                  {cards.length ? (
                    <div className="offline-practice__pack-list">
                      {cards.map((card) => (
                        <PackCard
                          key={card.packId}
                          local={card.local}
                          remote={card.remote}
                          downloading={downloadingPackId === card.packId}
                          onDownload={() =>
                            card.remote && void downloadPack(card.remote)
                          }
                          onDelete={() =>
                            card.local && void deletePack(card.local)
                          }
                          onStart={() =>
                            navigate(
                              `/learner/offline/${card.packId}${fromDashboard ? "?from=dashboard" : ""}`,
                            )
                          }
                          resuming={resumablePackIds.has(card.packId)}
                        />
                      ))}
                    </div>
                  ) : (
                    <Surface
                      className="offline-practice__empty"
                      kind="panel"
                      padding="roomy"
                    >
                      <h3>No modules listed yet</h3>
                      <p>
                        Sign in while online to see downloadable practice sets
                        in this category.
                      </p>
                      {connectivity.learnerSession !== "present" ? (
                        <BigButton
                          size="regular"
                          onClick={() =>
                            navigate(
                              `/learner/login?returnTo=${encodeURIComponent(offlineHomePath)}`,
                            )
                          }
                        >
                          Sign in to download
                        </BigButton>
                      ) : null}
                    </Surface>
                  )}
                </>
              );
            })()
          ) : (
            <>
              {!installed.length && !available.length ? (
                <Surface
                  className="offline-practice__empty"
                  kind="panel"
                  padding="roomy"
                >
                  <h3>No packs downloaded yet</h3>
                  <p>
                    While you are online, sign in and open a category to
                    download a practice set. It will stay here for your next
                    offline practice time.
                  </p>
                  {connectivity.learnerSession !== "present" ? (
                    <BigButton
                      size="regular"
                      onClick={() =>
                        navigate(
                          `/learner/login?returnTo=${encodeURIComponent(offlineHomePath)}`,
                        )
                      }
                    >
                      Sign in to download
                    </BigButton>
                  ) : null}
                </Surface>
              ) : null}
              <div className="offline-practice__category-list">
                {categoryCards.map((category) => (
                  <Surface
                    key={category.key}
                    className="offline-practice__category-card"
                    kind="panel"
                    padding="normal"
                  >
                    <div>
                      <h3>{category.title}</h3>
                      <p>{category.description}</p>
                    </div>
                    <div className="offline-practice__category-meta">
                      <strong>
                        {category.cards.length
                          ? `${category.downloadedCount} of ${category.cards.length} downloaded`
                          : "Not downloaded"}
                      </strong>
                      <BigButton
                        size="regular"
                        variant="secondary"
                        onClick={() =>
                          navigate(
                            `/learner/offline/category/${category.key}${fromDashboard ? "?from=dashboard" : ""}`,
                          )
                        }
                      >
                        Open
                      </BigButton>
                    </div>
                  </Surface>
                ))}
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
