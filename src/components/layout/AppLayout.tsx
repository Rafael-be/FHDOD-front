import type { ReactNode } from "react";

export function AppLayout({ children }: { children: ReactNode }) {
  return <div className="fhdod-layout"><aside className="fhdod-sidebar"><a className="fhdod-brand" href="/">FHDOD</a><nav aria-label="Navegação principal"><span className="fhdod-nav-label">Administração</span><a href="/">Início</a></nav></aside><div className="fhdod-workspace"><header className="fhdod-header"><span>Fundação do sistema</span></header><main className="fhdod-main">{children}</main></div></div>;
}
