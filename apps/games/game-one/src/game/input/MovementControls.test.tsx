import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MovementControls } from "./MovementControls";
import type { Direction } from "./gameInput";
import type { MovementControlMode } from "./movementControlPreference";

function renderControls({
  mode = "dpad",
  disabled = false,
  keyboardDirections = new Set<Direction>(),
  onModeChange = vi.fn(),
  onDirectionChange = vi.fn(),
  onAnalogVectorChange = vi.fn()
}: {
  mode?: MovementControlMode;
  disabled?: boolean;
  keyboardDirections?: ReadonlySet<Direction>;
  onModeChange?: (mode: MovementControlMode) => void;
  onDirectionChange?: (direction: Direction, active: boolean) => void;
  onAnalogVectorChange?: (vector: { x: number; y: number }) => void;
} = {}) {
  return render(
    <MovementControls
      disabled={disabled}
      keyboardDirections={keyboardDirections}
      language="en"
      mode={mode}
      onAnalogVectorChange={onAnalogVectorChange}
      onDirectionChange={onDirectionChange}
      onModeChange={onModeChange}
    />
  );
}

function dispatchPointer(
  target: Element | Window,
  type: "pointerdown" | "pointermove" | "pointerup" | "pointercancel",
  pointerId: number,
  clientX = 0,
  clientY = 0
) {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperties(event, {
    pointerId: { value: pointerId },
    clientX: { value: clientX },
    clientY: { value: clientY }
  });
  fireEvent(target, event);
}

describe("MovementControls", () => {
  it("shows only the selected control mode and switches without restarting", () => {
    const onModeChange = vi.fn();
    renderControls({ onModeChange });

    expect(screen.getByRole("button", { name: /Move up/i })).toBeVisible();
    expect(screen.queryByRole("group", { name: /Virtual joystick/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Movement control settings/i }));
    fireEvent.click(screen.getByRole("button", { name: /Use Joystick/i }));

    expect(onModeChange).toHaveBeenCalledWith("joystick");
  });

  it("reflects keyboard directions on the D-pad", () => {
    renderControls({ keyboardDirections: new Set(["up", "right"]) });

    expect(screen.getByRole("button", { name: /Move up/i })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: /Move right/i })).toHaveClass("is-active");
    expect(screen.getByRole("button", { name: /Move down/i })).toHaveAttribute("aria-pressed", "false");
  });

  it("supports simultaneous pointers and releases input outside the buttons", () => {
    const onDirectionChange = vi.fn();
    renderControls({ onDirectionChange });
    const up = screen.getByRole("button", { name: /Move up/i });
    const right = screen.getByRole("button", { name: /Move right/i });

    dispatchPointer(up, "pointerdown", 1);
    dispatchPointer(right, "pointerdown", 2);
    dispatchPointer(window, "pointerup", 1);
    dispatchPointer(window, "pointercancel", 2);

    expect(onDirectionChange).toHaveBeenCalledWith("up", true);
    expect(onDirectionChange).toHaveBeenCalledWith("right", true);
    expect(onDirectionChange).toHaveBeenCalledWith("up", false);
    expect(onDirectionChange).toHaveBeenCalledWith("right", false);
  });

  it("uses a bounded joystick with a dead zone and recenters on release", () => {
    const onAnalogVectorChange = vi.fn();
    renderControls({ mode: "joystick", onAnalogVectorChange });
    const joystick = screen.getByRole("group", { name: /Virtual joystick/i });
    vi.spyOn(joystick, "getBoundingClientRect").mockReturnValue({
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      right: 144,
      bottom: 144,
      width: 144,
      height: 144,
      toJSON: () => ({})
    });

    dispatchPointer(joystick, "pointerdown", 7, 75, 75);
    expect(onAnalogVectorChange).toHaveBeenLastCalledWith({ x: 0, y: 0 });

    dispatchPointer(joystick, "pointermove", 7, 130, 20);
    const diagonal = onAnalogVectorChange.mock.calls.at(-1)?.[0];
    expect(diagonal?.x).toBeGreaterThan(0);
    expect(diagonal?.y).toBeLessThan(0);
    expect(Math.hypot(diagonal?.x ?? 0, diagonal?.y ?? 0)).toBeLessThanOrEqual(1);

    dispatchPointer(window, "pointerup", 7);
    expect(onAnalogVectorChange).toHaveBeenLastCalledWith({ x: 0, y: 0 });
  });

  it("clears active touch input when controls become disabled", () => {
    const onDirectionChange = vi.fn();
    const view = renderControls({ onDirectionChange });
    dispatchPointer(screen.getByRole("button", { name: /Move left/i }), "pointerdown", 4);

    view.rerender(
      <MovementControls
        disabled
        keyboardDirections={new Set()}
        language="en"
        mode="dpad"
        onAnalogVectorChange={vi.fn()}
        onDirectionChange={onDirectionChange}
        onModeChange={vi.fn()}
      />
    );

    expect(onDirectionChange).toHaveBeenLastCalledWith("left", false);
  });
});
