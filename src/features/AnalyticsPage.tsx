import { useState, type CSSProperties, type FormEvent } from "react";
import { Alert, EmptyState, LoadingState } from "../components/ui/Feedback";
import { Button } from "../components/ui/Button";
import { useQuery } from "@tanstack/react-query";
import { GlobalQuestions } from "./GlobalQuestions";
import { sectorsService, type Sector } from "./sectors";
import { analyticsService, type AnalyticsDashboard, type AnalyticsFilter } from "./analytics";

const decimal = new Intl.NumberFormat("pt-BR", {maximumFractionDigits: 1});
const integer = new Intl.NumberFormat("pt-BR", {maximumFractionDigits: 0});
const format = (value: number | null, digits = 1) => value === null ? "Indisponível" : (digits ? decimal : integer).format(value);
const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
const monthStart = () => `${today().slice(0, 7)}-01`;

function Card({ label, value, priority = false }: { label: string; value: string; priority?: boolean }) {
  return <article className="fhdod-profile-card fhdod-kpi" data-priority={priority ? "high" : "normal"}><small>{label}</small><strong>{value}</strong></article>;
}
function Bars({ title, rows }: { title: string; rows: { label: string; value: number }[] }) {
  const max = Math.max(1, ...rows.map((row) => row.value));
  return <section className="fhdod-profile-card fhdod-chart-panel"><h2>{title}</h2>{rows.length === 0 ? <p className="text-secondary">Sem dados no período.</p> : rows.map((row) => <div className="fhdod-chart-row" key={row.label}><div><span>{row.label}</span><strong>{format(row.value, 0)}</strong></div><div className="progress" role="img" aria-label={`${row.label}: ${format(row.value, 0)}`}><div className="progress-bar" style={{ width: `${(row.value / max) * 100}%` }} /></div></div>)}</section>;
}
function Donut({ rows }: { rows: { label: string; value: number; score: number }[] }) {
  const total = rows.reduce((sum, row) => sum + row.value, 0); const colors = ["var(--color-primary)", "var(--color-primary-border)", "var(--color-text-muted)", "var(--color-border-strong)", "var(--color-success)"]; let cursor = 0;
  const stops = rows.map((row) => { const start = cursor; cursor += total ? row.value / total * 100 : 0; return `${colors[row.score - 1]} ${start}% ${cursor}%`; });
  return <section className="fhdod-profile-card fhdod-chart-panel"><h2>Distribuição de notas gerais</h2>{!rows.length || !total ? <p className="text-secondary">Sem dados no período.</p> : <div className="fhdod-donut-layout"><div className="fhdod-donut" role="img" aria-label={`Distribuição de notas: ${format(total, 0)} respostas`} style={{ background: `conic-gradient(${stops.join(", ")})` }} /><ul className="fhdod-donut-legend">{rows.map(row => <li key={row.label} style={{ "--legend-color": colors[row.score - 1] } as CSSProperties}><span>{row.label}</span><strong>{format(row.value, 0)}</strong><small>{format(row.value / total * 100)}%</small></li>)}</ul></div>}</section>;
}
function Trend({ data }: { data: AnalyticsDashboard["daily"] }) {
  if (!data.length) return <EmptyState title="Sem evolução">Não houve sessões no período.</EmptyState>;
  const width = 600, height = 180, max = Math.max(1, ...data.map((day) => day.started)); const point = (value: number, index: number) => `${32 + index * 548 / Math.max(1, data.length - 1)},${150 - value * 126 / max}`;
  return <section className="fhdod-profile-card fhdod-chart-panel"><h2>Evolução das pesquisas</h2><svg viewBox={`0 0 ${width} ${height}`} className="w-100" role="img" aria-label="Linha de pesquisas iniciadas e concluídas por dia; valores nos pontos do gráfico"><line className="fhdod-chart-gridline" x1="32" y1="24" x2="580" y2="24" /><line className="fhdod-chart-axis" x1="32" y1="150" x2="580" y2="150" /><text className="fhdod-chart-axis-label" x="2" y="27">{max}</text><text className="fhdod-chart-axis-label" x="17" y="153">0</text><polyline className="fhdod-chart-line-started" points={data.map((day, index) => point(day.started, index)).join(" ")} fill="none" strokeWidth="3" /><polyline className="fhdod-chart-line-complete" points={data.map((day, index) => point(day.complete, index)).join(" ")} fill="none" strokeWidth="3" />{data.map((day, index) => <g key={day.day}><circle className="fhdod-chart-point-started" transform={`translate(${point(day.started, index)})`} r="3.5"><title>{day.day}: {day.started} iniciadas</title></circle><circle className="fhdod-chart-point-complete" transform={`translate(${point(day.complete, index)})`} r="2.5"><title>{day.day}: {day.complete} concluídas</title></circle></g>)}<text className="fhdod-chart-axis-label" x="32" y="174">{data[0].day}</text>{data.length > 1 && <text className="fhdod-chart-axis-label" x="580" y="174" textAnchor="end">{data[data.length - 1].day}</text>}</svg><div className="fhdod-chart-legend"><span>Iniciadas</span><span>Concluídas</span></div><p className="small text-secondary mb-0">De {data[0].day} até {data[data.length - 1].day}</p></section>;
}
function dateFilter(from: string, to: string): AnalyticsFilter {
  return {
    from: new Date(`${from}T00:00:00-03:00`).toISOString(),
    to: new Date(Date.parse(`${to}T00:00:00-03:00`) + 86400000).toISOString(),
  };
}
export function AnalyticsPage({ canManage, userId }: { canManage: boolean; userId: number }) {
  const [from, setFrom] = useState(monthStart);
  const [to, setTo] = useState(today);
  const [ids, setIds] = useState<number[]>([]);
  const [shift, setShift] = useState("");
  const [filter, setFilter] = useState(() => dateFilter(from, to));
  const [error, setError] = useState("");
  const scope = [userId, canManage];
  const sectors = useQuery({ queryKey: ["sectors", ...scope], queryFn: () => sectorsService.list(), retry: false, staleTime: 60000 });
  const dashboard = useQuery({ queryKey: ["dashboard", ...scope, filter], queryFn: ({signal}) => analyticsService.dashboard(filter, signal), retry: false, staleTime: 60000 });
  const questions = useQuery({ queryKey: ["global-questions", ...scope, filter], queryFn: ({signal}) => analyticsService.questions(filter, signal), retry: false, staleTime: 60000 });
  const apply = (event: FormEvent) => {
    event.preventDefault();
    const period = dateFilter(from, to);
    const days = (Date.parse(period.to) - Date.parse(period.from)) / 86400000;
    if (days <= 0 || days > 366 || ids.length > 200) {
      setError("Escolha um período de 1 a 366 dias e até 200 setores.");
      return;
    }
    setError("");
    setFilter({ ...period, sectorIds: ids, shiftRangeId: Number(shift) || undefined });
  };
  const names = new Map((sectors.data ?? []).map((sector: Sector) => [sector.id, sector.name]));
  const name = (id: number) => names.get(id) ?? `Setor ${id}`;
  const selected = filter.sectorIds?.length ? filter.sectorIds : [...names.keys()];
  const data = dashboard.isError ? undefined : dashboard.data;
  const notes = data?.distribution.filter(row => !row.is_nps) ?? [];
  const ratings = notes.reduce((total, row) => total + row.responses, 0);
  const nps = data?.nps.value;
  const npsLabel = nps == null ? "Sem respostas NPS" : nps !== 0 && Math.abs(nps) < 0.5 ? "≈ 0" : format(nps, 0);
  const percentage = (value: number | null) => value === null ? "Sem respostas" : `${format(value)}%`;
  return <section className="fhdod-analytics">
    <div className="fhdod-page-heading"><div><p className="eyebrow">Indicadores</p><h1>Experiência do paciente</h1></div></div>
    <form className="fhdod-profile-card d-flex flex-wrap align-items-end gap-3 mb-3" onSubmit={apply}>
      <label>De<input className="form-control" type="date" value={from} onChange={event => setFrom(event.target.value)} required /></label>
      <label>Até<input className="form-control" type="date" value={to} onChange={event => setTo(event.target.value)} required /></label>
      <label>Setores<select className="form-select" multiple value={ids.map(String)} onChange={event => setIds(Array.from(event.target.selectedOptions, option => Number(option.value)).sort((a,b) => a-b))}>
        {(sectors.data ?? []).map(sector => <option key={sector.id} value={sector.id}>{sector.name}</option>)}
      </select><small>Seleção vazia inclui todos os autorizados.</small></label>
      <label>ID da faixa de turno<input className="form-control" type="number" min="1" value={shift} onChange={event => setShift(event.target.value)} /></label>
      <Button type="submit">Aplicar</Button>
    </form>
    {error && <Alert tone="danger">{error}</Alert>}
    {sectors.isError && <Alert tone="danger">{sectors.error.message}</Alert>}
    {dashboard.isError && <Alert tone="danger">{dashboard.error.message} <button onClick={() => void dashboard.refetch()}>Tentar novamente</button></Alert>}
    {dashboard.isPending && <LoadingState />}
    {data && <>
      <div className="fhdod-kpi-grid">
        <Card label="NPS médio" value={npsLabel} priority />
        <Card label="Satisfação média" value={ratings ? `${format(notes.reduce((sum, row) => sum + row.responses * row.score, 0) / ratings)} / 5` : "Sem respostas"} />
        {canManage && <Card label="Manifestações" value={format(data.ombudsman.reduce((total, item) => total + item.tickets, 0))} />}
        <Card label="Iniciadas" value={format(data.sessions.started)} />
        <Card label="Completas" value={format(data.sessions.complete)} />
        <Card label="Não concluídas" value={format(data.sessions.incomplete)} />
        <Card label="Em andamento" value={format(data.sessions.inProgress)} />
        <Card label="Taxa de conclusão" value={percentage(data.sessions.completionRate)} />
        <Card label="Percentual não concluído" value={percentage(data.sessions.nonCompletionRate)} />
      </div>
      <div className={`fhdod-chart-grid${selected.length === 1 ? " fhdod-chart-grid--single" : ""}`}>
        <Trend data={data.daily} />
        {selected.length !== 1 && <Bars title="Pesquisas completas por setor" rows={data.sectors.map(row => ({ label: name(row.sector_id), value: row.complete }))} />}
      </div>
      <div className="fhdod-chart-grid fhdod-chart-grid--equal">
        <Donut rows={notes.map(row => ({ label: `Nota ${row.score}`, value: row.responses, score: row.score }))} />
        <Bars title="Classificação do NPS" rows={data.nps.responses ? [
          { label: "Bons (9–10)", value: data.nps.promoters }, { label: "Neutros (7–8)", value: data.nps.passives }, { label: "Ruins (0–6)", value: data.nps.detractors }
        ].map(row => ({ ...row, label: `${row.label} · ${percentage(100 * row.value / data.nps.responses)}` })) : []} />
      </div>
      <section className="fhdod-profile-card fhdod-chart-panel mb-3">
        <h2>Pesquisas por turno</h2>
        {data.sessions.complete === 0 && <p>Sem pesquisas completas no período.</p>}
        {data.shifts.map(row => <div className="fhdod-chart-row" key={row.id}>
          <div><span>{row.name} · {name(row.sector_id)}</span><strong>{row.completed}</strong></div>
          <div className="progress"><div className="progress-bar" style={{width: `${row.percentage ?? 0}%`}} /></div>
        </div>)}
        <ul className="list-inline">{data.shifts.map(row => <li className="list-inline-item" key={row.id}>{row.name} · {name(row.sector_id)} — {row.completed} ({row.percentage === null ? "sem base" : percentage(row.percentage)})</li>)}</ul>
        <p>Sem turno identificado: {data.unclassifiedCompleted}</p>
      </section>
      {canManage && <Bars title="Ouvidoria por tipo e status" rows={data.ombudsman.map(row => ({ label: `${name(row.sector_id)} · ${row.ticket_type} · ${row.status}`, value: row.tickets }))} />}
      <p className="small text-secondary">{data.privacyNotice}</p>
    </>}
    {questions.isPending && <LoadingState />}
    {questions.isError && <Alert tone="danger">{questions.error.message} <button onClick={() => void questions.refetch()}>Tentar novamente</button></Alert>}
    {questions.isSuccess && <GlobalQuestions rows={questions.data} selected={selected} name={name} />}
  </section>;
}
