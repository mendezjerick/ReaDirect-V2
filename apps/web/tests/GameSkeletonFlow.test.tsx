import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";

import {
  GameLobbyPage,
  GameLobbySkeletonProvider,
  RequireSkeletonGameProfile,
} from "@readirect/game-lobby";
import { GameOneRoutePage } from "@readirect/game-one";
import { GameTwoRoutePage } from "@readirect/game-two";

function renderGameRoutes(initialRoute = "/learner/games") {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <GameLobbySkeletonProvider>
        <Routes>
          <Route path="/learner/games" element={<GameLobbyPage />} />
          <Route
            path="/learner/games/game-one"
            element={
              <RequireSkeletonGameProfile>
                <GameOneRoutePage />
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

describe("game skeleton route flow", () => {
  it("requires a game username when a game route is opened directly", async () => {
    renderGameRoutes("/learner/games/game-one");

    expect(
      await screen.findByRole("heading", { name: "Pick a game name" }),
    ).toBeInTheDocument();

    createUsername();

    expect(
      await screen.findByRole("heading", { name: "Game One" }),
    ).toBeInTheDocument();
  });

  it("validates the shared username and completes the dashboard-lobby-game loop", async () => {
    renderGameRoutes();

    expect(screen.getByRole("main")).toHaveClass("learner-flow-page");
    createUsername("No spaces");
    expect(
      screen.getByText("Use 3 to 10 letters and numbers only."),
    ).toBeInTheDocument();

    createUsername();
    expect(await screen.findByText(/^Reader7#\d{4}$/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Open Game One" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Open Game Two" }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Open Game One" }));
    expect(
      await screen.findByRole("heading", { name: "Game One" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("main")).toHaveClass("learner-flow-page");

    fireEvent.click(screen.getByRole("button", { name: "Play Demo" }));
    expect(screen.getByLabelText("Game canvas area")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Back to Lobby" }));
    expect(await screen.findByText(/^Reader7#\d{4}$/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Back to Dashboard" }));
    expect(screen.getByText("Learner dashboard route")).toBeInTheDocument();
  });
});
