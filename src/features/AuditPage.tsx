import { useEffect, useState } from "react";
import { Button } from "../components/ui/Button";
import { Alert, EmptyState, ErrorState, LoadingState } from "../components/ui/Feedback";
import { ApiError } from "../services/http";
import { auditService, type AuditRecord } from "./audit";

export function AuditPage() {
  const [records, setRecords] = useState<AuditRecord[]>([]);
  const [cursor, setCursor] = useState<string>();
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  const load = async (next?: string) => {
    setLoading(true);
    setError(undefined);
    try {
      const page = await auditService.list(next, 50);
      setRecords(page.records);
      setCursor(next);
      setNextCursor(page.nextCursor);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Não foi possível carregar a auditoria.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  if (loading) return <LoadingState />;
  if (error) return <><ErrorState /><Alert tone="danger">{error}</Alert></>;
  return <section><div className="fhdod-page-heading"><div><p className="eyebrow">Administração</p><h1>Auditoria</h1><p>Histórico das operações administrativas registradas pelo sistema.</p></div></div>{records.length === 0 ? <EmptyState title="Nenhum registro">Não há registros de auditoria disponíveis.</EmptyState> : <div className="table-responsive bg-white rounded-3 border"><table className="table mb-0"><thead><tr><th>Data</th><th>Ação</th><th>Entidade</th><th>Usuário</th></tr></thead><tbody>{records.map((record) => <tr key={record.id}><td>{new Date(record.createdAt).toLocaleString("pt-BR")}</td><td>{record.action}</td><td>{record.entityType}{record.entityId ? ` #${record.entityId}` : ""}</td><td>{record.actorUserId ?? "Sistema"}</td></tr>)}</tbody></table></div>}<div className="d-flex gap-2 mt-3">{cursor && <Button type="button" variant="secondary" onClick={() => { void load(); }}>Primeira página</Button>}<Button type="button" disabled={!nextCursor} onClick={() => { if (nextCursor) void load(nextCursor); }}>Próxima página</Button></div></section>;
}
