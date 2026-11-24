import { api } from "../services/http";

export interface AnalyticsDashboard {
  sessions: { started: number; complete: number; incomplete: number; closedIncomplete: number };
  nps: { responses: number; detractors: number; passives: number; promoters: number; value: number | null };
  questions: { question_id: number; question_version_id: number; is_nps: boolean; responses: number; skipped: number; mean: number | null }[];
  distribution: { is_nps: boolean; score: number; responses: number }[];
  daily: { day: string; started: number; complete: number }[];
  dailyAnswers: { day: string; mean: number | null; nps_responses: number; nps: number | null }[];
  sectors: { sector_id: number; started: number; complete: number }[];
  ombudsman: { sector_id: number; ticket_type: string; status: string; tickets: number }[];
  responseRate: null; teamAttributionAvailable: false; timeZone: string; privacyNotice: string;
}
export interface AnalyticsFilter { from: string; to: string; sectorId?: number; shiftRangeId?: number }
export const analyticsService = {
  dashboard(filter: AnalyticsFilter) {
    const query = new URLSearchParams({ from: filter.from, to: filter.to });
    if (filter.sectorId) query.set("sectorId", String(filter.sectorId));
    if (filter.shiftRangeId) query.set("shiftRangeId", String(filter.shiftRangeId));
    return api.request<AnalyticsDashboard>(`/api/analytics/dashboard?${query}`);
  },
};
