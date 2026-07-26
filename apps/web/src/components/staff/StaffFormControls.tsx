import {
  useId,
  type InputHTMLAttributes,
  type PropsWithChildren,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";

type StaffTextAreaFieldProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  hint?: string;
  error?: string;
};

export function StaffTextAreaField({
  label,
  hint,
  error,
  id,
  className,
  ...props
}: StaffTextAreaFieldProps) {
  const generatedId = useId();
  const controlId = id ?? generatedId;
  const hintId = hint ? `${controlId}-hint` : undefined;
  const errorId = error ? `${controlId}-error` : undefined;

  return (
    <div className="staff-field">
      <label htmlFor={controlId}>{label}</label>
      {hint ? <span id={hintId}>{hint}</span> : null}
      <textarea
        {...props}
        id={controlId}
        className={["staff-field__control", className]
          .filter(Boolean)
          .join(" ")}
        aria-invalid={Boolean(error)}
        aria-describedby={errorId ?? hintId}
      />
      {error ? (
        <p className="staff-field__error" id={errorId} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

type StaffSearchFieldProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type"
> & {
  label: string;
};

export function StaffSearchField({
  label,
  id,
  className,
  ...props
}: StaffSearchFieldProps) {
  const generatedId = useId();
  const controlId = id ?? generatedId;

  return (
    <div className="staff-field staff-field--search">
      <label htmlFor={controlId}>{label}</label>
      <input
        {...props}
        id={controlId}
        type="search"
        className={["staff-field__control", className]
          .filter(Boolean)
          .join(" ")}
      />
    </div>
  );
}

type StaffSelectControlProps = PropsWithChildren<
  SelectHTMLAttributes<HTMLSelectElement> & {
    label: string;
    hint?: string;
  }
>;

export function StaffSelectControl({
  label,
  hint,
  id,
  className,
  children,
  ...props
}: StaffSelectControlProps) {
  const generatedId = useId();
  const controlId = id ?? generatedId;
  const hintId = hint ? `${controlId}-hint` : undefined;

  return (
    <div className="staff-field">
      <label htmlFor={controlId}>{label}</label>
      {hint ? <span id={hintId}>{hint}</span> : null}
      <select
        {...props}
        id={controlId}
        className={["staff-field__control", className]
          .filter(Boolean)
          .join(" ")}
        aria-describedby={hintId}
      >
        {children}
      </select>
    </div>
  );
}

type StaffCheckboxProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  description?: string;
};

export function StaffCheckbox({
  label,
  description,
  id,
  className,
  ...props
}: StaffCheckboxProps) {
  const generatedId = useId();
  const controlId = id ?? generatedId;

  return (
    <label className={["staff-checkbox", className].filter(Boolean).join(" ")}>
      <input {...props} id={controlId} type="checkbox" />
      <span>
        <strong>{label}</strong>
        {description ? <small>{description}</small> : null}
      </span>
    </label>
  );
}

type StaffFileFieldProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type"
> & {
  label: string;
  hint?: string;
};

export function StaffFileField({
  label,
  hint,
  id,
  className,
  ...props
}: StaffFileFieldProps) {
  const generatedId = useId();
  const controlId = id ?? generatedId;
  const hintId = hint ? `${controlId}-hint` : undefined;

  return (
    <div className="staff-field">
      <label htmlFor={controlId}>{label}</label>
      {hint ? <span id={hintId}>{hint}</span> : null}
      <input
        {...props}
        id={controlId}
        type="file"
        className={["staff-field__control", "staff-field__file", className]
          .filter(Boolean)
          .join(" ")}
        aria-describedby={hintId}
      />
    </div>
  );
}
