import { useNavigate } from "react-router-dom";

import { useButtonCommit } from "../../components/ui/useButtonCommit";

export function LearnerActivityHomeButton() {
  const navigate = useNavigate();
  const homeCommit = useButtonCommit();

  return (
    <button
      type="button"
      className="assessment-home-button"
      aria-label="Back to dashboard"
      title="Back to dashboard"
      data-press-state={homeCommit.committing ? "committing" : "idle"}
      disabled={homeCommit.committing}
      onClick={() =>
        homeCommit.commit(() => {
          navigate("/learner/dashboard");
        })
      }
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="m3.5 10.5 8.5-7 8.5 7" />
        <path d="M5.5 9.2V21h13V9.2" />
        <path d="M9.2 21v-6.4h5.6V21" />
      </svg>
    </button>
  );
}
