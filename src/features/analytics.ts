import { api } from "../services/http";

export interface AnalyticsFilter {
  from: string;
  to: string;
  sectorId?: number;
  sectorIds?: number[];
  shiftRangeId?: number;
  shiftName?: "Madrugada" | "Dia" | "Noite";
}

interface ScoreBucket {
  score: number;
  responses: number;
}

interface Satisfaction {
  responses: number;
  mean: number | null;
  distribution: (ScoreBucket & { percentage: number })[];
}

export interface GlobalQuestionMetric extends Satisfaction {
  questionId: number;
  questionVersionId: number;
  isNps: boolean;
  text: string;
  publishedSectorIds: number[];
  sectors: (Satisfaction & { sectorId: number })[];
}

export interface SectorHeatmapMetric {
  sectorId: number;
  satisfactionMean: number | null;
  npsMean: number | null;
  positivePercentage: number | null;
  completionRate: number | null;
  responses: number;
  npsResponses: number;
  started: number;
  completed: number;
}
export interface QuestionDistributionMetric {
  questionId: number; questionVersionId: number; text: string; position: number;
  mean: number | null; responses: number; skipped: number;
  distribution: ScoreBucket[];
}
export interface QuestionDistributionReport { sectorId: number; formVersionId: number; questions: QuestionDistributionMetric[] }
export interface CriticalQuestionMetric {
  sectorId: number; questionId: number; questionVersionId: number;
  text: string; mean: number; responses: number;
}
export interface CriticalQuestionsReport { minimumResponses: number; items: CriticalQuestionMetric[] }

export interface AnalyticsDashboard {
  sessions: {
    started: number;
    complete: number;
    incomplete: number;
    closedIncomplete: number;
    inProgress: number;
    endedOrExpired: number;
    unknownDeadline: number;
    completionRate: number | null;
    nonCompletionRate: number | null;
  };
  nps: { responses: number; detractors: number; passives: number; promoters: number; value: number | null; mean?: number | null };
  shifts: { id: number; name: string; sector_id: number; completed: number; percentage: number | null }[];
  unclassifiedCompleted: number;
  questions: { question_id: number; question_version_id: number; is_nps: boolean; responses: number; skipped: number; mean: number | null }[];
  distribution: (ScoreBucket & { is_nps: boolean })[];
  daily: { day: string; started: number; complete: number }[];
  dailyAnswers: { day: string; mean: number | null; nps_responses: number; nps: number | null }[];
  sectors: { sector_id: number; started: number; complete: number }[];
  ombudsman: { sector_id: number; ticket_type: string; status: string; tickets: number }[];
  responseRate: null;
  teamAttributionAvailable: false;
  timeZone: string;
  privacyNotice: string;
}

// The backend's cohort is the set of sessions started in the requested interval.
// Keep its rate only when the aggregates describe that same cohort.
export function completionIndicators(report: AnalyticsDashboard): { rate: number | null; nonCompletion: number | null; reason?: string } {
  const { started, complete, incomplete, completionRate, nonCompletionRate } = report.sessions;
  const validCount = (value: number) => Number.isSafeInteger(value) && value >= 0;
  if (![started, complete, incomplete].every(validCount) || complete + incomplete !== started || complete > started) {
    return { rate: null, nonCompletion: null, reason: "Os totais de sessões da API são inconsistentes." };
  }
  if (Array.isArray(report.daily) && (report.daily.reduce((sum, day) => sum + day.started, 0) !== started || report.daily.reduce((sum, day) => sum + day.complete, 0) !== complete)) {
    return { rate: null, nonCompletion: null, reason: "A série diária e os totais de sessões da API divergem." };
  }
  if (started === 0) return { rate: null, nonCompletion: null };
  const expected = 100 * complete / started;
  const expectedNonCompletion = 100 * incomplete / started;
  if (typeof completionRate !== "number" || typeof nonCompletionRate !== "number" ||
      Math.abs(completionRate - expected) > 0.05 || Math.abs(nonCompletionRate - expectedNonCompletion) > 0.05) {
    return { rate: null, nonCompletion: null, reason: "As taxas da API divergem dos totais de sessões iniciadas e concluídas." };
  }
  return { rate: completionRate, nonCompletion: nonCompletionRate };
}

function reportParams(filter: AnalyticsFilter) {
  const query = new URLSearchParams({ from: filter.from, to: filter.to });
  const ids = filter.sectorIds ?? [];
  if (ids.length > 1) query.set("sectorIds", ids.join(","));
  else if (ids[0] || filter.sectorId) query.set("sectorId", String(ids[0] ?? filter.sectorId));
  if (filter.shiftRangeId) query.set("shiftRangeId", String(filter.shiftRangeId));
  if (filter.shiftName) query.set("shiftName", filter.shiftName);
  return query;
}

export const analyticsService = {
  async dashboard(filter: AnalyticsFilter, signal?: AbortSignal) {
    const report = await api.request<AnalyticsDashboard>(`/api/analytics/dashboard?${reportParams(filter)}`, { signal });
    if (!Array.isArray(report?.shifts) || report.sessions?.completionRate === undefined ||
        report.sessions.nonCompletionRate === undefined || report.sessions.inProgress === undefined) {
      throw new Error("A API ainda não disponibiliza os indicadores de conclusão e turno.");
    }
    return report;
  },
  questions(filter: AnalyticsFilter, signal?: AbortSignal) {
    return api.request<GlobalQuestionMetric[]>(`/api/analytics/global-questions?${reportParams(filter)}`, { signal });
  },
  heatmap(filter: AnalyticsFilter, signal?: AbortSignal) {
    return api.request<SectorHeatmapMetric[]>(`/api/analytics/heatmap?${reportParams(filter)}`, { signal });
  },
  questionDistribution(filter: AnalyticsFilter, signal?: AbortSignal) {
    if (!filter.sectorId) throw new Error("Selecione um setor para consultar a distribuição das perguntas.");
    return api.request<QuestionDistributionReport>(`/api/analytics/questions/distribution?${reportParams(filter)}`, { signal });
  },
  criticalQuestions(filter: AnalyticsFilter, limit: 3 | 5, signal?: AbortSignal) {
    const query = reportParams(filter);
    query.set("limit", String(limit));
    return api.request<CriticalQuestionsReport>(`/api/analytics/questions/critical?${query}`, { signal });
  },
};