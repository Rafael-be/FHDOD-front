import { useId, type InputHTMLAttributes } from "react";

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
}

export function FormField({ label, error, hint, id, className = "", ...props }: FormFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const helpId = `${inputId}-help`;
  return (
    <div className="fhdod-field">
      <label className="form-label" htmlFor={inputId}>{label}</label>
      <input id={inputId} className={`form-control ${error ? "is-invalid" : ""} ${className}`} aria-invalid={Boolean(error)} aria-describedby={(error || hint) ? helpId : undefined} {...props} />
      {(error || hint) && <div id={helpId} className={error ? "invalid-feedback d-block" : "form-text"}>{error ?? hint}</div>}
    </div>
  );
}
