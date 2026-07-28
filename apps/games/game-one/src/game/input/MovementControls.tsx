import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { getUiCopy, type GameLanguage } from "../localization/language";
import type { Point } from "../physics/collision";
import {
  clampVector,
  normalizeJoystickVector,
  normalizeVector,
  resolveDirections,
  type Direction
} from "./gameInput";
import type { MovementControlMode } from "./movementControlPreference";

type MovementControlsProps = {
  disabled: boolean;
  language: GameLanguage;
  mode: MovementControlMode;
  keyboardDirections: ReadonlySet<Direction>;
  onModeChange: (mode: MovementControlMode) => void;
  onDirectionChange: (direction: Direction, active: boolean) => void;
  onAnalogVectorChange: (vector: Point) => void;
  onDirectionalIntent?: (vector: Point) => void;
};

export function MovementControls({
  disabled,
  language,
  mode,
  keyboardDirections,
  onModeChange,
  onDirectionChange,
  onAnalogVectorChange,
  onDirectionalIntent
}: MovementControlsProps) {
  const copy = getUiCopy(language);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const rootRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (disabled) setSettingsOpen(false);
  }, [disabled]);

  useEffect(() => {
    if (!settingsOpen) return;
    const closeOutside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setSettingsOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSettingsOpen(false);
    };
    document.addEventListener("pointerdown", closeOutside);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [settingsOpen]);

  const selectMode = (nextMode: MovementControlMode) => {
    onDirectionChange("up", false);
    onDirectionChange("down", false);
    onDirectionChange("left", false);
    onDirectionChange("right", false);
    onAnalogVectorChange({ x: 0, y: 0 });
    onModeChange(nextMode);
    setSettingsOpen(false);
  };

  return (
    <nav ref={rootRef} aria-label={copy.movementControls} className="movement-controls">
      <button
        type="button"
        className="movement-control-settings-button"
        aria-label={copy.movementControlSettings}
        aria-expanded={settingsOpen}
        aria-controls="movement-control-menu"
        disabled={disabled}
        onClick={() => setSettingsOpen((open) => !open)}
      >
        <span className="movement-settings-icon" aria-hidden="true" />
      </button>
      {settingsOpen && (
        <div id="movement-control-menu" className="movement-control-menu" role="group" aria-label={copy.movementControlType}>
          <p>{copy.movementControlType}</p>
          <button type="button" aria-pressed={mode === "dpad"} onClick={() => selectMode("dpad")}>{copy.useDpad}</button>
          <button type="button" aria-pressed={mode === "joystick"} onClick={() => selectMode("joystick")}>{copy.useJoystick}</button>
        </div>
      )}
      {mode === "dpad" ? (
        <DirectionalPad
          disabled={disabled}
          language={language}
          keyboardDirections={keyboardDirections}
          onDirectionChange={onDirectionChange}
          onDirectionalIntent={onDirectionalIntent}
        />
      ) : (
        <VirtualJoystick
          disabled={disabled}
          label={copy.virtualJoystick}
          keyboardDirections={keyboardDirections}
          onVectorChange={onAnalogVectorChange}
          onDirectionalIntent={onDirectionalIntent}
        />
      )}
    </nav>
  );
}

function DirectionalPad({
  disabled,
  language,
  keyboardDirections,
  onDirectionChange,
  onDirectionalIntent
}: Pick<MovementControlsProps, "disabled" | "language" | "keyboardDirections" | "onDirectionChange" | "onDirectionalIntent">) {
  const copy = getUiCopy(language);
  const directionChangeRef = useRef(onDirectionChange);
  const pointersRef = useRef(new Map<number, Direction>());
  const [pointerDirections, setPointerDirections] = useState<ReadonlySet<Direction>>(() => new Set());
  directionChangeRef.current = onDirectionChange;

  const releasePointer = useCallback((pointerId: number) => {
    const direction = pointersRef.current.get(pointerId);
    if (!direction) return;
    pointersRef.current.delete(pointerId);
    directionChangeRef.current(direction, false);
    setPointerDirections(new Set(pointersRef.current.values()));
  }, []);

  const releaseAllPointers = useCallback(() => {
    for (const direction of new Set(pointersRef.current.values())) {
      directionChangeRef.current(direction, false);
    }
    pointersRef.current.clear();
    setPointerDirections(new Set());
  }, []);

  useEffect(() => {
    const releaseEvent = (event: PointerEvent) => releasePointer(event.pointerId);
    const releaseInterrupted = () => releaseAllPointers();
    const releaseWhenHidden = () => {
      if (document.visibilityState === "hidden") releaseAllPointers();
    };
    window.addEventListener("pointerup", releaseEvent);
    window.addEventListener("pointercancel", releaseEvent);
    window.addEventListener("blur", releaseInterrupted);
    window.addEventListener("orientationchange", releaseInterrupted);
    document.addEventListener("visibilitychange", releaseWhenHidden);
    return () => {
      window.removeEventListener("pointerup", releaseEvent);
      window.removeEventListener("pointercancel", releaseEvent);
      window.removeEventListener("blur", releaseInterrupted);
      window.removeEventListener("orientationchange", releaseInterrupted);
      document.removeEventListener("visibilitychange", releaseWhenHidden);
      releaseAllPointers();
    };
  }, [releaseAllPointers, releasePointer]);

  useEffect(() => {
    if (disabled) releaseAllPointers();
  }, [disabled, releaseAllPointers]);

  const press = (direction: Direction, event: ReactPointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    if (disabled) return;
    releasePointer(event.pointerId);
    event.currentTarget.setPointerCapture?.(event.pointerId);
    pointersRef.current.set(event.pointerId, direction);
    directionChangeRef.current(direction, true);
    setPointerDirections(new Set(pointersRef.current.values()));
    onDirectionalIntent?.(directionVector(direction));
  };

  const activeDirections = new Set([...keyboardDirections, ...pointerDirections]);
  const button = (direction: Direction, label: string) => (
    <button
      type="button"
      aria-label={label}
      aria-pressed={activeDirections.has(direction)}
      data-direction={direction}
      disabled={disabled}
      className={`movement-direction-button ${activeDirections.has(direction) ? "is-active" : ""}`}
      onPointerDown={(event) => press(direction, event)}
      onPointerUp={(event) => releasePointer(event.pointerId)}
      onPointerCancel={(event) => releasePointer(event.pointerId)}
      onLostPointerCapture={(event) => releasePointer(event.pointerId)}
      onPointerLeave={(event) => releasePointer(event.pointerId)}
      onContextMenu={(event) => event.preventDefault()}
    >
      <span
        aria-hidden="true"
        className={`movement-direction-icon movement-direction-icon--${direction}`}
      />
    </button>
  );

  return (
    <div className="movement-dpad" data-control-mode="dpad">
      <span aria-hidden="true" />
      {button("up", copy.moveUp)}
      <span aria-hidden="true" />
      {button("left", copy.moveLeft)}
      <div aria-hidden="true" className="movement-dpad-center">+</div>
      {button("right", copy.moveRight)}
      <span aria-hidden="true" />
      {button("down", copy.moveDown)}
      <span aria-hidden="true" />
    </div>
  );
}

