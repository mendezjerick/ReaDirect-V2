import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const repositoryState = vi.hoisted(() => ({
  listCommittedPacks: vi.fn(),
  getActivePack: vi.fn(),
  deletePack: vi.fn(),
  deleteAll: vi.fn(),
}));
const downloadState = vi.hoisted(() => ({
  listAvailablePacks: vi.fn(),
  downloadPack: vi.fn(),
}));
const connectivityMock = vi.hoisted(() => vi.fn());
const loadSessionMock = vi.hoisted(() =>
  vi.fn<() => { token: string } | null>(() => null),
);

vi.mock("../src/features/connectivity/connectivityContext", () => ({
  useConnectivity: connectivityMock,
}));
vi.mock("../src/features/learner-auth/learnerApi", () => ({
  loadLearnerSession: loadSessionMock,
}));
vi.mock("../src/features/offline-practice/offlinePracticeRepository", () => ({
  OfflinePracticeRepository: class FakeOfflinePracticeRepository {
    constructor() {
      return repositoryState;
    }
  },
}));
vi.mock(
  "../src/features/offline-practice/offlinePracticeDownloadService",
  () => ({
    OfflinePracticeDownloadService: class FakeOfflinePracticeDownloadService {
      constructor() {
        return downloadState;
      }
    },
    OfflinePracticeDownloadError: class OfflinePracticeDownloadError extends Error {},
  }),
);

import { OfflinePracticeHomePage } from "../src/features/offline-practice/OfflinePracticeHomePage";

const localRecord = {
  schemaVersion: 1,
  packId: "letters-foundations-v1",
  version: "2026.08.1",
  moduleKey: "letters",
  categoryKey: "letters" as const,
  title: "Letter Practice",
  totalBytes: 2048,
  manifestSha256: "a".repeat(64),
  installedAt: "2026-08-10T00:00:00Z",
  lastValidatedAt: "2026-08-10T00:00:00Z",
  status: "committed" as const,
};

const remoteEntry = {
  schemaVersion: 1 as const,
  packId: "letters-foundations-v1",
  version: "2026.08.2",
  moduleKey: "letters",
  categoryKey: "letters" as const,
  title: "Letter Practice",
  supportedLanguages: ["en" as const],
  totalBytes: 3072,
  manifestSha256: "b".repeat(64),
  updatedAt: "2026-08-10T00:00:00Z",
  status: "available" as const,
  manifestPath:
    "/api/learners/offline-practice/packs/letters-foundations-v1/manifest",
};

function renderPage(initialEntry = "/learner/offline") {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/learner/offline" element={<OfflinePracticeHomePage />} />
        <Route
          path="/learner/offline/category/:categoryKey"
          element={<OfflinePracticeHomePage />}
        />
        <Route path="/learner/login" element={<p>Login</p>} />
        <Route path="/learner/modes" element={<p>Learning modes</p>} />
        <Route path="/learner/dashboard" element={<p>Dashboard</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("OfflinePracticeHomePage", () => {
  beforeEach(() => {
    repositoryState.listCommittedPacks.mockResolvedValue([]);
    repositoryState.getActivePack.mockResolvedValue(null);
    repositoryState.deletePack.mockResolvedValue(undefined);
    repositoryState.deleteAll.mockResolvedValue(undefined);
    downloadState.listAvailablePacks.mockResolvedValue([]);
    downloadState.downloadPack.mockResolvedValue({ status: "committed" });
    loadSessionMock.mockReturnValue(null);
    connectivityMock.mockReturnValue({
      device: "offline",
      api: "unreachable",
      learnerSession: "signed_out",
      lastCheckedAt: null,
      refresh: vi.fn().mockResolvedValue(undefined),
    });
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  it("shows a friendly empty state without an API", async () => {
    renderPage();

    expect(
      await screen.findByRole("heading", { name: "No packs downloaded yet" }),
    ).toBeVisible();
    expect(screen.getByText(/sign in and open a category/i)).toBeVisible();
    for (const categoryTitle of [
      "Letters & Sounds",
      "Word Reading",
      "Phrase Reading",
      "Sentence Reading",
      "Passage Reading",
      "Reading Comprehension",
    ]) {
      expect(
        screen.getByRole("heading", { name: categoryTitle }),
      ).toBeVisible();
    }
    expect(screen.queryByText(/^Category [1-6]$/)).not.toBeInTheDocument();
  });

  it("keeps offline sign-in actions on Offline Practice when the device is offline", async () => {
    renderPage();

    await screen.findByRole("heading", { name: "No packs downloaded yet" });
    fireEvent.click(
      screen.getByRole("button", { name: "Sign in to download" }),
    );

    expect(screen.queryByText("Login")).not.toBeInTheDocument();
    expect(
      screen.getByText(/sign in needs an internet connection/i),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", { name: "Offline Downloads" }),
    ).toBeVisible();
  });

  it("returns to the learning mode chooser without replaying startup", async () => {
    renderPage();

    await screen.findByRole("heading", { name: "No packs downloaded yet" });
    fireEvent.click(screen.getByRole("button", { name: "Back" }));

    expect(await screen.findByText("Learning modes")).toBeVisible();
  });

  it("returns to the dashboard when opened from dashboard downloads", async () => {
    renderPage("/learner/offline?from=dashboard");

    await screen.findByRole("heading", { name: "No packs downloaded yet" });
    fireEvent.click(screen.getByRole("button", { name: "Back" }));

    expect(await screen.findByText("Dashboard")).toBeVisible();
  });

  it("shows a committed pack locally and deletes it without network access", async () => {
    repositoryState.listCommittedPacks.mockResolvedValue([localRecord]);
    repositoryState.getActivePack.mockResolvedValue({
      record: localRecord,
      pack: {},
    });
    renderPage();

    expect(await screen.findByText("1 of 1 downloaded")).toBeVisible();
    fireEvent.click(screen.getAllByRole("button", { name: "Open" })[0]);
    expect(await screen.findByText("Available offline")).toBeVisible();
    fireEvent.click(
      screen.getByRole("button", { name: "Delete Letter Practice download" }),
    );
    await waitFor(() =>
      expect(repositoryState.deletePack).toHaveBeenCalledWith(
        localRecord.packId,
      ),
    );
  });

  it("offers authenticated downloads when API reachability and session are valid", async () => {
    loadSessionMock.mockReturnValue({ token: "session-token" });
    connectivityMock.mockReturnValue({
      device: "online",
      api: "reachable",
      learnerSession: "present",
      lastCheckedAt: null,
      refresh: vi.fn().mockResolvedValue(undefined),
    });
    downloadState.listAvailablePacks.mockResolvedValue([remoteEntry]);
    renderPage();

    expect(await screen.findByText("0 of 1 downloaded")).toBeVisible();
    fireEvent.click(screen.getAllByRole("button", { name: "Open" })[0]);
    expect(await screen.findByText("Ready to download")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Download" }));
    await waitFor(() =>
      expect(downloadState.downloadPack).toHaveBeenCalledWith(remoteEntry, {
        token: "session-token",
      }),
    );
  });
});
