import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";

import { useButtonCommit } from "../../components/ui/useButtonCommit";
import { PixelIcon } from "../../components/ui/PixelIcon";
import type { LessonPracticeTries } from "./lessonApi";

interface LessonPracticeTriesToggleProps {
  practiceTries: LessonPracticeTries;
  disabled?: boolean;
}

export function LessonPracticeTriesToggle({
  practiceTries,
  disabled = false,
}: LessonPracticeTriesToggleProps) {
  const [open, setOpen] = useState(false);
  const dialogId = useId();
  const openCommit = useButtonCommit();

  useEffect(() => {
    if (!open) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);

    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);

  return (
    <>
      <button
        type="button"
        className="lesson-practice-tries-toggle"
        aria-label={`Practice tries, ${practiceTries.count}`}
        aria-expanded={open}
        aria-controls={dialogId}
        data-press-state={openCommit.committing ? "committing" : "idle"}
        disabled={disabled || openCommit.committing}
        onClick={() => openCommit.commit(() => setOpen(true))}
      >
        <PixelIcon name="replay" />
        {practiceTries.count > 0 ? (
          <strong aria-hidden="true">{practiceTries.count}</strong>
        ) : null}
      </button>

      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              className="lesson-practice-tries-backdrop"
              onMouseDown={() => setOpen(false)}
            >
              <section
                id={dialogId}
                className="lesson-practice-tries-dialog"
                role="dialog"
                aria-modal="true"
                aria-labelledby={`${dialogId}-title`}
                onMouseDown={(event) => event.stopPropagation()}
              >
                <header>
                  <div>
                    <p>Practice journal</p>
                    <h2 id={`${dialogId}-title`}>Practice tries</h2>
                  </div>
                  <button
                    type="button"
                    aria-label="Close practice tries"
                    onClick={() => setOpen(false)}
                  >
                    <PixelIcon name="close" />
                  </button>
                </header>

                <p className="lesson-practice-tries-dialog__note">
                  These tries do not lower your score.
                </p>

                {practiceTries.entries.length > 0 ? (
                  <ol className="lesson-practice-tries-list">
                    {practiceTries.entries.map((entry) => (
                      <li key={entry.attempt_id}>
                        <span>
                          Mission {entry.mission_number} · Item{" "}
                          {entry.item_order} · Try {entry.attempt_number}
                        </span>
                        <small>Ma&apos;am Clara heard</small>
                        <p>{entry.final_transcript}</p>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="lesson-practice-tries-empty">
                    No practice tries yet.
                  </p>
                )}
              </section>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
