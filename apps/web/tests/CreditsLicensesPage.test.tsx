import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { CreditsLicensesPage } from "../src/features/legal/CreditsLicensesPage";

function renderCredits() {
  return render(
    <MemoryRouter initialEntries={["/credits-licenses"]}>
      <Routes>
        <Route path="/credits-licenses" element={<CreditsLicensesPage />} />
        <Route path="/home" element={<p>Home route</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("CreditsLicensesPage", () => {
  it("provides public asset, voice, data, and software acknowledgements", () => {
    renderCredits();

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
    expect(
      screen.getAllByRole("link", { name: /Back to ReaDirect/i })[0],
    ).toHaveAttribute("href", "/landing");
  });
});
