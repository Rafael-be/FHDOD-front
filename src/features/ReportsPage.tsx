import { useEffect, useState } from "react";
import { Button } from "../components/ui/Button";
import { Alert, EmptyState, LoadingState } from "../components/ui/Feedback";
import { ApiError } from "../services/http";
import { sectorsService, type Sector } from "./sectors";
import { defaultReportPeriod, reportFilename, reportsService, validateReportFilters, type ReportFilters, type ReportFormat, type ReportModel, type ReportTypeOption, type ReportJob } from "./reports";

const names: Record<string, string> = { started: "Pesquisas iniciadas", completed: "Pesquisas concluídas", incomplete: "Pesquisas incompletas", completionRate: "Taxa de conclusão", satisfactionMean: "Satisfação média", npsMean: "Nota média NPS", npsResponses: "Respostas NPS", positivePercentage: "Avaliações positivas", ombudsmanTotal: "Manifestações", total: "Total", resolved: "Resolvidas", pending: "Pendentes", resolutionPercentage: "Taxa de resolução", complaints: "Reclamações", compliments: "Elogios", suggestionsOther: "Sugestões e outras", score: "Nota", responses: "Respostas", day: "Dia", sectorName: "Setor", name: "Nome", text: "Pergunta", mean: "Média", tickets: "Manifestações", distribution: "Distribuição de notas", evolution: "Evolução", sectors: "Setores", questions: "Perguntas", critical: "Perguntas críticas", shifts: "Turnos", status: "Situação", types: "Tipos", ombudsman: "Ouvidoria" };
const label = (key: string) => names[key] ?? key.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^./, letter => letter.toUpperCase());
const value = (item: unknown): string => item === null || item === undefined ? "Indisponível" : typeof item === "boolean" ? item ? "Sim" : "Não" : typeof item === "number" ? new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(item) : Array.isArray(item) ? item.map(value).join(" · ") : typeof item === "object" ? Object.entries(item).map(([key, entry]) => `${label(key)}: ${value(entry)}`).join(" · ") : String(item);
const message = (cause: unknown) => cause instanceof ApiError ? cause.status === 403 ? "Você não tem permissão para este relatório ou sua sessão precisa ser renovada." : cause.status === 413 ? "Relatório muito grande. Reduza o período ou selecione um setor." : cause.message : "Não foi possível consultar os relatórios. Verifique a conexão.";

function ReportPreview({ model, filters }: { model: ReportModel; filters: ReportFilters }) {
  return <section className="fhdod-report-results" aria-label="Prévia do relatório">
    <div className="fhdod-report-result-heading"><div><p className="eyebrow">Prévia gerada</p><h2>{model.title}</h2><p>De {filters.from} a {filters.to} · {model.filters.sectorName ?? "Todos os setores autorizados"}</p></div><small>{model.recordCount} registros no período</small></div>
    {model.recordCount === 0 && <EmptyState title="Sem registros no período">A prévia foi gerada, mas não há registros para os filtros escolhidos.</EmptyState>}
    {Object.keys(model.indicators).length > 0 && <div className="fhdod-report-kpis">{Object.entries(model.indicators).map(([key, entry]) => <article className="fhdod-profile-card" key={key}><small>{label(key)}</small><strong>{value(entry)}{entry !== null && /Percentage|Rate/.test(key) ? "%" : ""}</strong></article>)}</div>}
    {model.warnings.length > 0 && <Alert tone="info"><ul className="mb-0">{model.warnings.map(warning => <li key={warning}>{warning}</li>)}</ul></Alert>}
    <div className="fhdod-report-tables">{Object.entries(model.tables).map(([key, rows]) => <section className="fhdod-profile-card" key={key}><h3>{label(key)}</h3>{rows.length === 0 ? <p className="text-secondary mb-0">Nenhum dado nesta seção.</p> : <div className="table-responsive"><table className="table table-sm mb-0"><thead><tr>{Object.keys(rows[0]).map(column => <th key={column} scope="col">{label(column)}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={index}>{Object.keys(rows[0]).map(column => <td key={column}>{value(row[column])}</td>)}</tr>)}</tbody></table></div>}</section>)}</div>
  </section>;
}

