import type { CSSProperties } from "react";
import type { CriticalQuestionsReport, QuestionDistributionReport, SectorHeatmapMetric, AnalyticsDashboard } from "./analytics";
import { shiftTotals } from "./analyticsInsights";

const number = new Intl.NumberFormat("pt-BR", {maximumFractionDigits: 1});
const count = new Intl.NumberFormat("pt-BR", {maximumFractionDigits: 0});
const scoreColors = ["var(--color-primary-deep)", "var(--color-warning)", "var(--color-text-muted)", "var(--color-success)", "var(--color-primary)"];
const grade = (value: number | null, low: number, high: number) => value === null ? "none" : value < low ? "critical" : value < high ? "middle" : "positive";

function HeatCell({ value, unit, responses, low, high, label }: { value: number | null; unit: string; responses: number; low: number; high: number; label: string }) {
  const displayed = value === null ? "Indisponível" : `${number.format(value)}${unit}`;
  const detail = `${label}: ${displayed} · ${count.format(responses)} ${label === "Conclusão" ? "sessões iniciadas" : "respostas"}`;
  return <td className="fhdod-heat-cell" data-label={label} data-grade={grade(value, low, high)} tabIndex={0} title={detail} aria-label={detail}>{displayed}</td>;
}

export function SatisfactionHeatmap({ rows, names }: { rows: SectorHeatmapMetric[]; names: Map<number, string> }) {
  return <section className="fhdod-profile-card fhdod-chart-panel fhdod-heatmap"><h3>Mapa de satisfação por setor</h3>
    <div className="fhdod-heatmap-table"><table><thead><tr><th scope="col">Setor</th><th scope="col">Satisfação<br />1–5</th><th scope="col">Nota NPS<br />0–10</th><th scope="col">Positivas<br />4–5</th><th scope="col">Conclusão</th></tr></thead><tbody>
      {rows.map(row => <tr key={row.sectorId}><th scope="row">{names.get(row.sectorId) ?? `Setor ${row.sectorId}`}</th>
        <HeatCell label="Satisfação" value={row.satisfactionMean} unit=" / 5" responses={row.responses} low={3} high={4} />
        <HeatCell label="Nota NPS" value={row.npsMean} unit=" / 10" responses={row.npsResponses} low={6} high={8} />
        <HeatCell label="Positivas" value={row.positivePercentage} unit="%" responses={row.responses} low={50} high={75} />
        <HeatCell label="Conclusão" value={row.completionRate} unit="%" responses={row.started} low={60} high={85} /></tr>)}
    </tbody></table></div>
    {rows.length === 0 && <p>Sem setores disponíveis para este recorte.</p>}
    <div className="fhdod-heat-legend" aria-label="Legenda das faixas"><span data-grade="critical">Crítico</span><span data-grade="middle">Intermediário</span><span data-grade="positive">Positivo</span><span data-grade="none">Sem dados</span></div>
  </section>;
}

export function QuestionDistribution({ report }: { report: QuestionDistributionReport }) {
  return <section className="fhdod-profile-card fhdod-chart-panel"><h3>Distribuição por pergunta do formulário vigente</h3>
    <p className="small text-secondary">Formulário publicado nº {report.formVersionId}. Somente perguntas de satisfação.</p>
    {report.questions.length === 0 && <p>O formulário vigente não contém perguntas de satisfação.</p>}
    {[...report.questions].sort((a,b) => a.position-b.position).map(item => <article className="fhdod-question-distribution" key={`${item.questionId}-${item.questionVersionId}`}><div className="fhdod-distribution-heading"><strong>{item.text}</strong><span>{item.mean === null ? "Sem média" : `${number.format(item.mean)} / 5`} · {count.format(item.responses)} respostas</span></div>
      {item.responses > 0 ? <div className="fhdod-stacked-bar" role="img" aria-label={`Distribuição de ${item.text}: ${item.responses} respostas`}>{item.distribution.map(bucket => bucket.responses > 0 && <span key={bucket.score} style={{width:`${bucket.responses / item.responses * 100}%`,background:scoreColors[bucket.score-1]}} title={`Nota ${bucket.score}: ${count.format(bucket.responses)} respostas`} aria-label={`Nota ${bucket.score}: ${count.format(bucket.responses)} respostas`} />)}</div> : <p className="small text-secondary mb-0">Sem respostas no período.</p>}
    </article>)}
    <div className="fhdod-score-legend" aria-label="Legenda das notas">{[1,2,3,4,5].map(score => <span key={score} style={{"--legend-color":scoreColors[score-1]} as CSSProperties}>Nota {score}</span>)}</div>
  </section>;
}

