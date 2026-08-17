import { useNavigate } from "react-router-dom";

import { useButtonCommit } from "../../components/ui/useButtonCommit";

function HomeButtonControl({
  onHome,
  label,
}: {
  onHome: () => void;
  label: string;
}) {
  const homeCommit = useButtonCommit();

  return (
    <button
      type="button"
      className="assessment-home-button"
      aria-label={label}
      title={label}
      data-press-state={homeCommit.committing ? "committing" : "idle"}
      disabled={homeCommit.committing}
      onClick={() => homeCommit.commit(onHome)}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="m3.5 10.5 8.5-7 8.5 7" />
        <path d="M5.5 9.2V21h13V9.2" />
        <path d="M9.2 21v-6.4h5.6V21" />
      </svg>
    </button>
  );
}

function RoutedHomeButton() {
  const navigate = useNavigate();
  return (
    <HomeButtonControl
      onHome={() => navigate("/learner/dashboard")}
      label="Back to dashboard"
    />
  );
}

export function LearnerActivityHomeButton({
  onHome,
  label = "Back to dashboard",
}: {
  onHome?: () => void;
  label?: string;
} = {}) {
  return onHome ? (
    <HomeButtonControl onHome={onHome} label={label} />
  ) : (
    <RoutedHomeButton />
  );
}
