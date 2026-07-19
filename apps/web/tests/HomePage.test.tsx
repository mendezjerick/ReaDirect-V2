import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { HomePage } from "../src/features/home/HomePage";

describe("HomePage", () => {
  it("keeps the home hierarchy to one primary and one quiet action", () => {
    render(<HomePage />);

    const actions = screen.getByRole("region", { name: "Home actions" });
    const buttons = within(actions).getAllByRole("button");

    expect(buttons).toHaveLength(2);
    expect(
      within(actions).getByRole("button", { name: "Let's Read!" }),
    ).toHaveClass("home-page__read-button");
    expect(
      within(actions).getByRole("button", { name: "Staff login" }),
    ).toHaveClass("home-page__staff-button");
    expect(within(actions).queryByRole("link")).not.toBeInTheDocument();
  });
});
