import { useNavigate } from "react-router-dom";

import { OttertaleGame } from "./OttertaleGame";
import "./styles/game-two.css";

export function GameTwoRoutePage() {
  const navigate = useNavigate();

  return (
    <main className="game-two learner-flow-page" aria-label="OtterTale Game Two" data-route-focus tabIndex={-1}>
      <button className="game-two__lobby-link" type="button" onClick={() => navigate("/learner/games")}>
        Back to game lobby
      </button>
      <OttertaleGame onExitToLobby={() => navigate("/learner/games")} />
    </main>
  );
}
