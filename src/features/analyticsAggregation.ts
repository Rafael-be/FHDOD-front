import { analyticsService, completionIndicators, type AnalyticsDashboard, type AnalyticsFilter, type GlobalQuestionMetric } from "./analytics";

export const shiftNames = ["Madrugada", "Dia", "Noite"] as const;
export type ShiftName = typeof shiftNames[number];
const matches = (name: string, selected: ShiftName) => name.trim().toLocaleLowerCase("pt-BR") === selected.toLocaleLowerCase("pt-BR");
export function shiftRangeIds(report: AnalyticsDashboard, selected: ShiftName): number[] {
  return [...new Set(report.shifts.filter(row => matches(row.name, selected)).map(row => row.id))];
}

function totals<T>(groups: T[][], key: (row: T) => string, sum: (items: T[]) => T): T[] {
  const map = new Map<string, T[]>();
  for (const group of groups) for (const row of group) {
    const id = key(row);
    map.set(id, [...(map.get(id) ?? []), row]);
  }
  return [...map.values()].map(sum);
}
const percentage = (part: number, whole: number) => whole ? 100 * part / whole : null;

export function combineDashboards(reports: AnalyticsDashboard[]): AnalyticsDashboard {
  if (!reports.length) throw new Error("O backend não forneceu faixas para o turno selecionado.");
  if (reports.some(report => completionIndicators(report).reason)) throw new Error("Uma faixa de turno retornou totais inconsistentes.");
  const first = reports[0];
  const sum = (value: (report: AnalyticsDashboard) => number) => reports.reduce((count, report) => count + value(report), 0);
  const started = sum(report => report.sessions.started), complete = sum(report => report.sessions.complete), incomplete = sum(report => report.sessions.incomplete);
  const responses = sum(report => report.nps.responses), promoters = sum(report => report.nps.promoters), detractors = sum(report => report.nps.detractors);
  const daily = totals(reports.map(report => report.daily), row => row.day, rows => ({day: rows[0].day, started: rows.reduce((count, row) => count + row.started, 0), complete: rows.reduce((count, row) => count + row.complete, 0)})).sort((a,b) => a.day.localeCompare(b.day));
  return {
    ...first,
    sessions: {started, complete, incomplete, closedIncomplete: sum(report => report.sessions.closedIncomplete), inProgress: sum(report => report.sessions.inProgress), endedOrExpired: sum(report => report.sessions.endedOrExpired), unknownDeadline: sum(report => report.sessions.unknownDeadline), completionRate: percentage(complete, started), nonCompletionRate: percentage(incomplete, started)},
    nps: {responses, promoters, detractors, passives: sum(report => report.nps.passives), value: responses ? 100 * (promoters - detractors) / responses : null},
    shifts: reports.flatMap(report => report.shifts.filter(row => row.completed > 0)),
    unclassifiedCompleted: sum(report => report.unclassifiedCompleted),
    distribution: totals(reports.map(report => report.distribution), row => `${row.is_nps}/${row.score}`, rows => ({...rows[0], responses: rows.reduce((count, row) => count + row.responses, 0)})),
    questions: totals(reports.map(report => report.questions), row => `${row.question_id}/${row.question_version_id}/${row.is_nps}`, rows => ({...rows[0], responses: rows.reduce((count, row) => count + row.responses, 0), skipped: rows.reduce((count, row) => count + row.skipped, 0), mean: rows.reduce((count, row) => count + row.responses, 0) ? rows.reduce((count, row) => count + (row.mean ?? 0) * row.responses, 0) / rows.reduce((count, row) => count + row.responses, 0) : null})),
    daily,
    dailyAnswers: [],
    sectors: totals(reports.map(report => report.sectors), row => String(row.sector_id), rows => ({sector_id:rows[0].sector_id, started: rows.reduce((count,row) => count+row.started,0), complete: rows.reduce((count,row) => count+row.complete,0)})),
    ombudsman: totals(reports.map(report => report.ombudsman), row => `${row.sector_id}/${row.ticket_type}/${row.status}`, rows => ({...rows[0], tickets: rows.reduce((count,row) => count+row.tickets,0)})),
  };
}

export function combineGlobalQuestions(reports: GlobalQuestionMetric[][]): GlobalQuestionMetric[] {
  const mergeSatisfaction = <T extends {responses:number; mean:number|null; distribution:GlobalQuestionMetric["distribution"]}>(rows:T[]) => {
    const responses = rows.reduce((count,row) => count + row.responses,0);
    const distribution = totals(rows.map(row => row.distribution), row => String(row.score), buckets => ({...buckets[0], responses: buckets.reduce((count,row) => count+row.responses,0)})).map(row => ({...row, percentage: percentage(row.responses,responses) ?? 0}));
    return {responses, mean: responses ? rows.reduce((value,row) => value+(row.mean ?? 0)*row.responses,0)/responses : null, distribution};
  };
  return totals(reports, row => `${row.questionId}/${row.questionVersionId}/${row.isNps}`, rows => ({
    ...rows[0], ...mergeSatisfaction(rows),
    publishedSectorIds: [...new Set(rows.flatMap(row => row.publishedSectorIds))],
    sectors: totals(rows.map(row => row.sectors), row => String(row.sectorId), items => ({sectorId:items[0].sectorId,...mergeSatisfaction(items)})),
  }));
}

export async function dashboardForShift(filter: AnalyticsFilter, base: AnalyticsDashboard, shift: ShiftName, signal?: AbortSignal) {
  const ids = shiftRangeIds(base, shift);
  if (!ids.length) throw new Error(`Nenhuma faixa ${shift} foi fornecida pelo backend neste recorte.`);
  return combineDashboards(await Promise.all(ids.map(shiftRangeId => analyticsService.dashboard({...filter, shiftRangeId}, signal))));
}
export async function questionsForShift(filter: AnalyticsFilter, base: AnalyticsDashboard, shift: ShiftName, signal?: AbortSignal) {
  const ids = shiftRangeIds(base, shift);
  if (!ids.length) throw new Error(`Nenhuma faixa ${shift} foi fornecida pelo backend neste recorte.`);
  return combineGlobalQuestions(await Promise.all(ids.map(shiftRangeId => analyticsService.questions({...filter, shiftRangeId}, signal))));
}
