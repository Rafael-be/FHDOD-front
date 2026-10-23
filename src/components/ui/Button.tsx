import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "tertiary" | "destructive";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
}

export function Button({ variant = "primary", loading = false, children, disabled, className = "", ...props }: ButtonProps) {
  return (
    <button className={`btn fhdod-button fhdod-button--${variant} ${className}`} disabled={disabled || loading} {...props}>
      {loading && <span className="spinner-border spinner-border-sm" aria-hidden="true" />}
      <span>{children}</span>
    </button>
  );
}
