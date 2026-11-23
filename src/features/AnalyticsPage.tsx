import { useEffect, useState, type FormEvent } from "react";
import { Alert, EmptyState, LoadingState } from "../components/ui/Feedback";
import { Button } from "../components/ui/Button";
import { ApiError } from "../services/http";
import { sectorsService, type Sector } from "./sectors";
import { analyticsService, type AnalyticsDashboard } from "./analytics";

const format = (value: number | null, digits = 1) => value === null ? "Indisponível" : Number(value).toLocaleString("pt-BR", { maximumFractionDigits: digits });
const today = () => new Date().toLocaleDateString("en-CA");
const monthStart = () => `${today().slice(0, 7)}-01`;
function Card({ label, value, priority = false }: { label: string; value: string; priority?: boolean }) {
  return <article className="fhdod-profile-card fhdod-kpi" data-priority={priority ? "high" : "normal"}><small>{label}</small><strong>{value}</strong></article>;
}
function Bars({ title, rows }: { title: string; rows: { label: string; value: number }[] }) {
  const max = Math.max(1, ...rows.map((row) => row.value));
  return <section className="fhdod-profile-card fhdod-chart-panel"><h2>{title}</h2>
    {rows.length === 0 ? <p className="text-secondary">Sem dados no período.</p> : rows.map((row) => <div className="fhdod-chart-row" key={row.label}>
      <div><span>{row.label}</span><strong>{format(row.value, 0)}</strong></div>
      <div className="progress" role="img" aria-label={`${row.label}: ${format(row.value, 0)}`}><div className="progress-bar" style={{ width: `${(row.value / max) * 100}%` }} /></div>
    </div>)}</section>;
}
function Trend({ data }: { data: AnalyticsDashboard["daily"] }) {
  if (!data.length) return <EmptyState title="Sem evolução">Não houve sessões no período.</EmptyState>;
  const width = 600, height = 180, max = Math.max(1, ...data.map((day) => day.started));
  const point = (value: number, index: number) => `${32 + index * 548 / Math.max(1, data.length - 1)},${150 - value * 126 / max}`;
  return <section className="fhdod-profile-card fhdod-chart-panel"><h2>Evolução das pesquisas</h2><svg viewBox={`0 0 ${width} ${height}`} className="w-100" role="img" aria-label="Linha de pesquisas iniciadas e concluídas por dia; valores detalhados na tabela acessível">
    <line className="fhdod-chart-gridline" x1="32" y1="24" x2="580" y2="24" />
    <line className="fhdod-chart-axis" x1="32" y1="150" x2="580" y2="150" />
    <text className="fhdod-chart-axis-label" x="2" y="27">{max}</text>
    <text className="fhdod-chart-axis-label" x="17" y="153">0</text>
    <polyline className="fhdod-chart-line-started" points={data.map((day, index) => point(day.started, index)).join(" ")} fill="none" strokeWidth="3" />
    <polyline className="fhdod-chart-line-complete" points={data.map((day, index) => point(day.complete, index)).join(" ")} fill="none" strokeWidth="3" />
    {data.map((day, index) => <g key={day.day}>
      <circle className="fhdod-chart-point-started" transform={`translate(${point(day.started, index)})`} r="3.5"><title>{day.day}: {day.started} iniciadas</title></circle>
      <circle className="fhdod-chart-point-complete" transform={`translate(${point(day.complete, index)})`} r="2.5"><title>{day.day}: {day.complete} concluídas</title></circle>
    </g>)}
    <text className="fhdod-chart-axis-label" x="32" y="174">{data[0].day}</text>
    {data.length > 1 && <text className="fhdod-chart-axis-label" x="580" y="174" textAnchor="end">{data[data.length - 1].day}</text>}
  </svg><div className="fhdod-chart-legend"><span>Iniciadas</span><span>Concluídas</span></div>
    <p className="small text-secondary mb-0">De {data[0].day} até {data[data.length - 1].day}</p>
    <table className="visually-hidden"><caption>Pesquisas por dia</caption><thead><tr><th>Dia</th><th>Iniciadas</th><th>Concluídas</th></tr></thead><tbody>{data.map((day) => <tr key={day.day}><th>{day.day}</th><td>{day.started}</td><td>{day.complete}</td></tr>)}</tbody></table>
  </section>;
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
  return <section className="fhdod-analytics"><div className="fhdod-page-heading"><div><p className="eyebrow">Indicadores</p><h1>Experiência do paciente</h1><p>Visão das avaliações e manifestações no período selecionado.</p></div></div>
    <form className="fhdod-profile-card fhdod-filter-panel row g-3 align-items-end" onSubmit={(event) => { void load(event); }}>
      <div className="col-12 col-md-3"><label className="form-label" htmlFor="analytics-from">De</label><input id="analytics-from" className="form-control" type="date" value={from} onChange={(event) => setFrom(event.target.value)} required /></div>
      <div className="col-12 col-md-3"><label className="form-label" htmlFor="analytics-to">Até</label><input id="analytics-to" className="form-control" type="date" value={to} onChange={(event) => setTo(event.target.value)} required /></div>
      <div className="col-12 col-md-3"><label className="form-label" htmlFor="analytics-sector">Setor</label><select id="analytics-sector" className="form-select" value={sectorId} onChange={(event) => setSectorId(event.target.value)}><option value="">Todos os autorizados</option>{sectors.filter((sector) => !sector.deletedAt).map((sector) => <option key={sector.id} value={sector.id}>{sector.name}</option>)}</select></div>
      <div className="col-12 col-md-2"><label className="form-label" htmlFor="analytics-shift">ID da faixa de turno</label><input id="analytics-shift" className="form-control" type="number" min="1" value={shiftRangeId} onChange={(event) => setShiftRangeId(event.target.value)} /></div>
      <div className="col-12 col-md-1"><Button type="submit" loading={busy}>Aplicar</Button></div>
    </form>
    {error && <Alert tone="danger">{error}</Alert>}{!data && busy && <LoadingState />}
    {data && <><div className="fhdod-kpi-grid">
      <Card label="Pesquisas concluídas" value={format(data.sessions.complete, 0)} priority />
      <Card label="Satisfação média" value={weightedMean === null ? "Indisponível" : `${format(weightedMean)} / 5`} priority />
      <Card label="NPS" value={data.nps.value === null ? "Indisponível" : format(data.nps.value)} priority />
    </div>
      <div className="fhdod-summary-strip" aria-label="Outros indicadores">{[
        ["Iniciadas", format(data.sessions.started, 0)],
        ["Incompletas", format(data.sessions.incomplete, 0)],
        ["Avaliações", format(totalRatings, 0)],
        ["Manifestações", format(tickets, 0)],
      ].map(([label, value]) => <div key={label}><small>{label}</small><strong>{value}</strong></div>)}</div>
      <div className="fhdod-chart-grid"><Trend data={data.daily} /><Bars title="Pesquisas por setor" rows={data.sectors.map((row) => ({ label: names.get(row.sector_id) ?? `Setor ${row.sector_id}`, value: Number(row.complete) }))} /></div>
      <div className="fhdod-chart-grid fhdod-chart-grid--equal"><Bars title="Distribuição das notas (1 a 5)" rows={data.distribution.filter((row) => !row.is_nps).map((row) => ({ label: `Nota ${row.score}`, value: Number(row.responses) }))} />
      <div><Bars title="NPS por grupo" rows={[{ label: "Promotores (9–10)", value: Number(data.nps.promoters) }, { label: "Neutros (7–8)", value: Number(data.nps.passives) }, { label: "Detratores (0–6)", value: Number(data.nps.detractors) }]} />
        <p className="small mt-2">Promotores: {data.nps.responses ? format(100 * data.nps.promoters / data.nps.responses) : "—"}% · Neutros: {data.nps.responses ? format(100 * data.nps.passives / data.nps.responses) : "—"}% · Detratores: {data.nps.responses ? format(100 * data.nps.detractors / data.nps.responses) : "—"}%</p></div></div>
      <Bars title="Ouvidoria por tipo e status" rows={data.ombudsman.map((row) => ({ label: `${names.get(row.sector_id) ?? row.sector_id} · ${row.ticket_type} · ${row.status}`, value: Number(row.tickets) }))} />
      <p className="small text-secondary mt-3">{data.privacyNotice} Taxa sobre atendimentos e atribuição de equipe indisponíveis.</p>
      {!canManage && <p className="small text-secondary">Somente setores vinculados à sua conta.</p>}
    </>}
  </section>;
}
