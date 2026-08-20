import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GameOneRoutePage, type GameOneHostAdapter } from "@readirect/game-one";

const kaplayController = vi.hoisted(() => ({
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
}));

vi.mock("../../games/game-one/src/game/kaplay/createKaplayGame", () => ({
  createKaplayGame: () => ({
    canvas: document.createElement("canvas"),
    ...kaplayController,
  }),
}));

beforeEach(() => {
  window.localStorage.setItem(
    "readirect-rpg:language-preference:v1:anonymous",
    JSON.stringify({ version: 1, language: "en" }),
  );
  document.body.style.overflow = "auto";
  for (const mock of Object.values(kaplayController)) {
    mock.mockClear();
  }
});

describe("Game One route boundary", () => {
  it("flushes learner progress and tears down the runtime before returning to the lobby", async () => {
    const save = vi.fn<GameOneHostAdapter["save"]>(async (request) => ({
      checkpointKey: request.checkpointKey,
      saveSchemaVersion: request.saveSchemaVersion,
      state: request.state,
      revision: request.expectedRevision + 1,
      savedAt: "2026-07-26T12:00:00+00:00",
    }));
    const host: GameOneHostAdapter = {
      load: vi.fn(async () => null),
      save,
      newGame: vi.fn(async () => undefined),
      profile: null,
    };

    render(
      <MemoryRouter initialEntries={["/learner/games/game-one"]}>
        <Routes>
          <Route
            path="/learner/games/game-one"
            element={<GameOneRoutePage host={host} />}
          />
          <Route
            path="/learner/games"
            element={<main>Verified lobby destination</main>}
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(
      await screen.findByRole("heading", {
        name: /Chronicles of the Lost Kingdom/,
      }),
    ).toBeVisible();
    await waitFor(() => expect(document.body.style.overflow).toBe("hidden"));

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

    expect(await screen.findByText("Verified lobby destination")).toBeVisible();
    expect(save).toHaveBeenCalledTimes(1);
    expect(kaplayController.destroy).toHaveBeenCalledTimes(1);
    expect(document.body.style.overflow).toBe("auto");
  }, 15_000);
});
