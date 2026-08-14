import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { PilotAsrUnavailablePage } from "../src/features/pilot/PilotAsrUnavailablePage";

describe("PilotAsrUnavailablePage", () => {
  it("explains the learner pilot limitation and returns to the dashboard", () => {
    render(
      <MemoryRouter initialEntries={["/learner/lessons/1"]}>
        <Routes>
          <Route
            path="/learner/lessons/1"
            element={<PilotAsrUnavailablePage />}
          />
          <Route
            path="/learner/dashboard"
            element={<div>Learner dashboard route</div>}
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("heading", {
        name: "ASR is unavailable during pilot testing.",
      }),
    ).toBeVisible();
    expect(screen.getByText(/Clara's published voice guidance/i)).toBeVisible();

    fireEvent.click(
      screen.getByRole("button", { name: "Return to my dashboard" }),
    );

    expect(screen.getByText("Learner dashboard route")).toBeVisible();
  });

  it("returns staff tools to the system dashboard", () => {
    render(
      <MemoryRouter initialEntries={["/staff/system-admin/isoletter-sandbox"]}>
        <Routes>
          <Route
            path="/staff/system-admin/isoletter-sandbox"
            element={<PilotAsrUnavailablePage />}
          />
          <Route
            path="/staff/system-admin"
            element={<div>System dashboard route</div>}
          />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Return to system dashboard" }),
    );

    expect(screen.getByText("System dashboard route")).toBeVisible();
  });
});
