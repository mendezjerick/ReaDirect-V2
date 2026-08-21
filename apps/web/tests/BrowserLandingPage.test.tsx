import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import { BrowserLandingPage } from "../src/features/landing/BrowserLandingPage";

function renderLanding(initialEntries = ["/landing"]) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route path="/landing" element={<BrowserLandingPage />} />
        <Route path="/learner/login" element={<p>Learner login route</p>} />
        <Route path="/home" element={<p>Browser home route</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("BrowserLandingPage", () => {
  it("renders the landing sections and primary actions", () => {
    renderLanding();

    expect(
      screen.getByRole("heading", { name: /clearer path/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /patient place to practise/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /moments that matter/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /ready to take the next step/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /try readirect offline/i }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /about/i })[0]).toHaveAttribute(
      "href",
      "#about",
    );
    expect(
      screen.getAllByRole("link", { name: /contact/i })[0],
    ).toHaveAttribute("href", "#contact");
    expect(
      screen.getAllByRole("link", { name: /use in browser/i }).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText(/download on play store/i).length,
    ).toBeGreaterThan(1);
    expect(screen.getAllByText(/coming soon/i).length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: "Documentation" })).toHaveAttribute(
      "href",
      "/docs",
    );
    expect(
      screen.getByRole("progressbar", { name: /page reading progress/i }),
    ).toHaveAttribute("aria-valuenow", "0");
    expect(
      screen.queryByRole("link", { name: /back to top/i }),
    ).not.toBeInTheDocument();
  });

  it("opens the root Tap to Continue entry in a new tab", () => {
    renderLanding();

    const joinLinks = screen.getAllByRole("link", { name: /join/i });
    const browserLinks = screen.getAllByRole("link", {
      name: /use in browser/i,
    });

    [...joinLinks, ...browserLinks].forEach((link) => {
      expect(link).toHaveAttribute("href", "/?entry=tap");
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noreferrer");
    });
  });

  it("updates the accessible scroll progress indicator", () => {
    vi.spyOn(document.documentElement, "scrollHeight", "get").mockReturnValue(
      1200,
    );
    vi.spyOn(window, "innerHeight", "get").mockReturnValue(800);
    vi.spyOn(window, "scrollY", "get").mockReturnValue(200);
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      callback(0);
      return 0;
    });
    renderLanding();

    act(() => {
      fireEvent.scroll(window);
    });

    expect(
      screen.getByRole("progressbar", { name: /page reading progress/i }),
    ).toHaveAttribute("aria-valuenow", "50");
  });
});
