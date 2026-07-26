import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AudioSettingsOverlay } from "./AudioSettingsOverlay";

const preferences = {
  sound: true,
  music: true,
  masterVolume: 0.95,
  sfxVolume: 0.8,
  musicVolume: 0.45
};

describe("AudioSettingsOverlay", () => {
  it("keeps the retro audio console controls accessible and functional", () => {
    const onChange = vi.fn();
    const onClose = vi.fn();
    render(
      <AudioSettingsOverlay
        language="en"
        preferences={preferences}
        onChange={onChange}
        onChangeLanguage={vi.fn()}
        onClose={onClose}
      />
    );

    expect(screen.getByRole("dialog", { name: /Audio Console/i })).toBeVisible();
    expect(screen.getByText("SFX")).toBeVisible();
    expect(screen.getByText("BGM")).toBeVisible();
    expect(screen.getByText("VOX")).toBeVisible();

    fireEvent.click(screen.getByRole("checkbox", { name: /Sound/i }));
    expect(onChange).toHaveBeenCalledWith({ ...preferences, sound: false });

    fireEvent.change(screen.getByRole("slider", { name: /Music volume/i }), {
      target: { value: "0.6" }
    });
    expect(onChange).toHaveBeenCalledWith({ ...preferences, musicVolume: 0.6 });

    fireEvent.click(screen.getByRole("button", { name: /Close/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
