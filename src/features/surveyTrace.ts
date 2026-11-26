type SurveyEvent =
  | "SURVEY_PAGE_OPEN" | "CURRENT_FORM_REQUEST" | "CURRENT_FORM_LOADED"
  | "FORM_CACHE_HIT" | "FORM_CACHE_MISS" | "FIRST_QUESTION_RENDERED"
  | "ANSWER_SELECTED" | "ANSWER_REQUEST_STARTED" | "ANSWER_CONFIRMED"
  | "SESSION_STARTED" | "QUESTION_ADVANCED" | "SESSION_EXPIRED"
  | "SURVEY_COMPLETED" | "REQUEST_FAILED";
interface TraceEntry {
  timestamp: string;
  event: SurveyEvent;
  correlationId: string;
  sectorId: number;
  questionNumber?: number;
  formVersionId?: number;
  status?: number;
  durationMs?: number;
  networkMs?: number;
  renderMs?: number;
}
export const surveyTraceEnabled = import.meta.env.DEV && import.meta.env.VITE_PUBLIC_SURVEY_TRACE === "true";
const entries: TraceEntry[] = [];

export function traceSurvey(event: SurveyEvent, correlationId: string, sectorId: number, details: Omit<Partial<TraceEntry>, "timestamp" | "event" | "correlationId" | "sectorId"> = {}) {
  if (!surveyTraceEnabled) return;
  const entry: TraceEntry = { timestamp: new Date().toISOString(), event, correlationId, sectorId, ...details };
  entries.push(entry);
  console.info(JSON.stringify(entry));
}
export function surveyTraceEntries(): readonly TraceEntry[] { return entries; }
export function exportSurveyTrace() {
  if (!surveyTraceEnabled) return;
  const blob = new Blob([JSON.stringify(entries, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `fhdod-survey-trace-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  link.click();
  URL.revokeObjectURL(url);
}
