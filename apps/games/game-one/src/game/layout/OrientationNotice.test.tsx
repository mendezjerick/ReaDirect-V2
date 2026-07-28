import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { OrientationNotice } from "./OrientationNotice";

describe("OrientationNotice", () => {
  it("keeps its leave action distinct from the canonical Exit control", () => {
    render(
      <OrientationNotice
        hidden={false}
        language="en"
        portrait
        onContinue={vi.fn()}
        onExit={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Leave Game" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Exit" })).toBeNull();
  });
});
