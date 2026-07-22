import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { BigButton } from "../src/components/ui/BigButton";

describe("BigButton", () => {
  it("uses the shared primary pushable treatment by default", () => {
    render(<BigButton>Continue</BigButton>);

    expect(screen.getByRole("button", { name: "Continue" })).toHaveClass(
      "big-button",
      "big-button--primary",
      "big-button--large",
    );
  });

  it("holds and disables the control during its commit state", () => {
    render(<BigButton committing>Continue</BigButton>);

    const button = screen.getByRole("button", { name: "Continue" });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("data-press-state", "committing");
  });

  it("makes the fixed unavailable variant non-interactive", () => {
    render(<BigButton variant="unavailable">Continue</BigButton>);

    const button = screen.getByRole("button", { name: "Continue" });
    expect(button).toBeDisabled();
    expect(button).toHaveClass("big-button--unavailable");
    expect(button).not.toHaveClass("big-button--primary");
  });

  it("supports the tall shared primary action variant", () => {
    render(<BigButton variant="primary-vertical">Submit</BigButton>);

    const button = screen.getByRole("button", { name: "Submit" });
    expect(button).toBeEnabled();
    expect(button).toHaveClass("big-button--primary-vertical");
  });

  it("supports the fixed-color vertical skip action variant", () => {
    render(<BigButton variant="skip-vertical">Skip</BigButton>);

    const button = screen.getByRole("button", { name: "Skip" });
    expect(button).toBeEnabled();
    expect(button).toHaveClass("big-button--skip-vertical");
  });
});
