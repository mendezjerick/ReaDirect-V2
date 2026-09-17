import { useState, type FormEvent } from "react";

import { useStaffSchoolYear } from "../../features/staff-auth/StaffSchoolYearProvider";
import { PixelIcon } from "../ui/PixelIcon";

export function StaffSchoolYearSwitcher() {
  const {
    availableYears,
    selectedLabel,
    isLoading,
    isError,
    errorMessage,
    canCreate,
    isCreating,
    selectYear,
    createYear,
  } = useStaffSchoolYear();
  const [createOpen, setCreateOpen] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const selectedYear = availableYears.find(
    (year) => year.label === selectedLabel,
  );
  const nextYearLabel = selectedYear
    ? `${selectedYear.end_year}-${selectedYear.end_year + 1}`
    : "";

  if (!selectedLabel && !isLoading && availableYears.length === 0 && !isError) {
    return null;
  }

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const [start, end] = newLabel.split("-").map(Number);
    if (!/^\d{4}-\d{4}$/.test(newLabel)) {
      setValidationError("Use the YYYY-YYYY format.");
      return;
    }
    if (end !== start + 1) {
      setValidationError("School years must use adjacent calendar years.");
      return;
    }
    setValidationError(null);
    createYear(newLabel);
    setNewLabel("");
    setCreateOpen(false);
  };

  const toggleCreate = () => {
    setCreateOpen((open) => {
      if (!open && newLabel === "") setNewLabel(nextYearLabel);
      return !open;
    });
    setValidationError(null);
  };

  return (
    <section className="staff-school-year-switcher" aria-label="School year">
      <div className="staff-school-year-switcher__identity">
        <span className="staff-school-year-switcher__icon" aria-hidden="true">
          <PixelIcon name="calendar" />
        </span>
        <span className="staff-school-year-switcher__copy">
          <span className="staff-school-year-switcher__label">School year</span>
          <span className="staff-school-year-switcher__hint">
            Staff data is scoped to this year
          </span>
        </span>
      </div>

      {isError ? (
        <span className="staff-school-year-switcher__status" role="alert">
          {errorMessage ?? "School years are unavailable."}
        </span>
      ) : isLoading ? (
        <span className="staff-school-year-switcher__status" aria-live="polite">
          Loading years…
        </span>
      ) : (
        <select
          className="staff-school-year-switcher__select"
          aria-label="Selected school year"
          value={selectedLabel ?? ""}
          onChange={(event) => selectYear(event.target.value)}
          disabled={availableYears.length === 0}
        >
          {availableYears.map((year) => (
            <option key={year.label} value={year.label}>
              {year.label}
              {year.is_current ? " · Current" : ""}
            </option>
          ))}
        </select>
      )}

      {canCreate ? (
        <div className="staff-school-year-switcher__create">
          <button
            className="staff-school-year-switcher__create-toggle"
            type="button"
            aria-expanded={createOpen}
            onClick={toggleCreate}
          >
            {createOpen ? "Close" : "Add year"}
          </button>
          {createOpen ? (
            <form
              className="staff-school-year-switcher__create-form"
              onSubmit={submit}
            >
              <label htmlFor="staff-school-year-new">New year</label>
              <input
                id="staff-school-year-new"
                type="text"
                inputMode="numeric"
                placeholder="2026-2027"
                value={newLabel}
                pattern="[0-9]{4}-[0-9]{4}"
                onChange={(event) => setNewLabel(event.target.value)}
                disabled={isCreating}
                required
              />
              {validationError ? (
                <span
                  className="staff-school-year-switcher__status"
                  role="alert"
                >
                  {validationError}
                </span>
              ) : null}
              <button type="submit" disabled={isCreating}>
                {isCreating ? "Creating…" : "Create and switch"}
              </button>
            </form>
          ) : null}
        </div>
      ) : null}

      {errorMessage && !isError ? (
        <span className="staff-school-year-switcher__status" role="alert">
          {errorMessage}
        </span>
      ) : null}
    </section>
  );
}
