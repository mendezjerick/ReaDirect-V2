import type { LearnerReadingPath } from "../learner-auth/learnerApi";

export function readingPathStageLabel(path: LearnerReadingPath): string {
  if (path.diagnostic.status === "required") {
    return "Diagnostic Assessment not started";
  }

  if (path.diagnostic.status === "in_progress") {
    return "Diagnostic Assessment in progress";
  }

  if (path.final_assessment.status === "completed") {
    return "Reading Journey complete";
  }

  if (path.final_assessment.status === "in_progress") {
    return "Final Assessment in progress";
  }

  if (path.final_assessment.status === "available") {
    return "Final Assessment ready";
  }

  return `Reading lessons · ${path.completed_lesson_count} of 6 complete`;
}

export function readingPathSummary(path: LearnerReadingPath): string {
  const diagnostic =
    path.diagnostic.status === "skipped"
      ? "Diagnostic skipped · Score 0"
      : path.diagnostic.status === "completed"
        ? `Diagnostic completed · Score ${path.diagnostic.score ?? "—"}`
        : path.diagnostic.status === "in_progress"
          ? "Diagnostic in progress"
          : "Diagnostic pending";

  return `${diagnostic} · ${path.completed_lesson_count}/6 lessons`;
}
