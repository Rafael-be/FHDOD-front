import { useEffect, useState, type FormEvent } from "react";
import { Alert, EmptyState, LoadingState } from "../components/ui/Feedback";
import { Button } from "../components/ui/Button";
import { ApiError } from "../services/http";
import { sectorsService, type Sector } from "./sectors";
import { analyticsService, type AnalyticsDashboard } from "./analytics";

const format = (value: number | null, digits = 1) => value === null ? "Indisponível" : Number(value).toLocaleString("pt-BR", { maximumFractionDigits: digits });
const today = () => new Date().toLocaleDateString("en-CA");
const monthStart = () => `${today().slice(0, 7)}-01`;
function Card({ label, value }: { label: string; value: string }) {
  return <article className="fhdod-profile-card"><small className="text-secondary">{label}</small><p className="h3 mb-0">{value}</p></article>;
}
function Bars({ title, rows }: { title: string; rows: { label: string; value: number }[] }) {
  const max = Math.max(1, ...rows.map((row) => row.value));
  return <section className="fhdod-profile-card"><h2 className="h5">{title}</h2>
    {rows.length === 0 ? <p>Sem dados no período.</p> : rows.map((row) => <div className="mb-2" key={row.label}>
      <div className="d-flex justify-content-between"><span>{row.label}</span><strong>{format(row.value)}</strong></div>
      <div className="progress" role="img" aria-label={`${row.label}: ${format(row.value)}`}><div className="progress-bar" style={{ width: `${(row.value / max) * 100}%` }} /></div>
    </div>)}</section>;
}
function Trend({ data }: { data: AnalyticsDashboard["daily"] }) {
  if (!data.length) return <EmptyState title="Sem evolução">Não houve sessões no período.</EmptyState>;
  const width = 600, height = 170, max = Math.max(1, ...data.map((day) => day.started));
  const point = (value: number, index: number) => `${20 + index * 560 / Math.max(1, data.length - 1)},${150 - value * 130 / max}`;
  return <section className="fhdod-profile-card"><h2 className="h5">Evolução das pesquisas</h2><svg viewBox={`0 0 ${width} ${height}`} className="w-100" role="img" aria-label="Linha de pesquisas iniciadas e concluídas por dia">
    <line x1="20" y1="150" x2="580" y2="150" stroke="#8898a8" />
    <polyline points={data.map((day, index) => point(day.started, index)).join(" ")} fill="none" stroke="#136d9a" strokeWidth="3" />
    <polyline points={data.map((day, index) => point(day.complete, index)).join(" ")} fill="none" stroke="#2f9562" strokeWidth="3" />
  </svg><p className="small mb-0"><span style={{ color: "#136d9a" }}>●</span> Iniciadas · <span style={{ color: "#2f9562" }}>●</span> Concluídas</p>
    <p className="small text-secondary mb-0">De {data[0].day} até {data[data.length - 1].day}; consulte os valores pelos demais indicadores.</p></section>;
}

