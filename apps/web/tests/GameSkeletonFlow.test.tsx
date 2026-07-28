import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  GameLobbyPage,
  GameLobbySkeletonProvider,
  RequireSkeletonGameProfile,
} from "@readirect/game-lobby";
import { GameZeroRoutePage } from "@readirect/game-zero";
import { GameTwoRoutePage } from "@readirect/game-two";
import { GameOneHostPage } from "../src/features/game-one/GameOneHostPage";

vi.mock(
  "../../games/game-one/src/game/kaplay/createKaplayGame",
  () => ({
    createKaplayGame: () => ({
      canvas: document.createElement("canvas"),
      pause: vi.fn(),
      resume: vi.fn(),
      setTouchDirection: vi.fn(),
      setAnalogVector: vi.fn(),
      interact: vi.fn(() => false),
      setFishingInteraction: vi.fn(),
      setMissionState: vi.fn(),
      resetMission: vi.fn(),
      clearInput: vi.fn(),
      destroy: vi.fn(),
    }),
  }),
);

const learnerSession = {
  token: "game-one-route-token",
  learner: {
    id: 10,
    learner_code: "GA001",
    full_name: "Game Route Learner",
    first_name: "Game",
    account_purpose: "standard",
    school: null,
    grade_level: 3,
    section: "A",
    progress: {
      stage: "before_diagnostic",
      current_required_lesson_order: null,
    },
    achievement_keys: [],
  },
  session: { expires_at: "2026-07-27T00:00:00+00:00" },
};

const portalLearnerSession = {
  ...learnerSession,
  token: "game-one-preview-token",
  learner: {
    ...learnerSession.learner,
    learner_code: "KW000",
    account_purpose: "portal_system",
  },
};

const fetchMock = vi.fn(
  async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (
      url.endsWith(
        "/api/learners/games/chronicles-of-the-lost-kingdom/save",
      )
    ) {
      if ((init?.method ?? "GET") === "PUT") {
        const request = JSON.parse(String(init?.body)) as {
          checkpoint_key: string;
          save_schema_version: number;
          state: Record<string, unknown>;
          expected_revision: number;
        };
        return Response.json({
          game_key: "chronicles-of-the-lost-kingdom",
          save: {
            checkpoint_key: request.checkpoint_key,
            save_schema_version: request.save_schema_version,
            state: request.state,
            revision: request.expected_revision + 1,
            saved_at: "2026-07-26T12:00:00+00:00",
          },
        });
      }

      return Response.json({
        game_key: "chronicles-of-the-lost-kingdom",
        save: null,
      });
    }

    throw new Error(`Unexpected Game One request: ${url}`);
  },
);

beforeEach(() => {
  window.sessionStorage.setItem(
    "readirect.learner-session",
    JSON.stringify(learnerSession),
  );
  window.localStorage.setItem(
    "readirect-rpg:language-preference:v1:anonymous",
    JSON.stringify({ version: 1, language: "en" }),
  );
  fetchMock.mockClear();
  vi.stubGlobal("fetch", fetchMock);
});

function renderGameRoutes(initialRoute = "/learner/games") {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <GameLobbySkeletonProvider>
        <Routes>
          <Route path="/learner/games" element={<GameLobbyPage />} />
          <Route
            path="/learner/games/game-zero"
            element={
              <RequireSkeletonGameProfile>
                <GameZeroRoutePage />
              </RequireSkeletonGameProfile>
            }
          />
          <Route
            path="/learner/games/game-one"
            element={
              <RequireSkeletonGameProfile>
                <GameOneHostPage />
              </RequireSkeletonGameProfile>
            }
          />
          <Route
            path="/learner/games/game-two"
            element={
              <RequireSkeletonGameProfile>
                <GameTwoRoutePage />
              </RequireSkeletonGameProfile>
            }
          />
          <Route
            path="/learner/dashboard"
            element={<div>Learner dashboard route</div>}
          />
        </Routes>
      </GameLobbySkeletonProvider>
    </MemoryRouter>,
  );
}

function createUsername(username = "Reader7") {
  fireEvent.change(screen.getByLabelText("Game username"), {
    target: { value: username },
  });
  fireEvent.click(screen.getByRole("button", { name: "Enter the Lobby" }));
}

describe("authenticated game lobby route flow", () => {
  it("lists Game Zero first and opens its reserved route", async () => {
    renderGameRoutes();
    createUsername();

    const gameButtons = await screen.findAllByRole("button", {
      name: /^Open Game/,
    });
    expect(
      gameButtons.map((button) => button.getAttribute("aria-label")),
    ).toEqual(["Open Game Zero", "Open Game One", "Open Game Two"]);

    fireEvent.click(gameButtons[0]);
    expect(
      await screen.findByRole("heading", { name: "Game Zero" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Back to Lobby" }));
    expect(
      await screen.findByRole("heading", { name: "Ready to play?" }),
    ).toBeInTheDocument();
  });

  it("requires a lobby profile when Game One is opened directly", async () => {
    renderGameRoutes("/learner/games/game-one");

    expect(
      await screen.findByRole("heading", { name: "Pick a game name" }),
    ).toBeInTheDocument();

    createUsername();

    expect(
      await screen.findByRole("heading", {
        name: /Chronicles of the Lost Kingdom/,
      }),
    ).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/learners/games/chronicles-of-the-lost-kingdom/save",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer game-one-route-token",
        }),
      }),
    );
  });

  it("completes the dashboard-lobby-game-lobby loop and saves before exit", async () => {
    renderGameRoutes();

    expect(screen.getByRole("main")).toHaveClass("learner-flow-page");
    createUsername("No spaces");
    expect(
      screen.getByText("Use 3 to 10 letters and numbers only."),
    ).toBeInTheDocument();

    createUsername();
    expect(await screen.findByText(/^Reader7#\d{4}$/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Open Game Zero" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Open Game One" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Open Game Two" }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Open Game One" }));
    expect(
      await screen.findByRole("heading", {
        name: /Chronicles of the Lost Kingdom/,
      }),
    ).toBeInTheDocument();

    fireEvent.click(
      await screen.findByRole("button", { name: "Skip Tutorial" }),
    );
    const skipDialog = await screen.findByRole("alertdialog", {
      name: "Skip the tutorial?",
    });
    fireEvent.click(
      within(skipDialog).getByRole("button", { name: "Skip Tutorial" }),
    );

    const exitButton = screen.getByRole("button", { name: "Exit" });
    await waitFor(() => expect(exitButton).toBeEnabled());
    fireEvent.click(exitButton);
    const exitDialog = await screen.findByRole("dialog", {
      name: "Exit the minigame?",
    });
    fireEvent.click(
      within(exitDialog).getByRole("button", { name: "Exit to Lobby" }),
    );

    expect(await screen.findByText(/^Reader7#\d{4}$/)).toBeInTheDocument();
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/learners/games/chronicles-of-the-lost-kingdom/save",
        expect.objectContaining({
          method: "PUT",
        }),
      ),
    );

    fireEvent.click(screen.getByRole("button", { name: "Back to Dashboard" }));
    expect(screen.getByText("Learner dashboard route")).toBeInTheDocument();
  });

  it("runs portal previews without reading or writing persistent game data", async () => {
    window.sessionStorage.setItem(
      "readirect.learner-session",
      JSON.stringify(portalLearnerSession),
    );
    renderGameRoutes("/learner/games/game-one");

    createUsername();

    expect(
      await screen.findByRole("heading", {
        name: /Chronicles of the Lost Kingdom/,
      }),
    ).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
