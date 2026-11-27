import { useEffect, useRef, type ReactNode } from "react";
import { FhdodLogo } from "../branding/FhdodLogo";
import { Button } from "../ui/Button";

interface AppLayoutProps {
  children: ReactNode;
  currentPath: string;
  onNavigate: (path: string) => void;
  onLogout: () => void;
  canManage: boolean;
}

const navigation = [
  { label: "Conta", items: [{ path: "/", label: "Indicadores", icon: "dashboard" }, { path: "/relatorios", label: "Relatórios", icon: "audit" }, { path: "/conta", label: "Minha conta", icon: "user" }] },
  { label: "Operação", items: [{ path: "/setores", label: "Setores", icon: "sectors" }, { path: "/formularios", label: "Formulários", icon: "forms" }] },
  { label: "Avaliações", managed: true, items: [{ path: "/perguntas-padrao/nova", label: "Pergunta padrão", icon: "question" }, { path: "/nps/novo", label: "Novo NPS", icon: "nps" }] },
  { label: "Administração", managed: true, items: [
    { path: "/tv-wall/config", label: "Configuração da TV", icon: "dashboard" },
    { path: "/gestores", label: "Gestores", icon: "users" },
    { path: "/ouvidoria", label: "Ouvidoria", icon: "message" },
    { path: "/planilhas-turnos", label: "Planilhas de turnos", icon: "calendar" },
    { path: "/auditoria", label: "Auditoria", icon: "audit" },
    { path: "/paginas/lgpd", label: "Página LGPD", icon: "shield" },
  ] },
];

const iconShapes: Record<string, ReactNode> = {
  dashboard: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
  sectors: <><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M3 10h18M9 10v11" /></>,
  forms: <><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M8 8h8M8 12h8M8 16h5" /></>,
  question: <><circle cx="12" cy="12" r="9" /><path d="M9.5 9a2.5 2.5 0 1 1 4 2c-1 .8-1.5 1.2-1.5 2.5M12 17h.01" /></>,
  nps: <><path d="M4 20V10M10 20V4M16 20v-7M22 20v-4" /></>,
  users: <><circle cx="9" cy="8" r="3" /><path d="M3 20v-2a6 6 0 0 1 12 0v2M17 5a3 3 0 0 1 0 6M17 14a5 5 0 0 1 4 5v1" /></>,
  message: <path d="M4 4h16a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H9l-5 3v-3a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2ZM6 9h12M6 13h9" />,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M7 3v4M17 3v4M3 10h18" /></>,
  audit: <><path d="M8 4h-3a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-3M9 3h6v4H9zM7 12h10M7 16h7" /></>,
  shield: <path d="M12 2 4 5v6c0 5.5 3.1 9.1 8 11 4.9-1.9 8-5.5 8-11V5l-8-3ZM9 12l2 2 4-4" />,
};

function NavigationIcon({ name }: { name: string }) {
  return <svg className="fhdod-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{iconShapes[name]}</svg>;
}

export function AppLayout({ children, currentPath, onNavigate, onLogout, canManage }: AppLayoutProps) {
  const navigationRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!window.matchMedia?.("(max-width: 1023px)").matches) return;
    navigationRef.current?.querySelector('button[aria-current="page"]')?.scrollIntoView?.({ block: "nearest", inline: "center" });
  }, [currentPath]);
  const navigateSafely = (path: string) => {
    if (window.dispatchEvent(new Event("fhdod:beforeNavigate", { cancelable: true }))) onNavigate(path);
  };
  const isCurrent = (path: string) => path === "/setores" ? currentPath.startsWith("/setores") : currentPath === path;

  return (
    <div className="fhdod-layout">
      <aside className="fhdod-sidebar">
        <button className="fhdod-brand" type="button" onClick={() => navigateSafely("/")} aria-label="FHDOD, ir para indicadores"><FhdodLogo size="compact" /></button>
        <nav ref={navigationRef} aria-label="Navegação principal">
          {navigation.filter((group) => !group.managed || canManage).map((group) => (
            <div className="fhdod-nav-group" key={group.label}>
              <span className="fhdod-nav-label">{group.label}</span>
              {group.items.map((item) => (
                <button key={item.path} type="button" aria-current={isCurrent(item.path) ? "page" : undefined} onClick={() => navigateSafely(item.path)}><NavigationIcon name={item.icon} /><span>{item.label}</span></button>
              ))}
            </div>
          ))}
        </nav>
      </aside>
      <div className="fhdod-workspace">
        <header className="fhdod-header"><span>Experiência do paciente</span><Button variant="tertiary" onClick={() => { if (window.dispatchEvent(new Event("fhdod:beforeNavigate", { cancelable: true }))) onLogout(); }}>Sair</Button></header>
        <main className="fhdod-main">{children}</main>
      </div>
    </div>
  );
}
