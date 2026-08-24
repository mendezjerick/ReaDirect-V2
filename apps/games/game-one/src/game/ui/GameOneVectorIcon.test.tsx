import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { GameOneVectorIcon } from "./GameOneVectorIcon";

describe("GameOneVectorIcon", () => {
  it("renders a decorative inline SVG without adding an accessibility stop", () => {
    const { container } = render(<GameOneVectorIcon name="play" />);
    const icon = container.querySelector("svg");

    expect(icon).toBeTruthy();
    expect(icon).toHaveAttribute("aria-hidden", "true");
    expect(icon).toHaveAttribute("viewBox", "0 0 24 24");
  });
});
