import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  validComprehensionPractice,
  validLetterPracticePack,
} from "./fixtures/offlinePracticeFixtures";

const repositoryState = vi.hoisted(() => ({
  getActivePack: vi.fn(),
  readPracticeSession: vi.fn(),
  writePracticeSession: vi.fn(),
  resolveLocalAsset: vi.fn(),
}));
const profileMock = vi.hoisted(() => vi.fn());
const loadSessionMock = vi.hoisted(() => vi.fn(() => null));

vi.mock("../src/features/offline-practice/offlinePracticeRepository", () => ({
  OfflinePracticeRepository: class FakeOfflinePracticeRepository {
    constructor() {
      return repositoryState;
    }
  },
}));
vi.mock("../src/features/offline-practice/offlinePracticeIdentity", () => ({
  resolveOfflinePracticeProfileId: profileMock,
}));
vi.mock("../src/features/learner-auth/learnerApi", () => ({
  loadLearnerSession: loadSessionMock,
}));
vi.mock("../src/features/clara-audio/claraSpeech", () => ({
  stopAllClaraSpeech: vi.fn(),
  playClaraAudioSource: vi.fn(),
}));

import { OfflinePracticeModulePage } from "../src/features/offline-practice/OfflinePracticeModulePage";

const localRecord = {
  schemaVersion: 1,
  packId: "letters-foundations-v1",
  version: "2026.08.1",
  moduleKey: "letters",
  title: "Letter Practice",
  totalBytes: 2048,
  manifestSha256: "a".repeat(64),
  installedAt: "2026-08-10T00:00:00Z",
  lastValidatedAt: "2026-08-10T00:00:00Z",
  status: "committed" as const,
};

function renderPage(pack = validLetterPracticePack) {
  repositoryState.getActivePack.mockResolvedValue({
    record: localRecord,
    pack,
  });
  return render(
    <MemoryRouter initialEntries={[`/learner/offline/${localRecord.packId}`]}>
      <Routes>
        <Route
          path="/learner/offline/:packId"
          element={<OfflinePracticeModulePage />}
        />
        <Route path="/learner/offline" element={<p>Offline Home</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("OfflinePracticeModulePage", () => {
  beforeEach(() => {
    window.localStorage.clear();
    repositoryState.readPracticeSession.mockResolvedValue(null);
    repositoryState.writePracticeSession.mockResolvedValue(undefined);
    repositoryState.resolveLocalAsset.mockResolvedValue({
      uri: "file:///data/offline-practice/audio.wav",
    });
    profileMock.mockResolvedValue("p-test-profile");
    loadSessionMock.mockReturnValue(null);
  });

  it("opens a committed pack without making a network request", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    renderPage();

    expect(
      await screen.findByRole("heading", { name: "Letter Practice" }),
    ).toBeVisible();
    expect(screen.getByText("F")).toBeVisible();
    expect(
      screen.getByText("Practice only — does not change lesson progress."),
    ).toBeVisible();
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("resumes the saved local position and completes comprehension as practice only", async () => {
    const pack = {
      ...validComprehensionPractice,
      manifest: {
        ...validComprehensionPractice.manifest,
        packId: "comprehension-foundations-v1",
      },
      content: {
        ...validComprehensionPractice.content,
        packId: "comprehension-foundations-v1",
        modules: validComprehensionPractice.content.modules.map((module) => ({
          ...module,
          items: [module.items[0]],
        })),
      },
    };
    repositoryState.getActivePack.mockResolvedValue({
      record: {
        ...localRecord,
        packId: "comprehension-foundations-v1",
        moduleKey: "letters",
      },
      pack,
    });
    renderPage(pack);

    expect(await screen.findByRole("button", { name: "F" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "F" }));
    expect(screen.getByRole("status")).toHaveTextContent(
      "The letter card shows F.",
    );
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    await waitFor(() =>
      expect(
        screen.getByRole("heading", {
          name: "You reached the end of this pack.",
        }),
      ).toBeVisible(),
    );
    expect(screen.queryByText(/score|passed|mastery/i)).not.toBeInTheDocument();
    expect(repositoryState.writePracticeSession).toHaveBeenCalled();
  });
});
