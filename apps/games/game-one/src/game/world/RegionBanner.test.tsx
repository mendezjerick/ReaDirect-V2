import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RegionBanner } from "./RegionBanner";

describe("RegionBanner", () => {
  it("announces the region with a matching retro location code", () => {
    render(<RegionBanner regionId="farm" language="en" />);

    const banner = screen.getByRole("status");
    expect(banner).toHaveAttribute("data-region", "farm");
    expect(banner).toHaveTextContent("Entering");
    expect(banner).toHaveTextContent("Farm Woodland");
    expect(screen.getByText("FM")).toBeVisible();
  });

  it("uses the Filipino entry label", () => {
    render(<RegionBanner regionId="river" language="fil" />);

    expect(screen.getByRole("status")).toHaveTextContent("Pumasok sa");
    expect(screen.getByRole("status")).toHaveTextContent("Ilog");
  });
});
