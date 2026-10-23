import type { ReactNode } from "react";

export function Alert({ children, tone = "info" }: { children: ReactNode; tone?: "info" | "success" | "danger" }) {
  return <div className={`alert alert-${tone === "danger" ? "danger" : tone}`} role="alert">{children}</div>;
}

export function LoadingState() { return <div className="fhdod-state" role="status"><span className="spinner-border" aria-hidden="true" /> <span>Carregando…</span></div>; }
export function EmptyState({ title, children }: { title: string; children?: ReactNode }) { return <section className="fhdod-state"><h2>{title}</h2>{children && <p>{children}</p>}</section>; }
export function ErrorState() { return <section className="fhdod-state"><h2>Não foi possível carregar esta página.</h2><p>Tente novamente em alguns instantes.</p></section>; }
