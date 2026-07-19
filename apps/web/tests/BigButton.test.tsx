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
});
