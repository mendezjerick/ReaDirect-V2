import type { CSSProperties } from "react";
import type { AudioPreferences } from "./rpgAudioManager";
import { getUiCopy, type GameLanguage } from "../localization/language";

export function AudioSettingsOverlay({
  preferences,
  onChange,
  onClose,
  language,
  onChangeLanguage
}: {
  preferences: AudioPreferences;
  onChange: (preferences: AudioPreferences) => void;
  onClose: () => void;
  language: GameLanguage;
  onChangeLanguage: () => void;
}) {
  const copy = getUiCopy(language);
  const labels = language === "fil"
    ? { settings: "Mga Setting", console: "Audio Console", channels: "Mga Channel", mixer: "Mixer", effects: "Tunog", effectsHelp: "Mga hakbang, lugar, at hudyat sa laro", music: "Musika", musicHelp: "Musika sa likuran kapag mayroon", voice: "Boses", masterVolume: "Pangkalahatang lakas", effectsVolume: "Lakas ng tunog", musicVolume: "Lakas ng musika", on: "ON", off: "OFF", unavailable: "WALA", environment: "Orihinal na pansamantalang himig at tunog na gawa ng browser ang ginagamit." }
    : { settings: "Settings", console: "Audio Console", channels: "Channels", mixer: "Mixer", effects: "Sound", effectsHelp: "Footsteps, places, and game cues", music: "Music", musicHelp: "Background music when available", voice: "Voice", masterVolume: "Master volume", effectsVolume: "Sound volume", musicVolume: "Music volume", on: "ON", off: "OFF", unavailable: "N/A", environment: "Original temporary browser-made tones and melody are in use." };
  return (
    <div className="audio-settings-layer">
      <section role="dialog" aria-modal="true" aria-labelledby="audio-settings-title" className="audio-settings-panel">
        <header className="audio-settings-header">
          <div className="audio-settings-title">
            <span className="audio-console-mark" aria-hidden="true">SND</span>
            <div>
              <p>{labels.settings}</p>
              <h2 id="audio-settings-title">{labels.console}</h2>
            </div>
          </div>
          <button type="button" className="audio-close-button" onClick={onClose} autoFocus>
            <span aria-hidden="true">{"\u00D7"}</span>
            {copy.close}
          </button>
        </header>

        <div className="audio-settings-body">
          <section className="audio-channel-section" aria-labelledby="audio-channel-heading">
            <h3 id="audio-channel-heading">{labels.channels}</h3>
            <AudioChannel
              code="SFX"
              enabled={preferences.sound}
              help={labels.effectsHelp}
              label={labels.effects}
              offLabel={labels.off}
              onLabel={labels.on}
              onChange={(sound) => onChange({ ...preferences, sound })}
            />
            <AudioChannel
              code="BGM"
              enabled={preferences.music}
              help={labels.musicHelp}
              label={labels.music}
              offLabel={labels.off}
              onLabel={labels.on}
              onChange={(music) => onChange({ ...preferences, music })}
            />
            <div className="audio-channel is-unavailable">
              <span className="audio-channel-code" aria-hidden="true">VOX</span>
              <span className="audio-channel-copy">
                <strong>{labels.voice}</strong>
                <small>{copy.noRecording}</small>
              </span>
              <span className="audio-channel-status">{labels.unavailable}</span>
              <span className="audio-toggle-switch" aria-hidden="true"><span /></span>
            </div>
          </section>

          <section className="audio-mixer-section" aria-labelledby="audio-mixer-heading">
            <h3 id="audio-mixer-heading">{labels.mixer}</h3>
            <AudioVolume
              label={labels.masterVolume}
              value={preferences.masterVolume}
              onChange={(masterVolume) => onChange({ ...preferences, masterVolume })}
            />
            <AudioVolume
              label={labels.effectsVolume}
              value={preferences.sfxVolume}
              onChange={(sfxVolume) => onChange({ ...preferences, sfxVolume })}
            />
            <AudioVolume
              label={labels.musicVolume}
              value={preferences.musicVolume}
              onChange={(musicVolume) => onChange({ ...preferences, musicVolume })}
            />
          </section>
        </div>

        <footer className="audio-settings-footer">
          <p>{labels.environment}</p>
          <button type="button" className="audio-language-button" onClick={onChangeLanguage}>{copy.changeLanguage}</button>
        </footer>
      </section>
    </div>
  );
}

function AudioChannel({
  code,
  enabled,
  help,
  label,
  offLabel,
  onLabel,
  onChange
}: {
  code: string;
  enabled: boolean;
  help: string;
  label: string;
  offLabel: string;
  onLabel: string;
  onChange: (enabled: boolean) => void;
}) {
  return (
    <label className="audio-channel">
      <span className="audio-channel-code" aria-hidden="true">{code}</span>
      <span className="audio-channel-copy">
        <strong>{label}</strong>
        <small>{help}</small>
      </span>
      <span className="audio-channel-status">{enabled ? onLabel : offLabel}</span>
      <input
        className="audio-toggle-input"
        type="checkbox"
        checked={enabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="audio-toggle-switch" aria-hidden="true"><span /></span>
    </label>
  );
}

function AudioVolume({
  label,
  value,
  onChange
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  const percent = Math.round(value * 100);
  return (
    <label className="audio-volume">
      <span>
        <strong>{label}</strong>
        <output>{percent}%</output>
      </span>
      <input
        aria-label={label}
        type="range"
        min="0"
        max="1"
        step="0.05"
        value={value}
        style={{ "--audio-level": `${percent}%` } as CSSProperties}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}
