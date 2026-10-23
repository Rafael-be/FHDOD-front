import { AppLayout } from "../components/layout/AppLayout";
import { Alert, EmptyState, ErrorState } from "../components/ui/Feedback";
import { StatusBadge } from "../components/ui/StatusBadge";

function Home() {
  return <AppLayout><div className="fhdod-page-heading"><div><p className="eyebrow">FHDOD</p><h1>Fundação visual pronta</h1><p>Estrutura, componentes e comunicação HTTP da Fase 1 foram configurados.</p></div><StatusBadge status="pending" /></div><Alert tone="info">Autenticação e módulos administrativos serão implementados nas próximas entregas.</Alert><EmptyState title="Nenhum dado para exibir">Esta base ainda não executa chamadas de negócio.</EmptyState></AppLayout>;
}

export function App() {
  if (window.location.pathname === "/") return <Home />;
  if (window.location.pathname === "/erro") return <AppLayout><ErrorState /></AppLayout>;
  return <AppLayout><EmptyState title="Página não encontrada">Verifique o endereço ou volte para o início.</EmptyState></AppLayout>;
}
