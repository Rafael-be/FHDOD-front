import { useEffect, useState, type FormEvent } from "react";
import { Button } from "../components/ui/Button";
import { Alert, EmptyState, LoadingState } from "../components/ui/Feedback";
import { ApiError } from "../services/http";
import { sectorsService, type Sector } from "./sectors";
import { ombudsmanService, type Ticket, type TicketPage, type TicketStatus, type TicketType } from "./ombudsman";
import { pagesService, type ContentPage } from "./pages";

const types: Record<TicketType, string> = { complaint: "Reclamação", compliment: "Elogio", suggestion_other: "Sugestão ou outro" };
const statuses: Record<TicketStatus, string> = { open: "Aberta", read: "Lida", contact_attempt: "Tentativa de contato", contact_failed: "Contato sem sucesso", resolved: "Resolvida" };
const nextStatuses: Record<TicketStatus, TicketStatus[]> = {
  open: ["read", "contact_attempt", "resolved"], read: ["contact_attempt", "resolved"],
  contact_attempt: ["contact_failed", "resolved"], contact_failed: ["contact_attempt", "resolved"], resolved: [],
};
const messageOf = (cause: unknown) => cause instanceof ApiError ? cause.message : "Não foi possível concluir a solicitação.";

export function PublicOmbudsmanPage({ sectorId: routeSectorId }: { sectorId?: number }) {
  const [sectorId, setSectorId] = useState(routeSectorId ? String(routeSectorId) : ""); const [ticketType, setTicketType] = useState<TicketType>("complaint");
  const [body, setBody] = useState(""); const [phone, setPhone] = useState(""); const [accepted, setAccepted] = useState(false);
  const [policy, setPolicy] = useState<ContentPage | null>(null);
  const [busy, setBusy] = useState(false); const [error, setError] = useState<string>(); const [receipt, setReceipt] = useState<number>();
  useEffect(() => { pagesService.get("lgpd").then(setPolicy).catch(() => setError("A política de privacidade não está disponível para leitura.")); }, []);
  const submit = async (event: FormEvent) => {
    event.preventDefault(); if (!accepted) { setError("Leia e aceite a política de privacidade."); return; }
    setBusy(true); setError(undefined);
    try { const result = await ombudsmanService.create({ sectorId: Number(sectorId), ticketType, body: body.trim(), phone: phone.trim() || undefined, policyAccepted: true }); setReceipt(result.id); setBody(""); setPhone(""); setAccepted(false); }
    catch (cause) { setError(messageOf(cause)); } finally { setBusy(false); }
  };
  return <main className="fhdod-auth-page"><section className="fhdod-profile-card mx-auto"><p className="eyebrow">FHDOD</p><h1>Ouvidoria</h1>
    <p>Envie uma manifestação sobre sua experiência. O telefone é opcional e permite contato posterior.</p>
    {receipt && <Alert tone="success">Manifestação registrada. Protocolo: {receipt}.</Alert>}{error && <Alert tone="danger">{error}</Alert>}
    <form onSubmit={(event) => { void submit(event); }}>
      <label className="form-label" htmlFor="ticket-sector">Código do setor</label><input id="ticket-sector" className="form-control mb-3" type="number" min="1" value={sectorId} onChange={(event) => setSectorId(event.target.value)} readOnly={Boolean(routeSectorId)} required />
      <label className="form-label" htmlFor="ticket-type">Tipo</label><select id="ticket-type" className="form-select mb-3" value={ticketType} onChange={(event) => setTicketType(event.target.value as TicketType)}>{Object.entries(types).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
      <label className="form-label" htmlFor="ticket-body">Mensagem</label><textarea id="ticket-body" className="form-control mb-3" maxLength={300} rows={5} value={body} onChange={(event) => setBody(event.target.value)} required />
      <label className="form-label" htmlFor="ticket-phone">Telefone com DDD (opcional)</label><input id="ticket-phone" className="form-control mb-3" type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} />
      <details className="mb-3"><summary>Política de privacidade</summary>{policy ? <div className="p-2" style={{ whiteSpace: "pre-wrap" }}><h2 className="h5">{policy.title}</h2>{policy.content}</div> : <p>Carregando política...</p>}</details>
      <label className="d-block mb-3"><input type="checkbox" checked={accepted} disabled={!policy} onChange={(event) => setAccepted(event.target.checked)} required /> Li e aceito a política de privacidade vigente.</label>
      <Button type="submit" loading={busy} disabled={!policy}>Enviar manifestação</Button>
    </form></section></main>;
}

