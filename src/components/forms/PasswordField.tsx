import { useState, type InputHTMLAttributes } from "react";
import { FormField } from "./FormField";

interface PasswordFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> { label: string; error?: string; hint?: string; }

export function PasswordField({ label, error, hint, className = "", ...props }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  return <div className="position-relative"><FormField {...props} label={label} type={visible ? "text" : "password"} className={`fhdod-password-input ${className}`} error={error} hint={hint} /><button className="btn btn-sm fhdod-password-toggle" type="button" aria-pressed={visible} aria-label={visible ? "Ocultar senha" : "Mostrar senha"} onClick={() => setVisible((current) => !current)}>{visible ? "Ocultar" : "Mostrar"}</button></div>;
}