export function AnalyticsPage({ canManage }: { canManage: boolean }) {
  const [from, setFrom] = useState(monthStart);
  const [to, setTo] = useState(today);
  const [sectorId, setSectorId] = useState("");
  const [shiftRangeId, setShiftRangeId] = useState("");
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [data, setData] = useState<AnalyticsDashboard | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  useEffect(() => { sectorsService.list().then(setSectors).catch(() => setError("Não foi possível carregar os setores.")); }, []);
  const load = async (event?: FormEvent) => {
    event?.preventDefault();
    if (to < from) { setError("A data final deve ser igual ou posterior à inicial."); return; }
    setBusy(true); setError(undefined);
    try {
      const fromIso = new Date(`${from}T00:00:00-03:00`).toISOString();
      const toIso = new Date(new Date(`${to}T00:00:00-03:00`).getTime() + 86400000).toISOString();
      setData(await analyticsService.dashboard({ from: fromIso, to: toIso, sectorId: sectorId ? Number(sectorId) : undefined, shiftRangeId: shiftRangeId ? Number(shiftRangeId) : undefined }));
    } catch (cause) { setError(cause instanceof ApiError ? cause.message : "Não foi possível carregar os indicadores."); }
    finally { setBusy(false); }
  };
  useEffect(() => { void load(); }, []);
  const names = new Map(sectors.map((sector) => [sector.id, sector.name]));
  const totalRatings = data?.questions.filter((question) => !question.is_nps).reduce((sum, question) => sum + Number(question.responses), 0) ?? 0;
  const weightedMean = totalRatings ? data!.questions.filter((question) => !question.is_nps && question.mean !== null).reduce((sum, question) => sum + Number(question.mean) * Number(question.responses), 0) / totalRatings : null;
  const tickets = data?.ombudsman.reduce((sum, row) => sum + Number(row.tickets), 0) ?? 0;
  return <section><div className="fhdod-page-heading"><div><p className="eyebrow">Indicadores</p><h1>Experiência do paciente</h1><p>Dados agregados da API para os setores autorizados.</p></div></div>
    <form className="fhdod-profile-card mb-3 row g-3 align-items-end" onSubmit={(event) => { void load(event); }}>
      <div className="col-12 col-md-3"><label className="form-label" htmlFor="analytics-from">De</label><input id="analytics-from" className="form-control" type="date" value={from} onChange={(event) => setFrom(event.target.value)} required /></div>
      <div className="col-12 col-md-3"><label className="form-label" htmlFor="analytics-to">Até</label><input id="analytics-to" className="form-control" type="date" value={to} onChange={(event) => setTo(event.target.value)} required /></div>
      <div className="col-12 col-md-3"><label className="form-label" htmlFor="analytics-sector">Setor</label><select id="analytics-sector" className="form-select" value={sectorId} onChange={(event) => setSectorId(event.target.value)}><option value="">Todos os autorizados</option>{sectors.filter((sector) => !sector.deletedAt).map((sector) => <option key={sector.id} value={sector.id}>{sector.name}</option>)}</select></div>
      <div className="col-12 col-md-2"><label className="form-label" htmlFor="analytics-shift">ID da faixa de turno</label><input id="analytics-shift" className="form-control" type="number" min="1" value={shiftRangeId} onChange={(event) => setShiftRangeId(event.target.value)} /></div>
      <div className="col-12 col-md-1"><Button type="submit" loading={busy}>Filtrar</Button></div>
    </form>
    {error && <Alert tone="danger">{error}</Alert>}{!data && busy && <LoadingState />}
    {data && <><div className="row g-3 mb-3">{[
      ["Iniciadas", format(data.sessions.started, 0)], ["Concluídas", format(data.sessions.complete, 0)], ["Incompletas", format(data.sessions.incomplete, 0)],
      ["Avaliações", format(totalRatings, 0)], ["Satisfação média", weightedMean === null ? "Indisponível" : `${format(weightedMean)} / 5`],
      ["NPS", data.nps.value === null ? "Indisponível" : format(data.nps.value)],
      ["Manifestações", format(tickets, 0)],
    ].map(([label, value]) => <div className="col-12 col-sm-6 col-xl-3" key={label}><Card label={label} value={value} /></div>)}</div>
      <div className="row g-3 mb-3"><div className="col-12 col-xl-7"><Trend data={data.daily} /></div><div className="col-12 col-xl-5"><Bars title="Pesquisas por setor" rows={data.sectors.map((row) => ({ label: names.get(row.sector_id) ?? `Setor ${row.sector_id}`, value: Number(row.complete) }))} /></div></div>
      <div className="row g-3 mb-3"><div className="col-12 col-xl-6"><Bars title="Distribuição das notas (1 a 5)" rows={data.distribution.filter((row) => !row.is_nps).map((row) => ({ label: `Nota ${row.score}`, value: Number(row.responses) }))} /></div>
      <div className="col-12 col-xl-6"><Bars title="NPS por grupo" rows={[{ label: "Promotores (9–10)", value: Number(data.nps.promoters) }, { label: "Neutros (7–8)", value: Number(data.nps.passives) }, { label: "Detratores (0–6)", value: Number(data.nps.detractors) }]} />
        <p className="small mt-2">Promotores: {data.nps.responses ? format(100 * data.nps.promoters / data.nps.responses) : "—"}% · Neutros: {data.nps.responses ? format(100 * data.nps.passives / data.nps.responses) : "—"}% · Detratores: {data.nps.responses ? format(100 * data.nps.detractors / data.nps.responses) : "—"}%</p></div></div>
      <Bars title="Ouvidoria por tipo e status" rows={data.ombudsman.map((row) => ({ label: `${names.get(row.sector_id) ?? row.sector_id} · ${row.ticket_type} · ${row.status}`, value: Number(row.tickets) }))} />
      <p className="small text-secondary mt-3">{data.privacyNotice} Taxa sobre atendimentos e atribuição de equipe indisponíveis.</p>
      {!canManage && <p className="small text-secondary">Somente setores vinculados à sua conta.</p>}
    </>}
  </section>;
}
