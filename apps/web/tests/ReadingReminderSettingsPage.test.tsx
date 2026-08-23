import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

const isNativePlatform = vi.hoisted(() => vi.fn(() => true));
const loadLearnerSession = vi.hoisted(() =>
  vi.fn(() => ({
    learner: { id: 1, account_purpose: "standard" as const },
  })),
);
const reminderService = vi.hoisted(() => ({
  load: vi.fn(),
  save: vi.fn(),
}));

vi.mock("@capacitor/core", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@capacitor/core")>()),
  Capacitor: { isNativePlatform },
}));

vi.mock("../src/features/learner-auth/learnerApi", () => ({
  loadLearnerSession,
}));

vi.mock("../src/features/reading-reminder/readingReminderService", () => ({
  getReadingReminderService: () => reminderService,
}));

import { ReadingReminderSettingsPage } from "../src/features/reading-reminder/ReadingReminderSettingsPage";

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/learner/settings/reading-reminder"]}>
      <Routes>
        <Route
          path="/learner/settings/reading-reminder"
          element={<ReadingReminderSettingsPage />}
        />
        <Route path="/learner/dashboard" element={<p>Learner dashboard</p>} />
        <Route path="/learner/login" element={<p>Learner login</p>} />
        <Route path="/home" element={<p>Browser home</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("ReadingReminderSettingsPage", () => {
  afterEach(() => {
    vi.clearAllMocks();
    isNativePlatform.mockReturnValue(true);
    loadLearnerSession.mockReturnValue({
      learner: { id: 1, account_purpose: "standard" },
    });
    reminderService.load.mockResolvedValue({
      schemaVersion: 1,
      enabled: false,
      time: "18:00",
      repeat: "weekdays",
      days: ["MON", "TUE", "WED", "THU", "FRI"],
      ownerKey: "learner:1",
      timezoneOffsetMinutes: -480,
    });
    reminderService.save.mockResolvedValue({
      ok: true,
      preference: {
        schemaVersion: 1,
        enabled: true,
        time: "18:00",
        repeat: "weekdays",
        days: ["MON", "TUE", "WED", "THU", "FRI"],
        ownerKey: "learner:1",
        timezoneOffsetMinutes: -480,
      },
    });
  });

  it("does not request notification permission while opening settings", async () => {
    reminderService.load.mockResolvedValue({
      schemaVersion: 1,
      enabled: false,
      time: "18:00",
      repeat: "weekdays",
      days: ["MON", "TUE", "WED", "THU", "FRI"],
      ownerKey: "learner:1",
      timezoneOffsetMinutes: -480,
    });

    renderPage();

    expect(
      await screen.findByRole("heading", { name: "Reading Reminder" }),
    ).toBeVisible();
    expect(reminderService.load).toHaveBeenCalledWith("learner:1");
    expect(reminderService.save).not.toHaveBeenCalled();
  });

  it("provides labeled accessible controls and validates selected days", async () => {
    renderPage();

    expect(
      await screen.findByRole("switch", { name: /reminders/i }),
    ).toHaveAttribute("aria-checked", "false");
    expect(screen.getByLabelText("Reminder time")).toHaveAttribute(
      "type",
      "time",
    );
    expect(screen.getByRole("group", { name: "Repeat" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("switch", { name: /reminders/i }));
    fireEvent.click(screen.getByRole("radio", { name: "Selected days" }));
    for (const day of [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
    ]) {
      fireEvent.click(screen.getByRole("checkbox", { name: day }));
    }
    fireEvent.click(screen.getByRole("button", { name: "Save Reminder" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Choose at least one reminder day.",
    );
    expect(reminderService.save).not.toHaveBeenCalled();
  });

  it("requests save through the service and reports success", async () => {
    renderPage();
    fireEvent.click(await screen.findByRole("switch", { name: /reminders/i }));
    fireEvent.click(screen.getByRole("button", { name: "Save Reminder" }));

    await waitFor(() => expect(reminderService.save).toHaveBeenCalled());
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Reading reminder saved.",
    );
  });

  it("redirects browsers away from the native settings page", async () => {
    isNativePlatform.mockReturnValue(false);

    renderPage();

    expect(await screen.findByText("Learner dashboard")).toBeVisible();
    expect(reminderService.load).not.toHaveBeenCalled();
  });

  it("returns to the learner dashboard from the Back action", async () => {
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Back" }));

    expect(await screen.findByText("Learner dashboard")).toBeVisible();
  });
});
