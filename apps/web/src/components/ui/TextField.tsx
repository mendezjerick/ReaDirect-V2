import { useId, type InputHTMLAttributes, type ReactNode } from "react";

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  trailingAction?: ReactNode;
}

export function TextField({
  label,
  error,
  trailingAction,
  id,
  className,
  ...props
}: TextFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;

  return (
    <div className="text-field">
      <label className="text-field__label" htmlFor={inputId}>
        {label}
      </label>

      <div className="text-field__control">
        <input
          {...props}
          id={inputId}
          className={["text-field__input", className].filter(Boolean).join(" ")}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
        />
        {trailingAction ? (
          <div className="text-field__trailing">{trailingAction}</div>
        ) : null}
      </div>

      {error ? (
        <p className="text-field__error" id={errorId} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
