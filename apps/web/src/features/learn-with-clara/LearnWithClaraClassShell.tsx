import type { ReactNode } from "react";

import { Surface } from "../../components/ui/Surface";
import { PixelIcon } from "../../components/ui/PixelIcon";
import "./learn-with-clara-letters.css";

interface LearnWithClaraClassShellProps {
  backLabel: string;
  className?: string;
  clara: ReactNode;
  coaching: ReactNode;
  eyebrow: ReactNode;
  lesson: ReactNode;
  onBack: () => void;
  progress?: ReactNode;
  teacherLabel?: string;
  title: ReactNode;
  titleId: string;
}

function joinClasses(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function BackIcon() {
  return <PixelIcon name="arrow-left" />;
}

export function LearnWithClaraClassShell({
  backLabel,
  className,
  clara,
  coaching,
  eyebrow,
  lesson,
  onBack,
  progress,
  teacherLabel = "Ma'am Clara guidance",
  title,
  titleId,
}: LearnWithClaraClassShellProps) {
  return (
    <main
      className={joinClasses(
        "letters-class",
        className,
        "learner-flow-page learner-typography-page",
      )}
      aria-labelledby={titleId}
      data-route-focus
      tabIndex={-1}
    >
      <div className="letters-class__shell">
        <Surface
          className="letters-class__header"
          kind="panel"
          padding="compact"
        >
          <button
            className="letters-class__back"
            type="button"
            aria-label={backLabel}
            onClick={onBack}
          >
            <BackIcon />
          </button>
          <div className="letters-class__header-copy">
            <p>{eyebrow}</p>
            <h1 id={titleId}>{title}</h1>
          </div>
          {progress}
        </Surface>

        <div className="letters-class__workspace">
          <Surface
            className="letters-class__teacher"
            kind="frame"
            padding="none"
            role="complementary"
            aria-label={teacherLabel}
          >
            <div className="letters-class__clara-wrap">{clara}</div>
            <div className="letters-class__coaching">{coaching}</div>
          </Surface>

          <Surface
            className="letters-class__lesson"
            kind="panel"
            padding="compact"
          >
            {lesson}
          </Surface>
        </div>
      </div>
    </main>
  );
}
