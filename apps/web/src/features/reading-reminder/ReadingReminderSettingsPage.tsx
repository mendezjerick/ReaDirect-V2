import { Capacitor } from "@capacitor/core";
import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";

import { BigButton } from "../../components/ui/BigButton";
import { PixelIcon } from "../../components/ui/PixelIcon";
import { Surface } from "../../components/ui/Surface";
import { loadLearnerSession } from "../learner-auth/learnerApi";
import { getReadingReminderOwnerKey } from "./ReadingReminderCoordinator";
import {
  DEFAULT_READING_REMINDER_SETTINGS,
  type ReadingReminderPreference,
} from "./readingReminderPreferences";
import {
  getReadingReminderService,
  type ReadingReminderSettingsInput,
} from "./readingReminderService";
import type { ReadingReminderDay } from "./readingReminderSchedule";
import "./reading-reminder.css";

const dayLabels: Array<{ value: ReadingReminderDay; label: string }> = [
  { value: "SUN", label: "Sunday" },
  { value: "MON", label: "Monday" },
  { value: "TUE", label: "Tuesday" },
  { value: "WED", label: "Wednesday" },
  { value: "THU", label: "Thursday" },
  { value: "FRI", label: "Friday" },
  { value: "SAT", label: "Saturday" },
];

const repeatLabels = [
  { value: "daily" as const, label: "Daily" },
  { value: "weekdays" as const, label: "Weekdays" },
  { value: "selected" as const, label: "Selected days" },
];

export function ReadingReminderSettingsPage() {
  const navigate = useNavigate();
  const native = Capacitor.isNativePlatform();
  const session = loadLearnerSession();
  const ownerKey = getReadingReminderOwnerKey(session);
  const service = getReadingReminderService();
  const [settings, setSettings] = useState<ReadingReminderPreference>(
    DEFAULT_READING_REMINDER_SETTINGS,
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    if (!native || !ownerKey) return;
    let active = true;

    void service.load(ownerKey).then((loaded) => {
      if (!active) return;
      setSettings(loaded);
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [native, ownerKey, service]);

  if (!native) {
    return <Navigate to={session ? "/learner/dashboard" : "/home"} replace />;
  }
  if (!session || !ownerKey) {
    return <Navigate to="/learner/login" replace />;
  }

  const updateSettings = (next: Partial<ReadingReminderSettingsInput>) => {
    setSettings((current) => ({ ...current, ...next }));
    setError("");
    setStatus("");
  };

  const toggleDay = (day: ReadingReminderDay) => {
    const days = settings.days.includes(day)
      ? settings.days.filter((value) => value !== day)
      : [...settings.days, day];
    updateSettings({ days });
  };

  const saveSettings = async () => {
    setError("");
    setStatus("");
    if (
      settings.enabled &&
      settings.repeat === "selected" &&
      settings.days.length === 0
    ) {
      setError("Choose at least one reminder day.");
      return;
    }

    setSaving(true);
    const input: ReadingReminderSettingsInput = {
      enabled: settings.enabled,
      time: settings.time,
      repeat: settings.repeat,
      days: settings.days,
    };
    const result = await service.save(input, ownerKey);
    setSaving(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setSettings(result.preference);
    setStatus(
      result.preference.enabled
        ? "Reading reminder saved."
        : "Reading reminder turned off.",
    );
  };

  return (
    <main
      className="reading-reminder-page learner-flow-page"
      data-route-focus
      tabIndex={-1}
    >
      <div className="reading-reminder-page__shell">
        <Surface
          className="reading-reminder-page__header"
          kind="panel"
          padding="normal"
        >
          <button
            type="button"
            className="reading-reminder-page__back"
            aria-label="Back"
            onClick={() => navigate("/learner/dashboard", { replace: true })}
          >
            <PixelIcon name="arrow-left" />
            <span>Back</span>
          </button>
          <div>
            <p className="reading-reminder-page__eyebrow">Your device</p>
            <h1>Reading Reminder</h1>
            <p>Get a gentle reminder to practice reading.</p>
          </div>
        </Surface>

        <Surface
          className="reading-reminder-page__form"
          kind="frame"
          padding="roomy"
        >
          {loading ? (
            <p role="status">Loading your reminder settings...</p>
          ) : (
            <>
              <div className="reading-reminder-page__switch-row">
                <div>
                  <h2>Reminders</h2>
                  <p>Keep this device ready with a friendly reading nudge.</p>
                </div>
                <button
                  type="button"
                  className="reading-reminder-page__switch"
                  role="switch"
                  aria-checked={settings.enabled}
                  aria-label="Reminders"
                  onClick={() => updateSettings({ enabled: !settings.enabled })}
                >
                  <span>{settings.enabled ? "On" : "Off"}</span>
                </button>
              </div>

              <fieldset disabled={!settings.enabled}>
                <legend>Time</legend>
                <label htmlFor="reading-reminder-time">Reminder time</label>
                <input
                  id="reading-reminder-time"
                  type="time"
                  value={settings.time}
                  onChange={(event) =>
                    updateSettings({ time: event.target.value })
                  }
                />
              </fieldset>

              <fieldset disabled={!settings.enabled}>
                <legend>Repeat</legend>
                <div className="reading-reminder-page__radio-grid">
                  {repeatLabels.map((repeat) => (
                    <label key={repeat.value}>
                      <input
                        type="radio"
                        name="reading-reminder-repeat"
                        value={repeat.value}
                        checked={settings.repeat === repeat.value}
                        onChange={() =>
                          updateSettings({ repeat: repeat.value })
                        }
                      />
                      <span>{repeat.label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              {settings.repeat === "selected" ? (
                <fieldset disabled={!settings.enabled}>
                  <legend>Selected days</legend>
                  <div className="reading-reminder-page__day-grid">
                    {dayLabels.map((day) => {
                      const selected = settings.days.includes(day.value);
                      return (
                        <button
                          key={day.value}
                          type="button"
                          role="checkbox"
                          aria-checked={selected}
                          aria-label={day.label}
                          className="reading-reminder-page__day"
                          data-selected={selected || undefined}
                          onClick={() => toggleDay(day.value)}
                        >
                          {day.label.slice(0, 3)}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>
              ) : null}

              {error ? (
                <p
                  className="reading-reminder-page__message reading-reminder-page__message--error"
                  role="alert"
                >
                  {error}
                </p>
              ) : null}
              {status ? (
                <p
                  className="reading-reminder-page__message reading-reminder-page__message--success"
                  role="status"
                >
                  {status}
                </p>
              ) : null}

              <BigButton
                variant="primary"
                size="large"
                busy={saving}
                busyLabel="Saving reminder"
                onClick={() => void saveSettings()}
              >
                Save Reminder
              </BigButton>
            </>
          )}
        </Surface>
      </div>
    </main>
  );
}
