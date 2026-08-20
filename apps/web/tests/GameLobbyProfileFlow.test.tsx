import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import {
  GameLobbyPage,
  GameLobbySkeletonProvider,
  GameProfileRequestError,
  RequireSkeletonGameProfile,
  registeredGames,
} from "@readirect/game-lobby";

const serverProfile = {
  audience: "learner" as const,
  username: "ServerReader",
  discriminator: "4821",
  publicHandle: "ServerReader#4821",
  isActive: true,
};

function renderLobby(profileClient: {
  loadGameProfile: () => Promise<typeof serverProfile | null>;
  createGameProfile: (username: string) => Promise<typeof serverProfile>;
}) {
  return render(
    <MemoryRouter initialEntries={["/learner/games"]}>
      <GameLobbySkeletonProvider profileClient={profileClient}>
        <Routes>
          <Route path="/learner/games" element={<GameLobbyPage />} />
          <Route path="/learner/games/game-one" element={<h1>Game One</h1>} />
        </Routes>
      </GameLobbySkeletonProvider>
    </MemoryRouter>,
  );
}

describe("authoritative Games Lobby profile", () => {
  it("opens portal previews without requesting a persistent game profile", async () => {
    const client = {
      loadGameProfile: vi.fn(async () => {
        throw new Error("preview mode must not call the profile API");
      }),
      createGameProfile: vi.fn(),
    };

    render(
      <MemoryRouter initialEntries={["/learner/games"]}>
        <GameLobbySkeletonProvider profileClient={client}>
          <Routes>
            <Route
              path="/learner/games"
              element={<GameLobbyPage previewMode />}
            />
          </Routes>
        </GameLobbySkeletonProvider>
      </MemoryRouter>,
    );

    expect(
      await screen.findByRole("heading", { name: "Ready to play?" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Game preview mode")).toHaveTextContent(
      "Progress is not saved",
    );
    expect(client.loadGameProfile).not.toHaveBeenCalled();
    expect(client.createGameProfile).not.toHaveBeenCalled();
  });

  it("loads and displays the server-issued handle", async () => {
    const client = {
      loadGameProfile: vi.fn(async () => serverProfile),
      createGameProfile: vi.fn(async () => serverProfile),
    };

    renderLobby(client);

    expect(screen.getByRole("status")).toHaveTextContent(
      "Loading game profile...",
    );
    expect(await screen.findByText("ServerReader#4821")).toBeInTheDocument();
    expect(client.createGameProfile).not.toHaveBeenCalled();
  });

  it("shows creation only after an explicit null and uses the returned profile", async () => {
    const client = {
      loadGameProfile: vi.fn(async () => null),
      createGameProfile: vi.fn(async () => serverProfile),
    };

    renderLobby(client);
    const field = await screen.findByLabelText("Game username");
    fireEvent.change(field, { target: { value: "Reader7" } });
    fireEvent.click(screen.getByRole("button", { name: "Enter the Lobby" }));

    await waitFor(() =>
      expect(client.createGameProfile).toHaveBeenCalledWith("Reader7"),
    );
    expect(await screen.findByText("ServerReader#4821")).toBeInTheDocument();
    expect(screen.queryByText(/#\d{4}$/)).toHaveTextContent(
      "ServerReader#4821",
    );
  });

  it("surfaces a recoverable load error without showing the creation form", async () => {
    const client = {
      loadGameProfile: vi
        .fn()
        .mockRejectedValueOnce(new Error("temporary network failure"))
        .mockResolvedValueOnce(serverProfile),
      createGameProfile: vi.fn(),
    };

    renderLobby(client);
    expect(
      await screen.findByText("We couldn't load your game profile right now."),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Game username")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByText("ServerReader#4821")).toBeInTheDocument();
    expect(client.loadGameProfile).toHaveBeenCalledTimes(2);
  });

  it("adopts a concurrent profile after one create conflict refetch", async () => {
    const client = {
      loadGameProfile: vi
        .fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(serverProfile),
      createGameProfile: vi.fn(async () => {
        throw new GameProfileRequestError("already created", 409);
      }),
    };

    renderLobby(client);

    fireEvent.change(await screen.findByLabelText("Game username"), {
      target: { value: "Reader7" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Enter the Lobby" }));

    expect(await screen.findByText("ServerReader#4821")).toBeInTheDocument();
  });

  it("prevents duplicate create submits and surfaces safe server validation", async () => {
    let resolveCreate!: (profile: typeof serverProfile) => void;
    const client = {
      loadGameProfile: vi.fn(async () => null),
      createGameProfile: vi.fn(
        () =>
          new Promise<typeof serverProfile>((resolve) => {
            resolveCreate = resolve;
          }),
      ),
    };

    renderLobby(client);
    fireEvent.change(await screen.findByLabelText("Game username"), {
      target: { value: "Reader7" },
    });
    const submit = screen.getByRole("button", { name: "Enter the Lobby" });
    fireEvent.click(submit);
    fireEvent.click(submit);
    expect(client.createGameProfile).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Creating..." })).toBeDisabled();
    resolveCreate(serverProfile);
    expect(await screen.findByText("ServerReader#4821")).toBeInTheDocument();
  });

  it("waits for an authoritative profile before allowing a direct game route", async () => {
    let resolveProfile!: (profile: typeof serverProfile | null) => void;
    const client = {
      loadGameProfile: vi.fn(
        () =>
          new Promise<typeof serverProfile | null>((resolve) => {
            resolveProfile = resolve;
          }),
      ),
      createGameProfile: vi.fn(async () => serverProfile),
    };

    render(
      <MemoryRouter initialEntries={["/learner/games/game-one"]}>
        <GameLobbySkeletonProvider profileClient={client}>
          <Routes>
            <Route
              path="/learner/games/game-one"
              element={
                <RequireSkeletonGameProfile>
                  <h1>Game One</h1>
                </RequireSkeletonGameProfile>
              }
            />
            <Route path="/learner/games" element={<GameLobbyPage />} />
          </Routes>
        </GameLobbySkeletonProvider>
      </MemoryRouter>,
    );

    expect(screen.getByRole("status")).toHaveTextContent(
      "Loading game profile...",
    );
    resolveProfile(null);
    expect(await screen.findByLabelText("Game username")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Game username"), {
      target: { value: "Reader7" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Enter the Lobby" }));
    expect(
      await screen.findByRole("heading", { name: "Game One" }),
    ).toBeInTheDocument();
  });

  it("re-evaluates a session-aware preview bypass after account changes", async () => {
    let preview = false;
    const client = {
      loadGameProfile: vi.fn(
        () => new Promise<typeof serverProfile | null>(() => undefined),
      ),
      createGameProfile: vi.fn(async () => serverProfile),
    };

    render(
      <MemoryRouter initialEntries={["/learner/games/game-one"]}>
        <GameLobbySkeletonProvider profileClient={client}>
          <Routes>
            <Route
              path="/learner/games/game-one"
              element={
                <RequireSkeletonGameProfile bypass={() => preview}>
                  <h1>Preview game</h1>
                </RequireSkeletonGameProfile>
              }
            />
          </Routes>
        </GameLobbySkeletonProvider>
      </MemoryRouter>,
    );

    expect(screen.getByRole("status")).toHaveTextContent(
      "Loading game profile...",
    );
    preview = true;
    window.dispatchEvent(new Event("readirect:learner-session-changed"));
    expect(
      await screen.findByRole("heading", { name: "Preview game" }),
    ).toBeInTheDocument();
    expect(client.loadGameProfile).toHaveBeenCalledOnce();
  });

  it("keeps the registry limited to the three playable games", () => {
    expect(registeredGames.map((game) => [game.key, game.route])).toEqual([
      ["game-alpha", "/learner/games/game-alpha"],
      ["chronicles-of-the-lost-kingdom", "/learner/games/game-one"],
      ["ottertale", "/learner/games/game-two"],
    ]);
    expect(
      registeredGames.some((game) => game.route.includes("game-zero")),
    ).toBe(false);
  });
});
