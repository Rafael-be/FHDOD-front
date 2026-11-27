import { useEffect, useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppLayout } from "../components/layout/AppLayout";
import { EmptyState, ErrorState, LoadingState } from "../components/ui/Feedback";
import { AuthProvider, useAuth } from "../features/auth/AuthContext";
import { LoginForm, PasswordForm } from "../features/auth/AuthForms";
import { AccountPage } from "../features/AccountPage";
import { ManagersPage } from "../features/ManagersPage";
import { SectorsPage } from "../features/SectorsPage";
import { SectorQuestionsPage } from "../features/SectorQuestionsPage";
import { EditPage, PublicPage } from "../features/PagesPage";
import { QuestionCreationPage } from "../features/QuestionCreationPage";
import { PublicSubmissionPage } from "../features/PublicSubmissionPage";
import { ShiftSheetsPage } from "../features/ShiftSheetsPage";
import { AuditPage } from "../features/AuditPage";
import { TvWall, TvWallConfig } from "../features/TvWall";
import { AnalyticsPage } from "../features/AnalyticsPage";
import { ReportsPage } from "../features/ReportsPage";
import { OmbudsmanPage, PublicOmbudsmanPage } from "../features/OmbudsmanPage";
import { FhdodLogo } from "../components/branding/FhdodLogo";

let currentPath = window.location.pathname;
function usePath() {
  const [path, setPath] = useState(currentPath);
  useEffect(() => {
    const listener = () => {
      const next = window.location.pathname;
      if (next !== currentPath) {
        if (!window.dispatchEvent(new Event("fhdod:beforeNavigate", { cancelable: true }))) {
          window.history.pushState({}, "", currentPath);
        } else currentPath = next;
      }
      setPath(currentPath);
    };
    window.addEventListener("popstate", listener);
    return () => window.removeEventListener("popstate", listener);
  }, []);
  const navigate = (next: string) => { window.history.pushState({}, "", next); currentPath = next; setPath(next); };
  return { path, navigate };
}

function AccountQueries({ children }: { children: ReactNode }) {
  const [client] = useState(() => new QueryClient());
  useEffect(() => () => client.clear(), [client]);
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function AuthenticatedApp() {
  const { path, navigate } = usePath(); const { logout, user } = useAuth();
  const signOut = async () => { await logout(); navigate("/entrar"); };
  const shell = (content: ReactNode) => <AppLayout currentPath={path} onNavigate={navigate} onLogout={() => { void signOut(); }} canManage={user?.role === "superuser"}>{content}</AppLayout>;
  useEffect(() => { if (user?.mustChangePassword && path !== "/trocar-senha-temporaria") navigate("/trocar-senha-temporaria"); }, [navigate, path, user?.mustChangePassword]);
  if (!user) return <main className="fhdod-auth-page"><ErrorState /></main>;
  if (user.mustChangePassword && path !== "/trocar-senha-temporaria") return <main className="fhdod-auth-page"><PasswordForm temporary onSuccess={() => navigate("/entrar")} /></main>;
  if (path === "/conta") return shell(<AccountPage user={user} onCredentialChange={() => navigate("/entrar")} />);
  if (path === "/relatorios") return shell(<ReportsPage canManage={user.role === "superuser"} />);
  if (path === "/trocar-senha-temporaria") return <main className="fhdod-auth-page"><PasswordForm temporary onSuccess={() => navigate("/entrar")} /></main>;
  if (path === "/gestores") return user.role === "superuser" ? shell(<ManagersPage />) : shell(<ErrorState />);
  if (path === "/setores") return shell(<SectorsPage canManage={user.role === "superuser"} onQuestions={(sectorId) => navigate(`/setores/${sectorId}/perguntas`)} />);
  const questionRoute = path.match(/^\/setores\/(\d+)\/perguntas$/);
  if (questionRoute) return shell(<SectorQuestionsPage sectorId={Number(questionRoute[1])} canManageStandards={user.role === "superuser"} />);
  if (path === "/perguntas-padrao/nova") return user.role === "superuser" ? shell(<QuestionCreationPage type="standard" onDone={() => navigate("/setores")} />) : shell(<ErrorState />);
  if (path === "/nps/novo") return user.role === "superuser" ? shell(<QuestionCreationPage type="nps" onDone={() => navigate("/setores")} />) : shell(<ErrorState />);
  if (path === "/paginas/lgpd") return user.role === "superuser" ? shell(<EditPage />) : shell(<ErrorState />);
  if (path === "/planilhas-turnos") return user.role === "superuser" ? shell(<ShiftSheetsPage />) : shell(<ErrorState />);
  if (path === "/tv-wall/config") return user.role === "superuser" ? shell(<TvWallConfig userId={user.id} />) : shell(<EmptyState title="Acesso restrito">Esta página exige acesso de superusuário.</EmptyState>);
  if (path === "/auditoria") return user.role === "superuser" ? shell(<AuditPage />) : shell(<ErrorState />);
  if (path === "/ouvidoria") return user.role === "superuser" ? shell(<OmbudsmanPage />) : shell(<EmptyState title="Acesso restrito">Esta página exige acesso de superusuário.</EmptyState>);
  if (path === "/lgpd") return shell(<PublicPage />);
  if (path === "/erro") return shell(<ErrorState />);
  if (path !== "/") return shell(<EmptyState title="Página não encontrada">Verifique o endereço ou volte para o início.</EmptyState>);
  return shell(<AnalyticsPage userId={user.id} canManage={user.role === "superuser"} />);
}

function Router() {
  const { status, restore, sessionExpired, user } = useAuth(); const { path, navigate } = usePath();
  const submissionRoute = path.match(/^\/avaliacao\/(\d+)$/);
  const ticketRoute = path.match(/^\/manifestacao\/(\d+)$/);
  useEffect(() => { if (status === "anonymous" && ["/trocar-senha-temporaria", "/conta", "/relatorios", "/gestores", "/setores", "/paginas/lgpd", "/planilhas-turnos", "/auditoria", "/ouvidoria"].includes(path)) navigate("/entrar"); }, [navigate, path, status]);
  if (submissionRoute) return <PublicSubmissionPage sectorId={Number(submissionRoute[1])} />;
  if (ticketRoute) return <PublicOmbudsmanPage sectorId={Number(ticketRoute[1])} />;
  if (path === "/manifestacao") return <PublicOmbudsmanPage />;
  if (status === "checking") return <main className="fhdod-auth-page"><LoadingState /></main>;
  if (status === "unavailable") return <main className="fhdod-auth-page"><ErrorState /><button className="btn fhdod-button fhdod-button--primary mt-3" type="button" onClick={() => { void restore(); }}>Tentar novamente</button></main>;
  if (status === "anonymous") {
    if (path === "/lgpd") return <main className="fhdod-auth-page"><PublicPage /></main>;
    if (path === "/trocar-senha-temporaria" || path === "/conta") return <main className="fhdod-auth-page"><EmptyState title="Sua sessão terminou">Entre novamente para continuar.</EmptyState></main>;
    return <main className="fhdod-auth-page"><FhdodLogo className="fhdod-auth-logo" /><LoginForm onSuccess={() => navigate("/")} sessionExpired={sessionExpired} /></main>;
  }
  return <AccountQueries key={`${user?.id}:${user?.role}`}><AuthenticatedApp /></AccountQueries>;
}

const queryClient = new QueryClient();
export function App() { return <QueryClientProvider client={queryClient}>{window.location.pathname === "/tv-wall" ? <TvWall /> : <AuthProvider><Router /></AuthProvider>}</QueryClientProvider>; }
