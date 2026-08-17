import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { OfflineIntro } from "../src/apk/intro/OfflineIntro";
import {
  acknowledgeOfflineAsr,
  acknowledgeOfflineClara,
  createInitialOfflineLearnerState,
} from "../src/apk/storage/offlineLearnerState";
import { ThemeProvider } from "../src/features/theme/ThemeProvider";

import type { ClaraSelection } from "../src/apk/clara/claraCapability";

const times = [
  "2026-08-17T01:00:00.000Z",
  "2026-08-17T01:00:01.000Z",
  "2026-08-17T01:00:02.000Z",
  "2026-08-17T01:00:03.000Z",
];

function readyLearner() {
  const initial = createInitialOfflineLearnerState({
    id: "5bc9dfb4-8163-4b59-aeab-f510fc2793e3",
    now: times[0],
  });
  return acknowledgeOfflineClara(
    acknowledgeOfflineAsr(initial, "low", times[1]),
    "static",
    times[2],
  );
}

const staticSelection: ClaraSelection = {
  mode: "static",
  displayName: "Static",
  reason: "android_low_ram",
  dynamicLocked: true,
  requiresAcknowledgement: true,
  acknowledgementLabel: "I understand",
};

describe("offline intro", () => {
  it("uses the main intro theme UI and saves completion before Link Start", async () => {
    const learner = readyLearner();
    const repository = {
      update: vi.fn(async (mutate) => mutate(learner, times[3])),
    };
    const onLinkStart = vi.fn();
    const { container } = render(
      <ThemeProvider>
        <OfflineIntro
          learner={learner}
          claraSelection={staticSelection}
          repository={repository}
          onLinkStart={onLinkStart}
        />
      </ThemeProvider>,
    );

    expect(
      screen.getByRole("navigation", { name: "Choose a theme" }),
    ).toBeInTheDocument();
    const continueButton = screen.getByRole("button", { name: "Loading..." });
    expect(continueButton).toBeDisabled();
    fireEvent.load(container.querySelector("img")!);
    expect(continueButton).toHaveTextContent("Tap to continue");

    fireEvent.click(continueButton);
    await waitFor(() => expect(onLinkStart).toHaveBeenCalledOnce());
    expect(onLinkStart.mock.calls[0][0].setup.introCompletedAt).toBe(times[3]);
  });
});
