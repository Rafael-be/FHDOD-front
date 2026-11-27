import { useState, type CSSProperties, type FormEvent } from "react";
import { Alert, EmptyState, LoadingState } from "../components/ui/Feedback";
import { Button } from "../components/ui/Button";
import { useQuery } from "@tanstack/react-query";
import { CriticalRanking, QuestionDistribution, SatisfactionHeatmap, ShiftOverview } from "./AnalyticsInsights";
import { npsMean, satisfaction } from "./analyticsMetrics";
import { sectorsService, type Sector } from "./sectors";
import { analyticsService, completionIndicators, type AnalyticsDashboard, type AnalyticsFilter } from "./analytics";
import { dashboardForShift, shiftNames, type ShiftName } from "./analyticsAggregation";
import { npsGroupColors, satisfactionScoreColors } from "./analyticsChartColors";

const decimal = new Intl.NumberFormat("pt-BR", {maximumFractionDigits: 1});
const integer = new Intl.NumberFormat("pt-BR", {maximumFractionDigits: 0});
const format = (value: number | null, digits = 1) => value === null ? "Indisponível" : (digits ? decimal : integer).format(value);
const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
const monthStart = () => `${today().slice(0, 7)}-01`;

function Card({ label, value, priority = false }: { label: string; value: string; priority?: boolean }) {
  return <article className="fhdod-profile-card fhdod-kpi" data-priority={priority ? "high" : "normal"}><small>{label}</small><strong>{value}</strong></article>;
}
export function Bars({ title, rows }: { title: string; rows: { label: string; value: number; color?: string }[] }) {
  const max = Math.max(1, ...rows.map((row) => row.value));
  return <section className="fhdod-profile-card fhdod-chart-panel"><h2>{title}</h2>{rows.length === 0 ? <p className="text-secondary">Sem dados no período.</p> : rows.map((row) => <div className="fhdod-chart-row" key={row.label}><div><span>{row.label}</span><strong>{format(row.value, 0)}</strong></div><div className="progress" role="img" aria-label={`${row.label}: ${format(row.value, 0)}`}><div className="progress-bar" style={{ width: `${(row.value / max) * 100}%`, background: row.color }} /></div></div>)}</section>;
}
export function Donut({ rows, title = "Distribuição de notas gerais", emptyMessage = "Sem dados no período." }: { rows: { label: string; value: number; score: number }[]; title?: string; emptyMessage?: string }) {
  const [activeScore, setActiveScore] = useState<number | null>(null);
  const total = rows.reduce((sum, row) => sum + row.value, 0);
  let cursor = 0;
  const stops = rows.filter(row => row.value > 0).map(row => { const start = cursor; cursor += row.value / total * 100; return `${satisfactionScoreColors[row.score]} ${start}% ${cursor}%`; });
  return <section className="fhdod-profile-card fhdod-chart-panel fhdod-donut-panel"><h2>{title}</h2>{!total && <p className="text-secondary">{emptyMessage}</p>}
    <div className="fhdod-donut-layout"><div className="fhdod-donut" role="img" aria-label={`Distribuição de notas: ${format(total, 0)} respostas`} style={{ background: total ? `conic-gradient(${stops.join(", ")})` : "var(--color-surface-muted)" }} />
      <ul className="fhdod-donut-legend">{rows.map(row => { const percent = total ? row.value / total * 100 : 0; return <li key={row.label} role="button" tabIndex={0} aria-pressed={activeScore === row.score} data-active={activeScore === row.score} onClick={() => setActiveScore(current => current === row.score ? null : row.score)} onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setActiveScore(current => current === row.score ? null : row.score); } }} style={{ "--legend-color": satisfactionScoreColors[row.score] } as CSSProperties} aria-label={`${row.label}: ${format(row.value, 0)} respostas, ${format(percent)}%`}><span>{row.label}</span><strong>{format(percent)}%</strong><span className="fhdod-donut-detail" role="tooltip">{format(row.value, 0)} respostas · {format(percent)}%</span></li>; })}</ul>
    </div></section>;
}
function Trend({ data }: { data: AnalyticsDashboard["daily"] }) {
  if (!data.length) return <EmptyState title="Sem evolução">Não houve sessões no período.</EmptyState>;
  const width = 600, height = 180, max = Math.max(1, ...data.flatMap(day => [day.started, day.complete]));
  const point = (value: number, index: number) => `${data.length === 1 ? 306 : 32 + index * 548 / (data.length - 1)},${150 - value * 126 / max}`;
  const date = (day: string) => { const [year, month, date] = day.slice(0, 10).split("-"); return `${date}/${month}/${year}`; };
  return <section className="fhdod-profile-card fhdod-chart-panel"><h2>Evolução das pesquisas</h2><svg viewBox={`0 0 ${width} ${height}`} className="w-100" role="img" aria-label="Evolução diária das pesquisas iniciadas e concluídas"><line className="fhdod-chart-gridline" x1="32" y1="24" x2="580" y2="24" /><line className="fhdod-chart-axis" x1="32" y1="150" x2="580" y2="150" /><text className="fhdod-chart-axis-label" x="2" y="27">{max}</text><text className="fhdod-chart-axis-label" x="17" y="153">0</text><polyline className="fhdod-chart-line-complete" points={data.map((day, index) => point(day.complete, index)).join(" ")} fill="none" /><polyline className="fhdod-chart-line-started" points={data.map((day, index) => point(day.started, index)).join(" ")} fill="none" />{data.map((day, index) => <g key={day.day}><circle className="fhdod-chart-point-started" transform={`translate(${point(day.started, index)})`} r="4"><title>{date(day.day)}: {day.started} iniciadas</title></circle><circle className="fhdod-chart-point-complete" transform={`translate(${point(day.complete, index)})`} r="3"><title>{date(day.day)}: {day.complete} concluídas</title></circle>{data.length === 1 && <><text className="fhdod-chart-value-started" x="318" y={Math.max(19, 150 - day.started * 126 / max - 7)}>Iniciadas: {day.started}</text><text className="fhdod-chart-value-complete" x="318" y={Math.min(165, 150 - day.complete * 126 / max + 15)}>Concluídas: {day.complete}</text></>}</g>)}<text className="fhdod-chart-axis-label" x={data.length === 1 ? "306" : "32"} textAnchor={data.length === 1 ? "middle" : undefined} y="174">{date(data[0].day)}</text>{data.length > 1 && <text className="fhdod-chart-axis-label" x="580" y="174" textAnchor="end">{date(data[data.length - 1].day)}</text>}</svg><div className="fhdod-chart-legend"><span>Iniciadas</span><span>Concluídas</span></div><p className="small text-secondary mb-0">De {date(data[0].day)} até {date(data[data.length - 1].day)}</p><table className="visually-hidden"><caption>Dados diários da evolução das pesquisas</caption><thead><tr><th>Data</th><th>Iniciadas</th><th>Concluídas</th></tr></thead><tbody>{data.map(day => <tr key={day.day}><th>{date(day.day)}</th><td>{day.started}</td><td>{day.complete}</td></tr>)}</tbody></table></section>;
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
  const [sectorId, setSectorId] = useState("");
  const [shift, setShift] = useState<"" | ShiftName>("");
  const [appliedShift, setAppliedShift] = useState<"" | ShiftName>("");
  const [criticalLimit, setCriticalLimit] = useState<3 | 5>(5);
  const [filter, setFilter] = useState(() => dateFilter(from, to));
  const [error, setError] = useState("");
  const scope = [userId, canManage];
  const sectors = useQuery({ queryKey: ["sectors", ...scope], queryFn: () => sectorsService.list(), retry: false, staleTime: 60000 });
  const base = useQuery({ queryKey: ["dashboard", ...scope, filter], queryFn: ({signal}) => analyticsService.dashboard(filter, signal), retry: false, staleTime: 60000 });
  const dashboard = useQuery({ queryKey: ["dashboard-view", ...scope, filter, appliedShift], enabled: !!base.data, queryFn: ({signal}) => appliedShift ? dashboardForShift(filter, base.data!, appliedShift, signal) : base.data!, retry: false, staleTime: 60000 });
  const singleSector = filter.sectorId ?? null;
  const heatmap = useQuery({ queryKey: ["analytics-heatmap", ...scope, filter], queryFn: ({signal}) => analyticsService.heatmap(filter,signal), enabled: !appliedShift, retry: false, staleTime: 60000 });
  const distribution = useQuery({ queryKey: ["analytics-question-distribution", ...scope, filter], queryFn: ({signal}) => analyticsService.questionDistribution(filter,signal), enabled: singleSector !== null && !appliedShift, retry: false, staleTime: 60000 });
  const critical = useQuery({ queryKey: ["analytics-critical", ...scope, filter, criticalLimit], queryFn: ({signal}) => analyticsService.criticalQuestions(filter,criticalLimit,signal), enabled: !appliedShift, retry: false, staleTime: 60000 });
  const apply = (event: FormEvent) => {
    event.preventDefault();
    const period = dateFilter(from, to);
    const days = (Date.parse(period.to) - Date.parse(period.from)) / 86400000;
    if (days <= 0 || days > 366) {
      setError("Escolha um período de 1 a 366 dias.");
      return;
    }
    setError("");
    setFilter({ ...period, sectorId: Number(sectorId) || undefined });
    setAppliedShift(shift);
  };
  const available = Array.from(new Map((sectors.data ?? []).filter((sector: Sector) => !sector.deletedAt).map((sector: Sector) => [sector.id, sector])).values());
  const names = new Map(available.map((sector) => [sector.id, sector.name]));
  const name = (id: number) => names.get(id) ?? `Setor ${id}`;
  const selected = filter.sectorId ? [filter.sectorId] : [...names.keys()];
  const data = dashboard.isError ? undefined : dashboard.data;
  const completion = data ? completionIndicators(data) : null;

  const notes = data?.distribution.filter(row => !row.is_nps) ?? [];
  const noteBuckets = [1, 2, 3, 4, 5].map(score => ({score, responses: notes.find(row => row.score === score)?.responses ?? 0}));
  const ratings = data ? satisfaction(data) : null;
  const meanNps = data ? npsMean(data) : null;
  const percentage = (value: number | null) => value === null ? "Sem respostas" : `${format(value)}%`;
  const completionPercentage = (value: number | null | undefined) => value == null ? "Indisponível" : value > 0 && value < 100 && decimal.format(value) === "100" ? "< 100%" : percentage(value);
  return <section className="fhdod-analytics">
    <div className="fhdod-page-heading"><div><p className="eyebrow">Indicadores</p><h1>Experiência do paciente</h1><p>Visão das avaliações e manifestações no período selecionado.</p></div></div>
    <form className="fhdod-profile-card fhdod-filter-panel row g-3 align-items-end" onSubmit={apply}>
      <div className="col-12 col-md-6 col-xl-2"><label className="form-label" htmlFor="analytics-from">De</label><input id="analytics-from" className="form-control" type="date" value={from} onChange={event => setFrom(event.target.value)} required /></div>
      <div className="col-12 col-md-6 col-xl-2"><label className="form-label" htmlFor="analytics-to">Até</label><input id="analytics-to" className="form-control" type="date" value={to} onChange={event => setTo(event.target.value)} required /></div>
      <div className="col-12 col-md-6 col-xl-3"><label className="form-label" htmlFor="analytics-sector">Setor</label><select id="analytics-sector" className="form-select" value={sectorId} onChange={event => setSectorId(event.target.value)}><option value="">Todos os autorizados</option>{available.map(sector => <option key={sector.id} value={sector.id}>{sector.name}</option>)}</select></div>
      <div className="col-12 col-md-6 col-xl-3"><label className="form-label" htmlFor="analytics-shift">Turno</label><select id="analytics-shift" className="form-select" value={shift} onChange={event => setShift(event.target.value as "" | ShiftName)}><option value="">Todos os turnos</option>{shiftNames.map(label => <option key={label} value={label}>{label}</option>)}</select></div>
      <div className="col-12 col-xl-2"><Button type="submit">Aplicar</Button></div>
    </form>
    {error && <Alert tone="danger">{error}</Alert>}
    {sectors.isError && <Alert tone="danger">{sectors.error.message}</Alert>}
    {base.isError && <Alert tone="danger">{base.error.message} <button onClick={() => void base.refetch()}>Tentar novamente</button></Alert>}
    {dashboard.isError && <Alert tone="danger">{dashboard.error.message} <button onClick={() => void dashboard.refetch()}>Tentar novamente</button></Alert>}
    {dashboard.isPending && <LoadingState />}
    {data && <>
      <h2 className="fhdod-section-title">Visão geral</h2>
      <div className="fhdod-kpi-grid">
        <Card label="Pesquisas completas" value={format(data.sessions.complete, 0)} priority />
        <Card label="Satisfação média" value={ratings?.mean == null ? "Sem respostas" : `${format(ratings.mean)} / 5`} priority />
        <Card label="Nota média NPS" value={meanNps === null ? "Indisponível" : `${format(meanNps)} / 10`} priority />
        <Card label="Taxa de conclusão" value={completionPercentage(completion?.rate)} priority />
      </div>
      <div className="fhdod-summary-strip" aria-label="Outros indicadores">{[["Iniciadas", data.sessions.started], ["Incompletas", data.sessions.incomplete], ["Completas", data.sessions.complete], ["Manifestações", canManage ? data.ombudsman.reduce((total, item) => total + item.tickets, 0) : null]].map(([label, value]) => <div key={String(label)}><small>{label}</small><strong>{value === null ? "Acesso restrito" : format(value as number, 0)}</strong></div>)}</div>
      <p className="small text-secondary">Taxa de conclusão: {completionPercentage(completion?.rate)} · Não concluídas: {completionPercentage(completion?.nonCompletion)} · Em andamento: {format(data.sessions.inProgress, 0)}</p>
      {completion?.reason && <Alert tone="warning">Indicadores de conclusão indisponíveis: {completion.reason} Verifique a agregação do backend para este período e recorte.</Alert>}
      <div className={`fhdod-chart-grid${selected.length === 1 ? " fhdod-chart-grid--single" : ""}`}>
        <Trend data={data.daily} />
        {selected.length !== 1 && <Bars title="Pesquisas completas por setor" rows={data.sectors.map(row => ({ label: name(row.sector_id), value: row.complete }))} />}
      </div>
      <h2 className="fhdod-section-title">Qualidade do atendimento</h2>
      {appliedShift ? <Alert tone="warning">Mapa de satisfação e perguntas por turno indisponíveis: o backend aceita somente uma faixa histórica por consulta e não agrega estas métricas por nome de turno.</Alert> : <>{heatmap.isPending ? <LoadingState /> : heatmap.isError ? <Alert tone="danger">Não foi possível carregar o mapa de satisfação: {heatmap.error.message}</Alert> : <SatisfactionHeatmap rows={heatmap.data} names={names} />}
      {singleSector !== null && (distribution.isPending ? <LoadingState /> : distribution.isError ? <Alert tone="danger">Não foi possível carregar a distribuição das perguntas: {distribution.error.message}</Alert> : <QuestionDistribution report={distribution.data} />)}
      {critical.isPending ? <LoadingState /> : critical.isError ? <Alert tone="danger">Não foi possível carregar as perguntas críticas: {critical.error.message}</Alert> : <CriticalRanking report={critical.data} names={names} limit={criticalLimit} onLimit={setCriticalLimit} />}</>}
      <div className="fhdod-chart-grid fhdod-chart-grid--equal">
        <Donut rows={noteBuckets.map(row => ({ label: `Nota ${row.score}`, value: row.responses, score: row.score }))} />
        <section className="fhdod-profile-card fhdod-chart-panel fhdod-nps-panel"><h2>Classificação do NPS</h2>
          {data.nps.responses === 0 ? <p className="text-secondary">Sem respostas NPS no período.</p> : [["Bons (9–10)", data.nps.promoters, npsGroupColors.promoters], ["Neutros (7–8)", data.nps.passives, npsGroupColors.passives], ["Ruins (0–6)", data.nps.detractors, npsGroupColors.detractors]].map(([label, count, color]) => <div className="fhdod-chart-row" key={String(label)}><div><span>{label}</span><strong>{format(Number(count), 0)}</strong></div><div className="progress" role="img" aria-label={`${label}: ${format(Number(count), 0)} respostas`}><div className="progress-bar" style={{width:`${Number(count) / data.nps.responses * 100}%`,background:color as string}} /></div></div>)}
          <div className="fhdod-nps-groups" aria-label="Percentuais do NPS">{[["Bons (9–10)", data.nps.promoters], ["Neutros (7–8)", data.nps.passives], ["Ruins (0–6)", data.nps.detractors]].map(([label, count]) => <div key={String(label)}><small>{label}</small><strong>{data.nps.responses ? percentage(Number(count) / data.nps.responses * 100) : "Sem respostas"}</strong></div>)}</div>
        </section>
      </div>
      <h2 className="fhdod-section-title">Operação e Ouvidoria</h2>
      <ShiftOverview report={data} />
      <p className="small text-secondary">{data.privacyNotice}</p>
    </>}
  </section>;
}
