import { useState, type InputHTMLAttributes } from "react";
import { FormField } from "./FormField";

interface PasswordFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> { label: string; error?: string; hint?: string; }

export function PasswordField({ label, error, hint, className = "", ...props }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  return <div className="position-relative"><FormField {...props} label={label} type={visible ? "text" : "password"} className={`fhdod-password-input ${className}`} error={error} hint={hint} /><button className="btn fhdod-password-toggle" type="button" aria-pressed={visible} aria-label={visible ? "Ocultar senha" : "Mostrar senha"} onClick={() => setVisible((current) => !current)}>
    <svg className="fhdod-password-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d={visible ? "M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 4.2A10.8 10.8 0 0 1 12 4c5.2 0 9.2 4 10 8-.3 1.5-1.1 2.8-2.2 4M6.2 6.2C3.8 7.8 2.4 10.2 2 12c.8 4 4.8 8 10 8 1.1 0 2.2-.2 3.2-.5" : "M2 12s3.6-8 10-8 10 8 10 8-3.6 8-10 8-10-8-10-8Zm10-3a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z"} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
  </button></div>;
}
