import type { AnalyticsDashboard, GlobalQuestionMetric } from "./analytics";
import type { CurrentForm } from "./submissions";

export function npsMean(report: AnalyticsDashboard): number | null {
  const supplied = report.nps.mean;
  if (typeof supplied === "number" && Number.isFinite(supplied) && supplied >= 0 && supplied <= 10) return supplied;
  const bins = report.distribution.filter(row => row.is_nps);
  const valid = bins.every(row => Number.isInteger(row.score) && row.score >= 0 && row.score <= 10 && Number.isSafeInteger(row.responses) && row.responses >= 0);
  const total = bins.reduce((sum, row) => sum + row.responses, 0);
  if (!valid || total === 0 || total !== report.nps.responses) return null;
  return bins.reduce((sum, row) => sum + row.score * row.responses, 0) / total;
}

export function satisfaction(report: AnalyticsDashboard) {
  const bins = report.distribution.filter(row => !row.is_nps);
  const responses = bins.reduce((sum, row) => sum + row.responses, 0);
  if (!responses) return { mean: null, positive: null, responses: 0 };
  return {
    mean: bins.reduce((sum, row) => sum + row.score * row.responses, 0) / responses,
    positive: 100 * bins.filter(row => row.score >= 4).reduce((sum, row) => sum + row.responses, 0) / responses,
    responses,
  };
}

export function shiftTotals(report: AnalyticsDashboard) {
  const grouped = new Map<string, { label: string; value: number }>();
  for (const row of report.shifts) {
    const label = row.name.trim();
    const key = label.toLocaleLowerCase("pt-BR");
    const existing = grouped.get(key);
    grouped.set(key, { label: existing?.label ?? label, value: (existing?.value ?? 0) + Number(row.completed) });
  }
  return ["Madrugada", "Dia", "Noite"].map(label => grouped.get(label.toLocaleLowerCase("pt-BR")) ?? { label, value: 0 });
}

export function criticalQuestions(report: AnalyticsDashboard, global: GlobalQuestionMetric[], form?: CurrentForm) {
  const source = form ? form.questions.filter(q => !q.isNps).map(q => ({questionId: q.questionId, questionVersionId: q.questionVersionId, text: q.text}))
    : global.filter(q => !q.isNps && q.publishedSectorIds.length > 0).map(q => ({questionId: q.questionId, questionVersionId: q.questionVersionId, text: q.text}));
  return source.flatMap(item => {
    const metric = report.questions.find(q => !q.is_nps && q.question_id === item.questionId && q.question_version_id === item.questionVersionId);
    return metric && metric.mean !== null && metric.responses > 0 ? [{...item, mean: metric.mean, responses: metric.responses}] : [];
  }).sort((a, b) => a.mean - b.mean || a.questionId - b.questionId || a.questionVersionId - b.questionVersionId);
}