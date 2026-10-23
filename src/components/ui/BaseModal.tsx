import { useEffect, useRef, type ReactNode } from "react";

interface BaseModalProps { open: boolean; title: string; children: ReactNode; onRequestClose?: () => void; busy?: boolean; }

export function BaseModal({ open, title, children, onRequestClose, busy = false }: BaseModalProps) {
  const closeButton = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!open) return undefined;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeButton.current?.focus();
    const trapFocus = (event: KeyboardEvent) => {
      if (event.key !== "Tab" || !dialog.current) return;
      const focusable = [...dialog.current.querySelectorAll<HTMLElement>("button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex='-1'])")];
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", trapFocus);
    return () => { document.removeEventListener("keydown", trapFocus); previouslyFocused?.focus(); };
  }, [open]);
  if (!open) return null;
  return <div className="fhdod-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onRequestClose?.(); }}>
    <section ref={dialog} className="fhdod-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" onKeyDown={(event) => { if (event.key === "Escape" && !busy) onRequestClose?.(); }}>
      <div className="d-flex justify-content-between gap-3"><h2 id="modal-title">{title}</h2>{onRequestClose && <button ref={closeButton} className="btn-close" type="button" aria-label="Fechar" disabled={busy} onClick={onRequestClose} />}</div>
      {children}
    </section>
  </div>;
}
