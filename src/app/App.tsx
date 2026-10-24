import { useEffect, useState, type ReactNode } from "react";
import { AppLayout } from "../components/layout/AppLayout";
import { Alert, EmptyState, ErrorState, LoadingState } from "../components/ui/Feedback";
import { StatusBadge } from "../components/ui/StatusBadge";
import { AuthProvider, useAuth } from "../features/auth/AuthContext";
import { ChangeEmailForm, LoginForm, PasswordForm } from "../features/auth/AuthForms";
import { ManagersPage } from "../features/ManagersPage";

function usePath() {
  const [path, setPath] = useState(window.location.pathname);
  useEffect(() => { const listener = () => setPath(window.location.pathname); window.addEventListener("popstate", listener); return () => window.removeEventListener("popstate", listener); }, []);
  const navigate = (next: string) => { window.history.pushState({}, "", next); setPath(next); };
  return { path, navigate };
}

function AuthenticatedApp() {
  const { path, navigate } = usePath(); const { logout, user } = useAuth();
  const signOut = async () => { await logout(); navigate("/entrar"); };
  const shell = (content: ReactNode) => <AppLayout onNavigate={navigate} onLogout={() => { void signOut(); }} canManage={user?.role === "superuser"}>{content}</AppLayout>;
  if (!user) return <main className="fhdod-auth-page"><ErrorState /></main>;
  if (user.mustChangePassword && path !== "/trocar-senha-temporaria") return <main className="fhdod-auth-page"><PasswordForm temporary onSuccess={() => navigate("/entrar")} /></main>;
  if (path === "/conta") return shell(<section><div className="fhdod-page-heading"><div><p className="eyebrow">Minha conta</p><h1>Dados de acesso</h1><p>Altere suas credenciais institucionais com confirmação da senha atual.</p></div></div><div className="fhdod-profile-grid"><ChangeEmailForm onSuccess={() => navigate("/entrar")} /><section className="fhdod-profile-card"><PasswordForm onSuccess={() => navigate("/entrar")} /></section></div></section>);
  if (path === "/trocar-senha-temporaria") return <main className="fhdod-auth-page"><PasswordForm temporary onSuccess={() => navigate("/entrar")} /></main>;
  if (path === "/gestores") return user.role === "superuser" ? shell(<ManagersPage />) : shell(<ErrorState />);
  if (path === "/erro") return shell(<ErrorState />);
  if (path !== "/") return shell(<EmptyState title="Página não encontrada">Verifique o endereço ou volte para o início.</EmptyState>);
  return shell(<><div className="fhdod-page-heading"><div><p className="eyebrow">FHDOD</p><h1>Olá, {user.name}</h1><p>{user.role === "superuser" ? "Superusuário" : "Gestor de setor"} · {user.email}</p></div><StatusBadge status="active" /></div><Alert tone="info">As funções administrativas serão adicionadas nas próximas entregas.</Alert><EmptyState title="Nenhum dado para exibir">Esta etapa cobre acesso e conta; não há dados administrativos carregados.</EmptyState></>);
}

function Router() {
  const { status, restore } = useAuth(); const { path, navigate } = usePath();
  if (status === "checking") return <main className="fhdod-auth-page"><LoadingState /></main>;
  if (status === "unavailable") return <main className="fhdod-auth-page"><ErrorState /><button className="btn fhdod-button fhdod-button--primary mt-3" type="button" onClick={() => { void restore(); }}>Tentar novamente</button></main>;
  if (status === "anonymous") {
    if (path === "/trocar-senha-temporaria" || path === "/conta") return <main className="fhdod-auth-page"><EmptyState title="Sua sessão terminou">Entre novamente para continuar.</EmptyState></main>;
    return <main className="fhdod-auth-page"><LoginForm onSuccess={() => navigate("/")} /></main>;
  }
  return <AuthenticatedApp />;
}

export function App() { return <AuthProvider><Router /></AuthProvider>; }
