import { readFileSync, readdirSync } from "node:fs";
import { extname, join, resolve } from "node:path";

import { describe, expect, it } from "vitest";

const expectedLearnerRoutes = [
  "/learner/assessment/complete",
  "/learner/assessment/part-one",
  "/learner/assessment/part-two",
  "/learner/dashboard",
  "/learner/final-assessment/complete",
  "/learner/final-assessment/part-one",
  "/learner/final-assessment/part-two",
  "/learner/games",
  "/learner/games/game-alpha",
  "/learner/games/game-zero",
  "/learner/games/game-one",
  "/learner/games/game-two",
  "/learner/learn-with-clara",
  "/learner/learn-with-clara/letters",
  "/learner/lesson-intro",
  "/learner/lessons/1",
  "/learner/lessons/2",
  "/learner/lessons/3",
  "/learner/lessons/4",
  "/learner/lessons/5",
  "/learner/lessons/6",
  "/learner/login",
  "/learner/offline",
  "/learner/offline/:packId",
].sort();

const learnerFeatureDirectories = [
  "assessment",
  "clara-audio",
  "home",
  "intro",
  "learn-with-clara",
  "learner-activity",
  "learner-auth",
  "learner-dashboard",
  "offline-practice",
  "lesson",
  "lesson-intro",
  "theme",
];

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);

    if (entry.isDirectory()) {
      return sourceFiles(path);
    }

    return [".ts", ".tsx"].includes(extname(entry.name)) ? [path] : [];
  });
}

describe("learner-flow boundary", () => {
  it("preserves the first-successful-build learner route contract", () => {
    const appSource = readFileSync(
      resolve(process.cwd(), "src/App.tsx"),
      "utf8",
    );
    const learnerRoutes = Array.from(
      appSource.matchAll(/path="(\/learner\/[^"]+)"/g),
      (match) => match[1],
    ).sort();

    expect(learnerRoutes).toEqual(expectedLearnerRoutes);
  });

  it("keeps staff dashboard and authentication code out of learner features", () => {
    const featuresRoot = resolve(process.cwd(), "src/features");
    const violations = learnerFeatureDirectories.flatMap((feature) =>
      sourceFiles(join(featuresRoot, feature)).flatMap((file) => {
        const source = readFileSync(file, "utf8");
        const importsStaffCode =
          /(?:components\/staff|staff-(?:auth|dashboard)|\/api\/staff\/)/.test(
            source,
          );

        return importsStaffCode ? [file.replace(`${process.cwd()}\\`, "")] : [];
      }),
    );

    expect(violations).toEqual([]);
  });
});
