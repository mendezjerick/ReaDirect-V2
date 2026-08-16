import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TutorialOverlay } from "./TutorialOverlay";
import { tutorialTarget } from "./tutorialContent";
import type { TutorialState } from "./tutorialState";

describe("focused tutorial overlay", () => {
  beforeEach(() => {
    localStorage.setItem("readirect-rpg:typewriter-enabled:v1", "false");
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 390 });
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 844 });
  });

  it("points the spotlight and original cursor at the required control", async () => {
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
      return this.classList.contains("movement-controls")
        ? new DOMRect(12, 650, 150, 150)
        : new DOMRect(0, 0, 0, 0);
    });
    render(
      <>
        <nav className="movement-controls"><button>Move</button></nav>
        <TutorialOverlay {...props(tutorialState("movement"))} />
      </>
    );
    await waitFor(() => expect(document.querySelector(".tutorial-spotlight")).toBeInTheDocument());
    const spotlight = document.querySelector(".tutorial-spotlight");
    expect(spotlight).toHaveAttribute("data-tutorial-target", "movement");
    expect(document.querySelector(".tutorial-pointer")).toBeInTheDocument();
    expect(document.querySelector(".tutorial-narrator")).toHaveClass("is-top");
  });

  it("keeps the target and dialogue positioned apart after resize", async () => {
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(() =>
      window.innerHeight <= 390 ? new DOMRect(10, 110, 140, 100) : new DOMRect(10, 520, 140, 100)
    );
    render(
      <>
        <nav className="movement-controls"><button>Move</button></nav>
        <TutorialOverlay {...props(tutorialState("movement"))} />
      </>
    );
    await waitFor(() => expect(document.querySelector(".tutorial-spotlight")).toBeInTheDocument());
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 844 });
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 390 });
    window.dispatchEvent(new Event("resize"));
    await waitFor(() => expect(document.querySelector(".tutorial-narrator")).toHaveClass("is-side"));
  });

  it("uses the interaction button only after it becomes available", () => {
    expect(tutorialTarget("interaction", false)).toBe(".movement-controls");
    expect(tutorialTarget("interaction", true)).toBe(".mission-interact-button");
  });

  it("does not show unavailable narration controls in the compact tutorial", () => {
    render(<TutorialOverlay {...props(tutorialState("reading"))} />);
    expect(screen.queryByRole("button", { name: /Narration unavailable/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/No approved narration recording/i)).not.toBeInTheDocument();
  });

  it("docks above the activity when the saved tutorial target is not rendered", () => {
    render(<TutorialOverlay {...props(tutorialState("answerLater"))} />);
    expect(document.querySelector(".tutorial-narrator")).toHaveClass("is-targetless");
  });

  it("uses the activity intro as a responsive fallback before Answer Later appears", () => {
    expect(tutorialTarget("answerLater", false)).toContain(".activity-intro-panel");
  });

  it("retargets Answer Later to its confirmation button", () => {
    expect(tutorialTarget("answerLater", false)).toContain('[data-tutorial="save-for-later"]');
  });

  it("targets Continue to Questions after the mission choice is correct", () => {
    expect(tutorialTarget("continueQuestions", false)).toBe('[data-tutorial="continue-questions"]');
  });

  it("keeps the final Start Adventure panel centered without targeting itself", () => {
    render(<TutorialOverlay {...props(tutorialState("ready"))} />);
    expect(document.querySelector(".tutorial-narrator")).toHaveClass("is-ready");
    expect(document.querySelector(".tutorial-spotlight")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Start Adventure/i })).toBeVisible();
  });

  it("places choice help outside the full activity panel", async () => {
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 1920 });
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 900 });
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
      if (this.classList.contains("answer-choice")) return new DOMRect(330, 390, 620, 82);
      if (this.getAttribute("role") === "dialog") return new DOMRect(320, 150, 1280, 690);
      return new DOMRect(0, 0, 0, 0);
    });

    render(
      <div className="mission-overlay">
        <section role="dialog">
          <button className="answer-choice">Choice A</button>
        </section>
        <TutorialOverlay {...props(tutorialState("choice"))} />
      </div>
    );

    await waitFor(() => expect(document.querySelector(".tutorial-narrator")).toHaveClass("is-side", "is-right"));
    const narrator = document.querySelector<HTMLElement>(".tutorial-narrator");
    expect(Number.parseFloat(narrator?.style.left ?? "0")).toBeGreaterThanOrEqual(1612);
  });

  it("advances the focused navigation lessons and keeps them skippable", async () => {
    const user = userEvent.setup();
    const onAdvance = vi.fn();
    const onRequestSkip = vi.fn();
    render(
      <TutorialOverlay
        {...props(tutorialState("missionPanel"))}
        onAdvance={onAdvance}
        onRequestSkip={onRequestSkip}
      />
    );

    await user.click(screen.getByRole("button", { name: /Got it/i }));
    expect(onAdvance).toHaveBeenCalledOnce();
    await user.click(screen.getByRole("button", { name: /Skip Tutorial/i }));
    expect(onRequestSkip).toHaveBeenCalledOnce();
  });

  it("shows a confirmation before skipping", async () => {
    const user = userEvent.setup();
    const onRequestSkip = vi.fn();
    const view = render(<TutorialOverlay {...props(tutorialState("movement"))} onRequestSkip={onRequestSkip} />);
    await user.click(screen.getByRole("button", { name: /Skip Tutorial/i }));
    expect(onRequestSkip).toHaveBeenCalled();
    view.rerender(<TutorialOverlay {...props({ ...tutorialState("movement"), skipConfirmationOpen: true })} />);
    expect(screen.getByRole("alertdialog", { name: /Skip the tutorial/i })).toBeVisible();
    expect(screen.getByRole("button", { name: /Keep Learning/i })).toBeVisible();
  });
});

function tutorialState(step: TutorialState["step"]): TutorialState {
  return { active: true, step, completedSteps: [], skipConfirmationOpen: false, finished: false };
}

function props(state: TutorialState) {
  return {
    state,
    interactionAvailable: false,
    onKeepLearning: vi.fn(),
    onSkip: vi.fn(),
    onRequestSkip: vi.fn(),
    onFinish: vi.fn(),
    onAdvance: vi.fn()
  };
}
