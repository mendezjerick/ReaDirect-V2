import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const featureRoot = resolve(process.cwd(), "src/features/offline-practice");

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx)$/.test(entry.name) ? [path] : [];
  });
}

describe("Offline Practice academic boundary", () => {
  it("contains no prohibited imports or academic integration references", () => {
    const prohibitedReferences = [
      /features[\\/]assessment/i,
      /assessmentApi/i,
      /LearnerAssessmentCompletionService/i,
      /LearnerLessonCompletionService/i,
      /\b(?:mu|nu)\b/i,
      /\bASR\b/i,
      /SpeechEquivalenceResolver/i,
      /lesson_runs?/i,
      /assessment_runs?/i,
      /lesson\s+completion/i,
      /\/api\/learners\/(?:assessments|lessons)/i,
    ];

    const violations = sourceFiles(featureRoot).flatMap((path) => {
      const source = readFileSync(path, "utf8");
      return prohibitedReferences
        .filter((pattern) => pattern.test(source))
        .map((pattern) => `${path}: ${pattern}`);
    });

    expect(violations).toEqual([]);
  });
});