export function OmbudsmanPage() {
  const [page, setPage] = useState<TicketPage | null>(null); const [sectors, setSectors] = useState<Sector[]>([]);
  const [sectorId, setSectorId] = useState(""); const [type, setType] = useState(""); const [status, setStatus] = useState("");
  const [pageNumber, setPageNumber] = useState(1); const [selected, setSelected] = useState<Ticket | null>(null);
  const [error, setError] = useState<string>(); const [busy, setBusy] = useState(false);
  const load = async (nextPage = pageNumber) => {
    setBusy(true); setError(undefined);
    try { setPage(await ombudsmanService.list({ page: nextPage, pageSize: 20, sectorId: sectorId ? Number(sectorId) : undefined, ticketType: type ? type as TicketType : undefined, status: status ? status as TicketStatus : undefined })); setPageNumber(nextPage); }
    catch (cause) { setError(messageOf(cause)); } finally { setBusy(false); }
  };
  useEffect(() => { void load(1); sectorsService.list().then(setSectors).catch(() => undefined); }, []);
  const detail = async (id: number) => { try { setSelected(await ombudsmanService.get(id)); } catch (cause) { setError(messageOf(cause)); } };
  const update = async (next: TicketStatus) => {
    if (!selected || !window.confirm(`Alterar status para ${statuses[next]}?`)) return;
    setBusy(true); setError(undefined);
    try { await ombudsmanService.updateStatus(selected.id, next); await detail(selected.id); await load(); }
    catch (cause) { setError(messageOf(cause)); } finally { setBusy(false); }
  };
  return <section><div className="fhdod-page-heading"><div><p className="eyebrow">Administração</p><h1>Ouvidoria</h1><p>Consulte manifestações e acompanhe o atendimento.</p></div></div>
    {error && <Alert tone="danger">{error}</Alert>}
    <form className="fhdod-profile-card mb-3 d-flex flex-wrap gap-2 align-items-end" onSubmit={(event) => { event.preventDefault(); void load(1); }}>
      <label>Setor<select className="form-select" value={sectorId} onChange={(event) => setSectorId(event.target.value)}><option value="">Todos</option>{sectors.map((sector) => <option value={sector.id} key={sector.id}>{sector.name}</option>)}</select></label>
      <label>Tipo<select className="form-select" value={type} onChange={(event) => setType(event.target.value)}><option value="">Todos</option>{Object.entries(types).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
      <label>Status<select className="form-select" value={status} onChange={(event) => setStatus(event.target.value)}><option value="">Todos</option>{Object.entries(statuses).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
      <Button type="submit" loading={busy}>Filtrar</Button>
    </form>
    {!page && busy && <LoadingState />}
    {page && (page.items.length === 0 ? <EmptyState title="Sem manifestações">Nenhum registro corresponde aos filtros.</EmptyState> :
      <div className="table-responsive bg-white rounded-3 border"><table className="table mb-0"><thead><tr><th>Protocolo</th><th>Setor</th><th>Tipo</th><th>Status</th><th>Data</th><th>Ação</th></tr></thead><tbody>{page.items.map((ticket) => <tr key={ticket.id}><td>{ticket.id}</td><td>{sectors.find((sector) => sector.id === ticket.sectorId)?.name ?? ticket.sectorId}</td><td>{types[ticket.ticketType]}</td><td>{statuses[ticket.status]}</td><td>{new Date(ticket.occurredAt).toLocaleString("pt-BR")}</td><td><Button type="button" variant="tertiary" onClick={() => { void detail(ticket.id); }}>Detalhes</Button></td></tr>)}</tbody></table></div>)}
    {page && page.total > page.pageSize && <div className="d-flex gap-2 align-items-center mt-3"><Button type="button" variant="secondary" disabled={busy || pageNumber <= 1} onClick={() => { void load(pageNumber - 1); }}>Anterior</Button><span>Página {pageNumber} de {Math.ceil(page.total / page.pageSize)}</span><Button type="button" variant="secondary" disabled={busy || pageNumber * page.pageSize >= page.total} onClick={() => { void load(pageNumber + 1); }}>Próxima</Button></div>}
    {selected && <section className="fhdod-profile-card mt-3"><h2 className="h5">Manifestação {selected.id}</h2><p><strong>{types[selected.ticketType]}</strong> · {statuses[selected.status]}</p><p style={{ whiteSpace: "pre-wrap" }}>{selected.body}</p><p>Telefone: {selected.phone ?? "não informado"}</p><p className="small text-secondary">Registrada em {new Date(selected.occurredAt).toLocaleString("pt-BR")}</p>
      <div className="d-flex flex-wrap gap-2">{nextStatuses[selected.status].filter((next) => next !== "contact_attempt" || Boolean(selected.phone)).map((next) => <Button key={next} type="button" variant="secondary" disabled={busy} onClick={() => { void update(next); }}>{statuses[next]}</Button>)}<Button type="button" variant="tertiary" onClick={() => setSelected(null)}>Fechar</Button></div>
    </section>}
  </section>;
}
