import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { LearnerActivityResult } from "../src/features/learner-activity/LearnerActivityResult";

const segment = (key: string) => ({
  key,
  label: key,
  value: "5/5",
  status: "Complete",
});

describe("LearnerActivityResult", () => {
  it("centers a single mission card", () => {
    render(
      <LearnerActivityResult
        ariaLabel="One mission"
        segments={[segment("Phrases")]}
        score={5}
        maximum={5}
        level="Phrase Pro"
      />,
    );

    expect(screen.getByLabelText("One mission")).toHaveClass(
      "assessment-result__segments--centered-single",
    );
  });

  it("centers a two-segment mission pair", () => {
    render(
      <LearnerActivityResult
        ariaLabel="Two missions"
        segments={[segment("Words"), segment("Words in sentences")]}
        score={10}
        maximum={10}
        level="Word Wizard"
      />,
    );

    expect(screen.getByLabelText("Two missions")).toHaveClass(
      "assessment-result__segments--centered-pair",
    );
  });

  it("retains the standard grid for three segments", () => {
    render(
      <LearnerActivityResult
        ariaLabel="Three missions"
        segments={[
          segment("Letters"),
          segment("First letters"),
          segment("Missing letters"),
        ]}
        score={15}
        maximum={15}
        level="Letter Leader"
      />,
    );

    expect(screen.getByLabelText("Three missions")).not.toHaveClass(
      "assessment-result__segments--centered-pair",
    );
  });
});
