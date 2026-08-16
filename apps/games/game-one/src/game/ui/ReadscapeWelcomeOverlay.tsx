type WelcomePhase = "visible" | "leaving" | "hidden";

export function ReadscapeWelcomeOverlay({
  phase,
  onDismiss
}: {
  phase: WelcomePhase;
  onDismiss: () => void;
}) {
  if (phase === "hidden") return null;

  return (
    <div className="readscape-welcome" data-state={phase}>
      <section className="readscape-welcome__panel" role="dialog" aria-modal="true" aria-labelledby="readscape-welcome-title">
        <button type="button" className="readscape-welcome__skip" onClick={onDismiss}>
          Skip
        </button>
        <span className="readscape-welcome__spark readscape-welcome__spark--one" aria-hidden="true" />
        <span className="readscape-welcome__spark readscape-welcome__spark--two" aria-hidden="true" />
        <span className="readscape-welcome__emblem" aria-hidden="true">BOOK</span>
        <p className="readscape-welcome__eyebrow">Welcome to</p>
        <h1 id="readscape-welcome-title">Readscape</h1>
        <p className="readscape-welcome__tagline">Read. Explore. Answer.</p>
      </section>
    </div>
  );
}
