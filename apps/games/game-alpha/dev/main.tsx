import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";

import { GameAlphaRoutePage } from "../src/GameAlphaRoutePage";
import type { GameAlphaHostAdapter } from "../src/host/GameAlphaHostAdapter";
import "./preview.css";

const root = document.getElementById("root");
if (!root) throw new Error("Game Alpha preview root is missing.");

const previewHost: GameAlphaHostAdapter = {
  profile: {
    audience: "learner",
    username: "preview",
    discriminator: "0000",
    publicHandle: "Preview",
    isActive: true,
  },
  async load() {
    return null;
  },
  async save(request) {
    return {
      checkpointKey: request.checkpointKey,
      saveSchemaVersion: request.saveSchemaVersion,
      state: request.state,
      revision: request.expectedRevision + 1,
      savedAt: new Date().toISOString(),
    };
  },
  async newGame() {},
};

createRoot(root).render(
  <StrictMode>
    <div className="game-alpha-preview">
      <MemoryRouter initialEntries={["/learner/games/game-alpha"]}>
        <GameAlphaRoutePage host={previewHost} />
      </MemoryRouter>
    </div>
  </StrictMode>,
);
