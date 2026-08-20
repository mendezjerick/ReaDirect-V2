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

    expect(
      screen.getByRole("heading", { name: "Credits & licenses" }),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", { name: "Audio and voice" }),
    ).toBeVisible();
    expect(screen.getByText(/Sound effects by SoundsbyDane/)).toBeVisible();
    expect(screen.getByText(/Shaila Patrice D. Avallenda/)).toBeVisible();
    expect(screen.getByRole("link", { name: "OpenAI Whisper" })).toHaveAttribute(
      "href",
      "https://github.com/openai/whisper",
    );
    expect(screen.getByRole("link", { name: /Back to ReaDirect/i })).toHaveAttribute(
      "href",
      "/home",
    );
  });
});
