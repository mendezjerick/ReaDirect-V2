import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useNarration } from "./useNarration";

const cancel = vi.fn();
const speak = vi.fn();

describe("narration without approved recordings", () => {
  beforeEach(() => {
    cancel.mockClear();
    speak.mockClear();
    Object.defineProperty(window, "speechSynthesis", {
      configurable: true,
      value: { cancel, speak, getVoices: vi.fn(() => []) }
    });
    Object.defineProperty(window, "SpeechSynthesisUtterance", {
      configurable: true,
      value: class {
        text: string;
        lang = "";
        rate = 1;
        pitch = 1;
        voice = null;
        constructor(text: string) { this.text = text; }
      }
    });
  });

  it("keeps text available, reports narration as unavailable, and never starts browser speech", () => {
    const view = render(<Harness text="First line" />);
    expect(screen.getByText("First line")).toBeVisible();
    expect(screen.getByText("unsupported")).toBeVisible();
    expect(speak).not.toHaveBeenCalled();
    view.rerender(<Harness text="Second line" language="fil" />);
    expect(screen.getByText("Second line")).toBeVisible();
    expect(speak).not.toHaveBeenCalled();
    const callsBeforeCleanup = cancel.mock.calls.length;
    view.unmount();
    expect(cancel.mock.calls.length).toBeGreaterThan(callsBeforeCleanup);
  });

  it("keeps narration text visible while muted", async () => {
    const user = userEvent.setup();
    render(<Harness text="Read the message carefully." />);
    await user.click(screen.getByRole("button", { name: /Mute/i }));
    expect(screen.getByText(/Read the message carefully/i)).toBeVisible();
    expect(cancel).toHaveBeenCalled();
  });
});

function Harness({ text, language = "en" }: { text: string; language?: "en" | "fil" }) {
  const narration = useNarration(text, true, language);
  return <div><p>{text}</p><span>{narration.supported ? "supported" : "unsupported"}</span><button onClick={narration.toggleMute}>{narration.muted ? "Turn Voice On" : "Mute"}</button></div>;
}
