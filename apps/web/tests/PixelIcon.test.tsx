import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PixelIcon } from "../src/components/ui/PixelIcon";

describe("PixelIcon", () => {
  it("renders a theme-aware decorative pixel vector without layout text", () => {
    const { container } = render(<PixelIcon name="microphone" />);
    const icon = container.querySelector("svg");

    expect(icon).toHaveAttribute("aria-hidden", "true");
    expect(icon).toHaveAttribute("data-pixel-icon", "microphone");
    expect(icon).toHaveAttribute("shape-rendering", "crispEdges");
    expect(icon?.getAttribute("style")).toContain("fill: currentcolor");
    expect(icon?.getAttribute("style")).toContain("stroke: none");
  });
});
