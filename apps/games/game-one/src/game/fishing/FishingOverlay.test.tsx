import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FISHING_SPOTS } from "./fishingSystem";
import { FishingOverlay } from "./FishingOverlay";

afterEach(() => vi.useRealTimers());

describe("FishingOverlay", () => {
  it("completes a generous cast, pull, and reading flow", () => {
    vi.useFakeTimers();
    const onComplete = vi.fn();
    render(
      <FishingOverlay
        language="en"
        spot={FISHING_SPOTS[0]}
        caughtResultIds={[]}
        onCancel={vi.fn()}
        onComplete={onComplete}
        random={() => 0}
      />
    );

    expect(screen.getByRole("list", { name: /Fishing reading progress/i })).toHaveTextContent(
      /Cast.*Read.*Answer/
    );
    expect(screen.getByText(/Every catch unlocks a short clue/i)).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Cast Line" }));
    expect(screen.getByText("Watch the bobber...")).toBeVisible();
    act(() => vi.advanceTimersByTime(1400));
    fireEvent.click(screen.getByRole("button", { name: "Pull" }));
    expect(screen.getByText(/message bottle/i)).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Read the Catch Clue" }));
    expect(screen.getByText(/one comprehension question/i)).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "A note" }));
    expect(screen.getByText(/understood the clue/i)).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Finish Reading Catch" }));

    expect(onComplete).toHaveBeenCalledWith("message-bottle", 1);
  });

  it("cancels immediately without recording a result", () => {
    const onCancel = vi.fn();
    const onComplete = vi.fn();
    render(
      <FishingOverlay
        language="fil"
        spot={FISHING_SPOTS[0]}
        caughtResultIds={[]}
        onCancel={onCancel}
        onComplete={onComplete}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Itigil ang Pangingisda" }));
    expect(onCancel).toHaveBeenCalledOnce();
    expect(onComplete).not.toHaveBeenCalled();
  });
});
