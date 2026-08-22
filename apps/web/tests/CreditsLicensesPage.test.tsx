import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { CreditsLicensesPage } from "../src/features/legal/CreditsLicensesPage";

function renderCredits(returnTo = "/home") {
  return render(
    <MemoryRouter
      initialEntries={[
        `/credits-licenses?returnTo=${encodeURIComponent(returnTo)}`,
      ]}
    >
      <Routes>
        <Route path="/credits-licenses" element={<CreditsLicensesPage />} />
        <Route path="/home" element={<p>Home route</p>} />
        <Route path="/landing" element={<p>Landing route</p>} />
        <Route path="/learner/login" element={<p>Learner login route</p>} />
        <Route path="/staff/login" element={<p>Staff login route</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("CreditsLicensesPage", () => {
  it("provides public asset, voice, data, and software acknowledgements", () => {
    const initialRender = renderCredits();

    expect(screen.getByRole("banner")).toHaveClass("public-info-shell__header");
    expect(screen.getByRole("contentinfo")).toHaveClass(
      "public-info-shell__footer",
    );

    expect(
      screen.getByRole("heading", { name: "Credits & licenses" }),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", { name: "Audio and voice" }),
    ).toBeVisible();
    expect(screen.getByText(/Sound effects by SoundsbyDane/)).toBeVisible();
    expect(screen.getByText(/Shaila Patrice D. Avallenda/)).toBeVisible();
    expect(screen.getByText("OtterTale (Game Two)")).toBeVisible();
    expect(screen.getByText(/released under CC0 1.0/)).toBeVisible();
    expect(screen.getByText("Ma'am Clara (CherryGoth model)")).toBeVisible();
    expect(screen.getByRole("link", { name: "pngVtubers" })).toHaveAttribute(
      "href",
      "https://www.etsy.com/shop/pngVtubers",
    );
    expect(
      screen.getByRole("link", {
        name: "Customizable Goth VTuber Model Etsy listing",
      }),
    ).toHaveAttribute(
      "href",
      "https://www.etsy.com/listing/4295933400/customizable-goth-vtuber-model-premade",
    );
    expect(screen.queryByText(/Word Rescue/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/USD 1/)).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "OpenAI Whisper" }),
    ).toHaveAttribute("href", "https://github.com/openai/whisper");
    initialRender.unmount();
    for (const name of [
      "ReaDirect landing page",
      "Back to ReaDirect",
      /Return to landing/i,
    ]) {
      const { unmount } = renderCredits();
      fireEvent.click(screen.getByRole("link", { name }));
      expect(screen.getByText("Home route")).toBeVisible();
      unmount();
    }
  });

  it("returns to the source lobby or login route", () => {
    for (const [returnTo, destination] of [
      ["/home", "Home route"],
      ["/landing", "Landing route"],
      ["/learner/login", "Learner login route"],
      ["/staff/login", "Staff login route"],
    ]) {
      const { unmount } = renderCredits(returnTo);
      fireEvent.click(screen.getByRole("link", { name: "Back to ReaDirect" }));
      expect(screen.getByText(destination)).toBeVisible();
      unmount();
    }
  });
});
