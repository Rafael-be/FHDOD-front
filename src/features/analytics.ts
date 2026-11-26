import { api } from "../services/http";

export interface AnalyticsFilter {
  from: string;
  to: string;
  sectorId?: number;
  sectorIds?: number[];
  shiftRangeId?: number;
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
  nps: { responses: number; detractors: number; passives: number; promoters: number; value: number | null };
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

function reportParams(filter: AnalyticsFilter) {
  const query = new URLSearchParams({ from: filter.from, to: filter.to });
  const ids = filter.sectorIds ?? [];
  if (ids.length > 1) query.set("sectorIds", ids.join(","));
  else if (ids[0] || filter.sectorId) query.set("sectorId", String(ids[0] ?? filter.sectorId));
  if (filter.shiftRangeId) query.set("shiftRangeId", String(filter.shiftRangeId));
  return query;
}

export const analyticsService = {
  dashboard(filter: AnalyticsFilter, signal?: AbortSignal) {
    return api.request<AnalyticsDashboard>(`/api/analytics/dashboard?${reportParams(filter)}`, { signal });
  },
  questions(filter: AnalyticsFilter, signal?: AbortSignal) {
    return api.request<GlobalQuestionMetric[]>(`/api/analytics/global-questions?${reportParams(filter)}`, { signal });
  },
};
