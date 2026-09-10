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
    const apkLink = screen.getByRole("link", { name: "Download APK" });
    expect(apkLink).toHaveAttribute(
      "href",
      "https://github.com/mendezjerick/ReaDirect-Downloads/releases/download/v1.0.7/ReaDirect.apk",
    );
    expect(apkLink).toHaveClass("landing-button--mist");
    expect(apkLink).toHaveAttribute("target", "_blank");
    expect(apkLink).toHaveAttribute("rel", "noreferrer");
    const offlineApkLink = screen.getByRole("link", {
      name: "Download Offline APK",
    });
    expect(offlineApkLink).toHaveAttribute(
      "href",
      "https://github.com/mendezjerick/ReaDirect-Downloads/releases/latest/download/ReaDirect-Offline.apk",
    );
    expect(offlineApkLink).toHaveClass("browser-landing__offline-note");
    expect(offlineApkLink).toHaveAttribute("target", "_blank");
    expect(offlineApkLink).toHaveAttribute("rel", "noreferrer");
    expect(
      screen.queryByRole("link", { name: /use in browser/i }),
    ).not.toBeInTheDocument();
    const playStoreLinks = screen.getAllByRole("link", {
      name: "Download on Play Store",
    });
    expect(playStoreLinks.length).toBeGreaterThan(1);
    playStoreLinks.forEach((link) => {
      expect(link).toHaveAttribute(
        "href",
        "https://play.google.com/store/apps/details?id=com.readirect.app",
      );
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noreferrer");
    });
    expect(screen.getAllByTestId("play-store-icon")).toHaveLength(
      playStoreLinks.length,
    );
    expect(screen.getByRole("link", { name: "Documentation" })).toHaveAttribute(
      "href",
      "/docs",
    );
    expect(
      screen.getByRole("link", { name: "Credits & licenses" }),
    ).toHaveAttribute("href", "/credits-licenses?returnTo=/landing");
    expect(
      screen.getByRole("progressbar", { name: /page reading progress/i }),
    ).toHaveAttribute("aria-valuenow", "0");
  });

  it("opens the root Tap to Continue entry in a new tab", () => {
    renderLanding();

    const joinLinks = screen.getAllByRole("link", { name: /join/i });
    joinLinks.forEach((link) => {
      expect(link).toHaveAttribute("href", "/?entry=tap");
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noreferrer");
    });
  });

  it("renders the supplied low-poly artwork in its labeled landing slots", () => {
    renderLanding();

    const artworkSlots = screen.getAllByTestId("landing-art-slot");
    const expectedArtwork = [
      ["offline", "/assets/illustrations/offline.png"],
      ["voice", "/assets/illustrations/speak.png"],
      ["clara", "/assets/illustrations/learn.png"],
      ["progress", "/assets/illustrations/keep.png"],
    ];

    expect(artworkSlots).toHaveLength(4);
    artworkSlots.forEach((slot, index) => {
      expect(slot.tagName).toBe("IMG");
      expect(slot).toHaveAttribute("data-art-slot", expectedArtwork[index][0]);
      expect(slot).toHaveAttribute("src", expectedArtwork[index][1]);
      expect(slot).toHaveAttribute("alt", "");
      expect(slot).toHaveAttribute("aria-hidden", "true");
    });
  });

  it("uses the updated ReaDirect mark wherever the landing brand appears", () => {
    renderLanding();

    const brandMarks = document.querySelectorAll<HTMLImageElement>(
      ".browser-landing__mark",
    );

    expect(brandMarks).toHaveLength(2);
    brandMarks.forEach((mark) => {
      expect(mark).toHaveAttribute("src", "/assets/icons/rd.png");
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