function VirtualJoystick({
  disabled,
  label,
  keyboardDirections,
  onVectorChange,
  onDirectionalIntent
}: {
  disabled: boolean;
  label: string;
  keyboardDirections: ReadonlySet<Direction>;
  onVectorChange: (vector: Point) => void;
  onDirectionalIntent?: (vector: Point) => void;
}) {
  const baseRef = useRef<HTMLDivElement | null>(null);
  const pointerIdRef = useRef<number | null>(null);
  const onVectorChangeRef = useRef(onVectorChange);
  const [dragging, setDragging] = useState(false);
  const [pointerVector, setPointerVector] = useState<Point>({ x: 0, y: 0 });
  onVectorChangeRef.current = onVectorChange;

  const release = useCallback((pointerId?: number) => {
    if (pointerId !== undefined && pointerIdRef.current !== pointerId) return;
    pointerIdRef.current = null;
    setDragging(false);
    setPointerVector({ x: 0, y: 0 });
    onVectorChangeRef.current({ x: 0, y: 0 });
  }, []);

  const update = (clientX: number, clientY: number) => {
    const rect = baseRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return;
    const raw = {
      x: (clientX - (rect.left + rect.width / 2)) / (rect.width * 0.38),
      y: (clientY - (rect.top + rect.height / 2)) / (rect.height * 0.38)
    };
    const visual = clampVector(raw);
    const movement = normalizeJoystickVector(raw);
    setPointerVector(visual);
    onVectorChangeRef.current(movement);
    if (movement.x !== 0 || movement.y !== 0) onDirectionalIntent?.(movement);
  };

  useEffect(() => {
    const releaseEvent = (event: PointerEvent) => release(event.pointerId);
    const releaseInterrupted = () => release();
    const releaseWhenHidden = () => {
      if (document.visibilityState === "hidden") release();
    };
    window.addEventListener("pointerup", releaseEvent);
    window.addEventListener("pointercancel", releaseEvent);
    window.addEventListener("blur", releaseInterrupted);
    window.addEventListener("orientationchange", releaseInterrupted);
    document.addEventListener("visibilitychange", releaseWhenHidden);
    return () => {
      window.removeEventListener("pointerup", releaseEvent);
      window.removeEventListener("pointercancel", releaseEvent);
      window.removeEventListener("blur", releaseInterrupted);
      window.removeEventListener("orientationchange", releaseInterrupted);
      document.removeEventListener("visibilitychange", releaseWhenHidden);
      release();
    };
  }, [release]);

  useEffect(() => {
    if (disabled) release();
  }, [disabled, release]);

  const keyboardVector = normalizeVector(resolveDirections(keyboardDirections));
  const displayVector = dragging ? pointerVector : keyboardVector;
  const active = dragging || keyboardVector.x !== 0 || keyboardVector.y !== 0;

  return (
    <div
      ref={baseRef}
      role="group"
      aria-label={label}
      aria-disabled={disabled}
      data-control-mode="joystick"
      className={`virtual-joystick ${active ? "is-active" : ""} ${dragging ? "is-dragging" : ""}`}
      onPointerDown={(event) => {
        event.preventDefault();
        if (disabled || pointerIdRef.current !== null) return;
        pointerIdRef.current = event.pointerId;
        event.currentTarget.setPointerCapture?.(event.pointerId);
        setDragging(true);
        update(event.clientX, event.clientY);
      }}
      onPointerMove={(event) => {
        if (pointerIdRef.current !== event.pointerId) return;
        event.preventDefault();
        update(event.clientX, event.clientY);
      }}
      onPointerUp={(event) => release(event.pointerId)}
      onPointerCancel={(event) => release(event.pointerId)}
      onLostPointerCapture={(event) => release(event.pointerId)}
      onContextMenu={(event) => event.preventDefault()}
    >
      <div className="virtual-joystick-ring" aria-hidden="true" />
      <div
        className="virtual-joystick-thumb"
        aria-hidden="true"
        style={{ transform: `translate(${displayVector.x * 2.25}rem, ${displayVector.y * 2.25}rem)` }}
      />
    </div>
  );
}

function directionVector(direction: Direction): Point {
  return {
    x: direction === "left" ? -1 : direction === "right" ? 1 : 0,
    y: direction === "up" ? -1 : direction === "down" ? 1 : 0
  };
}
