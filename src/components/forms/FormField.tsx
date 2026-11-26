import { useId, type InputHTMLAttributes, type ReactNode } from "react";

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
  trailing?: ReactNode;
}

export function FormField({ label, error, hint, trailing, id, className = "", ...props }: FormFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const helpId = `${inputId}-help`;
  return (
    <div className="fhdod-field">
      <label className="form-label" htmlFor={inputId}>{label}</label>
      {trailing ? <div className="fhdod-field-input-wrap"><input id={inputId} className={`form-control ${error ? "is-invalid" : ""} ${className}`} aria-invalid={Boolean(error)} aria-describedby={(error || hint) ? helpId : undefined} {...props} />{trailing}</div> : <input id={inputId} className={`form-control ${error ? "is-invalid" : ""} ${className}`} aria-invalid={Boolean(error)} aria-describedby={(error || hint) ? helpId : undefined} {...props} />}
      {(error || hint) && <div id={helpId} className={error ? "invalid-feedback d-block" : "form-text"}>{error ?? hint}</div>}
    </div>
  );
}
