import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";

import { GameAlphaRoutePage } from "../src/GameAlphaRoutePage";
import "./preview.css";

const root = document.getElementById("root");
if (!root) throw new Error("Game Alpha preview root is missing.");

createRoot(root).render(
  <StrictMode>
    <div className="game-alpha-preview">
      <MemoryRouter initialEntries={["/learner/games/game-alpha"]}>
        <GameAlphaRoutePage />
      </MemoryRouter>
    </div>
  </StrictMode>,
);