export function CriticalRanking({ report, names, limit, onLimit }: { report: CriticalQuestionsReport; names: Map<number,string>; limit: 3|5; onLimit: (value:3|5)=>void }) {
  return <section className="fhdod-profile-card fhdod-chart-panel"><div className="fhdod-insight-heading"><h3>Perguntas mais críticas</h3><label>Exibir<select className="form-select form-select-sm" value={limit} onChange={event=>onLimit(Number(event.target.value) as 3|5)}><option value={3}>Top 3</option><option value={5}>Top 5</option></select></label></div>
    {report.items.length === 0 ? <p className="text-secondary">Nenhuma pergunta atingiu a amostra mínima neste recorte.</p> : report.items.map(row => <div className="fhdod-chart-row" key={`${row.sectorId}-${row.questionId}-${row.questionVersionId}`}><div><span>{row.text} · {names.get(row.sectorId) ?? `Setor ${row.sectorId}`}</span><strong>{number.format(row.mean)} / 5 · {count.format(row.responses)} respostas</strong></div><div className="progress" role="img" aria-label={`${row.text}: média ${number.format(row.mean)} de 5, ${row.responses} respostas`}><div className="progress-bar" style={{width:`${row.mean/5*100}%`}} /></div></div>)}
    <p className="small text-secondary mb-0">Amostra mínima definida pelo backend: {report.minimumResponses} respostas por pergunta e setor.</p>
  </section>;
}

export function ShiftOverview({ report }: { report: AnalyticsDashboard }) {
  const rows = shiftTotals(report);
  const total = rows.reduce((sum, row) => sum + (row.value ?? 0), 0);
  return <section className="fhdod-profile-card fhdod-chart-panel"><h3>Pesquisas por turno</h3><p className="small text-secondary">Conclusões no período e nos filtros aplicados, agrupadas pelo nome do turno registrado na faixa histórica.</p>
    {rows.map(row => <div className="fhdod-chart-row" key={row.label}><div><span>{row.label}</span><strong>{row.value === null ? "Sem dados" : count.format(row.value)}</strong></div><div className="progress" role="img" aria-label={`${row.label}: ${row.value === null ? "sem dados" : `${row.value} pesquisas concluídas`}`} title={row.value === null ? "Turno não retornado pela API" : `${count.format(row.value)} pesquisas concluídas`}><div className="progress-bar" style={{width:`${row.value === null || total === 0 ? 0 : row.value / total * 100}%`}} /></div></div>)}
    {report.unclassifiedCompleted > 0 && <p className="small mb-0">Sem turno: {count.format(report.unclassifiedCompleted)} pesquisas concluídas</p>}
    {total === 0 && report.unclassifiedCompleted === 0 && <p className="small text-secondary mb-0">Sem pesquisas classificadas no período.</p>}
    {report.shifts.some(row => !["dia", "noite", "madrugada"].includes(row.name.trim().toLocaleLowerCase("pt-BR")) && row.completed > 0) && <p className="small text-secondary mb-0">Há faixas com nomes fora das três categorias. Verifique a planilha de turnos no backend.</p>}
  </section>;
}
