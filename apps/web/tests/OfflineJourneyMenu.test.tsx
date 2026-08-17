import { fireEvent, render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";

import { OfflineJourneyMenu } from "../src/apk/dashboard/OfflineJourneyMenu";
import { ThemeProvider } from "../src/features/theme/ThemeProvider";
import {
  completeOfflineAssessment,
  createInitialOfflineLearnerState,
  updateOfflineSpeechLanguage,
} from "../src/apk/storage/offlineLearnerState";

const now = "2026-08-17T01:00:00.000Z";
const profileId = "5bc9dfb4-8163-4b59-aeab-f510fc2793e3";

function renderJourney(props: ComponentProps<typeof OfflineJourneyMenu>) {
  return render(
    <ThemeProvider>
      <OfflineJourneyMenu {...props} />
    </ThemeProvider>,
  );
}

describe("offline Journey menu", () => {
  it("keeps the main theme and English/Filipino controls on Journey", () => {
    renderJourney({
      learner: createInitialOfflineLearnerState({ id: profileId, now }),
      onBack: () => undefined,
      onSelectActivity: () => undefined,
      onSkipDiagnostic: vi.fn(),
      onLanguageChange: vi.fn(),
    });

    expect(
      screen.getByRole("navigation", { name: "Choose a theme" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("switch", { name: "English or Filipino" }),
    ).toBeEnabled();
    expect(screen.queryByText("Coming soon")).not.toBeInTheDocument();
    expect(screen.getByText("My Reading Journey")).toBeInTheDocument();
  });

  it("makes skip Diagnostic prominent and requires confirmation", () => {
    const onSkipDiagnostic = vi.fn().mockResolvedValue(undefined);
    renderJourney({
      learner: createInitialOfflineLearnerState({ id: profileId, now }),
      onBack: () => undefined,
      onSelectActivity: () => undefined,
      onSkipDiagnostic,
      onLanguageChange: vi.fn(),
    });

    const skipButton = screen.getByRole("button", {
      name: "Skip Diagnostic",
    });
    expect(skipButton).toHaveClass("big-button", "big-button--secondary");
    fireEvent.click(skipButton);
    expect(onSkipDiagnostic).not.toHaveBeenCalled();
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Skip and unlock lessons" }),
    );
    expect(onSkipDiagnostic).toHaveBeenCalledOnce();
  });

  it("places skip Diagnostic after the final assessment at the Journey footer", () => {
    renderJourney({
      learner: createInitialOfflineLearnerState({ id: profileId, now }),
      onBack: () => undefined,
      onSelectActivity: () => undefined,
      onSkipDiagnostic: vi.fn(),
      onLanguageChange: vi.fn(),
    });

    const finalAssessment = screen.getByRole("region", {
      name: "Final Assessment",
    });
    const skipButton = screen.getByRole("button", {
      name: "Skip Diagnostic",
    });

    expect(
      finalAssessment.compareDocumentPosition(skipButton) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(screen.getByRole("main", { name: "My Reading Journey" })).toHaveClass(
      "offline-journey-menu",
    );
    expect(screen.getByRole("main", { name: "My Reading Journey" })).toHaveAttribute(
      "data-diagnostic-skip-available",
      "true",
    );
  });

  it("lets the learner directly select any lesson after the Diagnostic", () => {
    const learner = completeOfflineAssessment(
      createInitialOfflineLearnerState({ id: profileId, now }),
      "diagnostic",
      { score: 20, maximum: 30 },
      "2026-08-17T01:01:00.000Z",
    );
    const onSelectActivity = vi.fn();
    renderJourney({
      learner,
      onBack: () => undefined,
      onSelectActivity,
      onSkipDiagnostic: vi.fn(),
      onLanguageChange: vi.fn(),
    });

    for (let order = 1; order <= 6; order += 1) {
      expect(
        screen.getByRole("button", {
          name: new RegExp(`Lesson ${order}\\. Start\\.`),
        }),
      ).toBeEnabled();
    }
    fireEvent.click(screen.getByRole("button", { name: /Lesson 4\. Start\./ }));
    expect(onSelectActivity).toHaveBeenCalledWith("lesson-4");
  });

  it("switches Clara between packaged English and Filipino speech", () => {
    const onLanguageChange = vi.fn().mockResolvedValue(undefined);
    const learner = updateOfflineSpeechLanguage(
      createInitialOfflineLearnerState({ id: profileId, now }),
      "fil-PH",
      now,
    );
    renderJourney({
      learner,
      onBack: () => undefined,
      onSelectActivity: () => undefined,
      onSkipDiagnostic: vi.fn(),
      onLanguageChange,
    });

    const languageSwitch = screen.getByRole("switch", {
      name: "English or Filipino",
    });
    expect(languageSwitch).toHaveAttribute("aria-checked", "true");
    fireEvent.click(languageSwitch);
    expect(onLanguageChange).toHaveBeenCalledWith("en");
  });
});
