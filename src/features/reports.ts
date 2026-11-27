import { api } from "../services/http";

export type ReportType = "general" | "sector" | "questions" | "ombudsman";
export type ReportFormat = "pdf" | "xlsx";
export interface ReportTypeOption { type: ReportType; description: string; formats: ReportFormat[]; filters: { from: boolean; to: boolean; sectorId: "required" | "optional" | "not_applicable" } }
export interface ReportFilters { type: ReportType; from: string; to: string; sectorId?: number }
export interface ReportModel {
  type: ReportType; title: string; filters: { from: string; to: string; sectorId: number | null; sectorName: string | null; timeZone: string };
  generatedAt: string; indicators: Record<string, number | null>; tables: Record<string, Record<string, unknown>[]>;
  recordCount: number; warnings: string[]; minimumResponses: number;
}
const dayParts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" });
export function saoPauloDay(date: Date): string { return dayParts.format(date); }
export function defaultReportPeriod(now = new Date()): { from: string; to: string } {
  const to = saoPauloDay(now);
  const start = new Date(`${to}T00:00:00Z`);
  start.setUTCDate(start.getUTCDate() - 29);
  return { from: start.toISOString().slice(0, 10), to };
}
function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}
export function validateReportFilters(filters: ReportFilters, sectorIds: number[]): string | null {
  if (!validDate(filters.from) || !validDate(filters.to)) return "Informe duas datas válidas.";
  const days = (Date.parse(`${filters.to}T00:00:00Z`) - Date.parse(`${filters.from}T00:00:00Z`)) / 86400000 + 1;
  if (days < 1) return "A data inicial não pode ser posterior à final.";
  if (days > 366) return "O período deve ter no máximo 366 dias.";
  if (filters.type === "sector" && !filters.sectorId) return "Selecione um setor.";
  if (filters.sectorId && !sectorIds.includes(filters.sectorId)) return "Selecione um setor autorizado.";
  if (filters.type === "general" && filters.sectorId) return "O relatório geral não aceita filtro de setor.";
  return null;
}
export function reportFilename(disposition: string | null, filters: ReportFilters, format: ReportFormat): string {
  const match = disposition?.match(/filename\*?=(?:UTF-8''|")?([^";]+)/i);
  const supplied = match ? decodeURIComponent(match[1].replace(/"$/, "")) : "";
  if (supplied && /^[a-zA-Z0-9._-]+\.(pdf|xlsx)$/.test(supplied)) return supplied;
  return `fhdod-relatorio-${filters.type}-${filters.from}-${filters.to}.${format}`;
}
export interface ReportJob { jobId: string; status: "pending" | "processing" | "completed" | "failed" | "expired"; attempts: number; expiresAt: string; message?: string }
export const reportsService = {
  types() { return api.request<ReportTypeOption[]>("/api/reports/types"); },
  preview(filters: ReportFilters) { return api.request<ReportModel>("/api/reports/preview", { method: "POST", body: filters }); },
  createJob(filters: ReportFilters, format: ReportFormat) { return api.request<ReportJob>("/api/reports/jobs", { method: "POST", body: { ...filters, format } }); },
  jobStatus(jobId: string) { return api.request<ReportJob>(`/api/reports/jobs/${encodeURIComponent(jobId)}`); },
  downloadJob(jobId: string) { return api.downloadGet(`/api/reports/jobs/${encodeURIComponent(jobId)}/download`); },
  download(filters: ReportFilters, format: ReportFormat) { return api.download("/api/reports/download", { ...filters, format }); },
};
