import type { ReactNode } from "react";
import { Button } from "../ui/Button";

export function AppLayout({ children, onNavigate, onLogout, canManage }: { children: ReactNode; onNavigate: (path: string) => void; onLogout: () => void; canManage: boolean }) {
  return <div className="fhdod-layout"><aside className="fhdod-sidebar"><button className="fhdod-brand" type="button" onClick={() => onNavigate("/")}>FHDOD</button><nav aria-label="Navegação principal"><span className="fhdod-nav-label">Conta</span><button type="button" onClick={() => onNavigate("/")}>Início</button><button type="button" onClick={() => onNavigate("/conta")}>Minha conta</button><span className="fhdod-nav-label">Setores</span><button type="button" onClick={() => onNavigate("/setores")}>Setores</button>{canManage && <><span className="fhdod-nav-label">Administração</span><button type="button" onClick={() => onNavigate("/gestores")}>Gestores</button></>}</nav></aside><div className="fhdod-workspace"><header className="fhdod-header"><span>Fundação do sistema</span><Button variant="tertiary" onClick={onLogout}>Sair</Button></header><main className="fhdod-main">{children}</main></div></div>;
}
