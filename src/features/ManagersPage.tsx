import { useEffect, useState } from "react";
import { Alert, EmptyState, ErrorState, LoadingState } from "../components/ui/Feedback";
import { ApiError } from "../services/http";
import { managersService, type Manager } from "./managers";

export function ManagersPage() {
  const [items, setItems] = useState<Manager[] | null>(null); const [error, setError] = useState(false);
  useEffect(() => { let active = true; managersService.list().then((value) => { if (active) setItems(value); }).catch((cause: unknown) => { if (active && cause instanceof ApiError && cause.status === 403) setError(true); else if (active) setError(true); }); return () => { active = false; }; }, []);
  if (error) return <ErrorState />; if (!items) return <LoadingState />;
  if (!items.length) return <EmptyState title="Nenhum gestor cadastrado">Crie um gestor para administrar os setores permitidos.</EmptyState>;
  return <section><div className="fhdod-page-heading"><div><p className="eyebrow">Administração</p><h1>Gestores</h1><p>Usuários gestores ativos e seus dados institucionais.</p></div></div><div className="table-responsive bg-white rounded-3 border"><table className="table mb-0"><thead><tr><th scope="col">Nome</th><th scope="col">E-mail</th><th scope="col">Situação</th></tr></thead><tbody>{items.map((manager) => <tr key={manager.id}><td>{manager.fullName}</td><td>{manager.email}</td><td>{manager.deletedAt ? "Inativo" : "Ativo"}</td></tr>)}</tbody></table></div><Alert tone="info">Criação, edição, desativação e vínculos serão acrescentados nesta mesma entrega após validação integrada da API.</Alert></section>;
}