export function ReportsPage({ canManage }: { canManage: boolean }) {
  const [types, setTypes] = useState<ReportTypeOption[] | null>(null);
  const [sectors, setSectors] = useState<Sector[] | null>(null);
  const [filters, setFilters] = useState<ReportFilters>({ type: "general", ...defaultReportPeriod() });
  const [preview, setPreview] = useState<{ model: ReportModel; filters: ReportFilters } | null>(null);
  const [busy, setBusy] = useState<"preview" | ReportFormat | null>(null);
  const [job, setJob] = useState<(ReportJob & { format: ReportFormat; filters: ReportFilters }) | null>(null);
  const [pollAttempt, setPollAttempt] = useState(0);
  const [error, setError] = useState("");
  useEffect(() => { let active = true; Promise.all([reportsService.types(), sectorsService.list()]).then(([available, authorized]) => { if (!active) return; const permitted = available.filter(option => canManage || option.type !== "ombudsman"); setTypes(permitted); setSectors(authorized.filter(sector => !sector.deletedAt)); if (permitted.length && !permitted.some(option => option.type === "general")) setFilters(current => ({ ...current, type: permitted[0].type })); }).catch(cause => { if (active) setError(message(cause)); }); return () => { active = false; }; }, [canManage]);
  useEffect(() => { setJob(null); }, [filters.type, filters.from, filters.to, filters.sectorId]);
  useEffect(() => {
    if (!job || (job.status !== "pending" && job.status !== "processing")) return;
    let active = true;
    const timer = window.setTimeout(() => {
      void reportsService.jobStatus(job.jobId).then(status => {
        if (active) setJob(current => current?.jobId === status.jobId ? { ...current, ...status } : current);
      }).catch(cause => { if (active) { setError(message(cause)); setPollAttempt(current => current + 1); } });
    }, 5000);
    return () => { active = false; window.clearTimeout(timer); };
  }, [job, pollAttempt]);
  const selectedType = types?.find(option => option.type === filters.type);
  const payload: ReportFilters = { type: filters.type, from: filters.from, to: filters.to, ...(selectedType?.filters.sectorId !== "not_applicable" && filters.sectorId ? { sectorId: filters.sectorId } : {}) };
  const validation = validateReportFilters(payload, sectors?.map(sector => sector.id) ?? []);
  const stale = preview !== null && JSON.stringify(preview.filters) !== JSON.stringify(payload);
  const generate = async () => { if (validation || busy) { setError(validation ?? ""); return; } setBusy("preview"); setError(""); try { const model = await reportsService.preview(payload); setPreview({ model, filters: payload }); } catch (cause) { setError(message(cause)); } finally { setBusy(null); } };
  const download = async (format: ReportFormat) => {
    if (validation || busy || (job?.status === "pending" || job?.status === "processing")) { setError(validation ?? ""); return; }
    setBusy(format); setError("");
    try { const created = await reportsService.createJob(payload, format); setJob({ ...created, format, filters: payload }); }
    catch (cause) { setError(message(cause)); } finally { setBusy(null); }
  };
  const saveCompleted = async () => {
    if (!job || job.status !== "completed" || busy) return;
    setBusy(job.format); setError("");
    try {
      const file = await reportsService.downloadJob(job.jobId);
      const url = URL.createObjectURL(file.blob);
      try { const link = document.createElement("a"); link.href = url; link.download = reportFilename(file.disposition, job.filters, job.format); document.body.append(link); link.click(); link.remove(); }
      finally { window.setTimeout(() => URL.revokeObjectURL(url), 1000); }
    } catch (cause) { setError(message(cause)); } finally { setBusy(null); }
  };
  return <section className="fhdod-reports-page"><div className="fhdod-page-heading"><div><p className="eyebrow">Administração</p><h1>Relatórios</h1><p>Consulte indicadores e exporte dados do atendimento hospitalar.</p></div></div>
    {error && <Alert tone="danger">{error}</Alert>}
    {!types || !sectors ? error ? null : <LoadingState /> : <>
      <section className="fhdod-profile-card fhdod-report-config"><h2>Configurar relatório</h2><fieldset className="fhdod-report-types"><legend>Tipo de relatório</legend>{types.map(option => <label className="fhdod-report-type" key={option.type}><input type="radio" name="report-type" checked={filters.type === option.type} onChange={() => setFilters(current => ({ ...current, type: option.type, sectorId: option.filters.sectorId === "not_applicable" ? undefined : current.sectorId }))} /><strong>{option.description}</strong></label>)}</fieldset>
        <div className="fhdod-report-filters">{selectedType?.filters.sectorId !== "not_applicable" && <label>Setor<select className="form-select" value={filters.sectorId ?? ""} onChange={event => setFilters(current => ({ ...current, sectorId: event.target.value ? Number(event.target.value) : undefined }))}><option value="">{selectedType?.filters.sectorId === "required" ? "Selecione um setor" : "Todos os setores autorizados"}</option>{sectors.map(sector => <option key={sector.id} value={sector.id}>{sector.name}</option>)}</select></label>}<label>Data inicial<input className="form-control" type="date" value={filters.from} onChange={event => setFilters(current => ({ ...current, from: event.target.value }))} /></label><label>Data final<input className="form-control" type="date" value={filters.to} onChange={event => setFilters(current => ({ ...current, to: event.target.value }))} /></label><Button type="button" disabled={!!busy || !!validation} loading={busy === "preview"} onClick={() => void generate()}>Gerar prévia</Button></div>{validation && <p className="text-danger small mb-0" role="alert">{validation}</p>}
      </section>
      {stale && <Alert tone="warning">Os filtros foram alterados. A prévia abaixo pertence ao período e setor anteriores; gere outra prévia para atualizá-la.</Alert>}
      {preview ? <ReportPreview model={preview.model} filters={preview.filters} /> : <EmptyState title="Prepare seu relatório">Escolha o tipo, o setor e as datas para gerar a prévia.</EmptyState>}
      {job && <Alert tone={job.status === "failed" || job.status === "expired" ? "danger" : "info"}>
        {job.status === "pending" ? "Relatório na fila de geração." : job.status === "processing" ? "Relatório em geração." : job.status === "completed" ? "Relatório pronto para baixar." : job.message ?? "Não foi possível gerar o relatório. Solicite novamente."}
      </Alert>}
      <div className="fhdod-report-downloads">{job?.status === "completed" && <Button type="button" onClick={() => void saveCompleted()} disabled={!!busy}>Baixar relatório pronto</Button>}<Button type="button" variant="secondary" disabled={!!busy || !!validation || job?.status === "pending" || job?.status === "processing" || !selectedType?.formats.includes("pdf")} loading={busy === "pdf"} onClick={() => void download("pdf")}>Baixar PDF</Button><Button type="button" variant="secondary" disabled={!!busy || !!validation || job?.status === "pending" || job?.status === "processing" || !selectedType?.formats.includes("xlsx")} loading={busy === "xlsx"} onClick={() => void download("xlsx")}>Baixar Excel</Button></div>
    </>}
  </section>;
}
