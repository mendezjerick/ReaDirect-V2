import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  GameLobbyPage,
  GameLobbySkeletonProvider,
} from "@readirect/game-lobby";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

function renderGuestRoute(initialEntries = ["/home", "/learner/games"]) {
  const profileClient = {
    loadGameProfile: vi.fn(async () => null),
    createGameProfile: vi.fn(async (username: string) => ({
      audience: "learner" as const,
      username,
      discriminator: "0001",
      publicHandle: `${username}#0001`,
      isActive: true,
    })),
  };

  return render(
    <MemoryRouter initialEntries={initialEntries} initialIndex={1}>
      <GameLobbySkeletonProvider profileClient={profileClient}>
        <Routes>
          <Route
            path="/learner/games"
            element={<GameLobbyPage guestUnavailable />}
          />
          <Route path="/learner/login" element={<h1>Learner login</h1>} />
          <Route path="/home" element={<h1>Home</h1>} />
        </Routes>
      </GameLobbySkeletonProvider>
    </MemoryRouter>,
  );
}

describe("public Guest game entry", () => {
  it("shows an immediate unavailable state without a fake profile or API call", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    renderGuestRoute();

    expect(
      screen.getByRole("heading", { name: "Currently unavailable" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Guest Mode is not available right now. Please sign in as a learner to continue.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Game username")).not.toBeInTheDocument();
    expect(screen.queryByText(/#\d{4}$/)).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(
      screen.getByRole("button", { name: "Go to Learner Login" }),
    ).toBeEnabled();
    expect(screen.getByRole("button", { name: "Back" })).toBeEnabled();
  });

  it("takes a Guest visitor to learner login", () => {
    renderGuestRoute();

    fireEvent.click(
      screen.getByRole("button", { name: "Go to Learner Login" }),
    );

    expect(
      screen.getByRole("heading", { name: "Learner login" }),
    ).toBeInTheDocument();
  });

  it("returns a Guest visitor to the previous safe page", () => {
    renderGuestRoute();

    fireEvent.click(screen.getByRole("button", { name: "Back" }));

    expect(screen.getByRole("heading", { name: "Home" })).toBeInTheDocument();
  });
});
