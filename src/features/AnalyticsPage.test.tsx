import {act} from "react";
import {createRoot} from "react-dom/client";
import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {afterEach, expect, it, vi} from "vitest";
import {AnalyticsPage} from "./AnalyticsPage";
import {analyticsService, type AnalyticsDashboard} from "./analytics";
import {sectorsService} from "./sectors";

Object.assign(globalThis, {IS_REACT_ACT_ENVIRONMENT: true});
afterEach(() => vi.restoreAllMocks());
it.each([[-12.8, "-13"], [null, "Sem respostas NPS"], [0, "0"]])("exibe o agregado %s e aplica o recorte aos dois relatórios", async (value, expected) => {
  const fixture: AnalyticsDashboard = {
    sessions: {started: 8, complete: 6, incomplete: 2, inProgress: 1, endedOrExpired: 1, closedIncomplete: 0, unknownDeadline: 0, completionRate: 75, nonCompletionRate: 25},
    nps: {value: value as number | null, responses: value === null ? 0 : 8, promoters: 2, passives: 3, detractors: 3},
    shifts: [{id: 10, name: "Plantão A", sector_id: 2, completed: 5, percentage: 100}], unclassifiedCompleted: 1,
    questions: [], sectors: [], daily: [], dailyAnswers: [], distribution: [], ombudsman: [], teamAttributionAvailable: false, responseRate: null, privacyNotice: "", timeZone: "America/Sao_Paulo",
  };
  vi.spyOn(sectorsService, "list").mockResolvedValue([2,4].map(id => ({id, code: String(id), name: `Unidade ${id}`, deletedAt: null})));
  const dashboard = vi.spyOn(analyticsService, "dashboard").mockResolvedValue(fixture);
  const questions = vi.spyOn(analyticsService, "questions").mockResolvedValue([{questionId: 7, questionVersionId: 8, isNps: false, text: "Atendimento", publishedSectorIds: [2], responses: 2, mean: 3, distribution: [{score: 3, responses: 2, percentage: 100}], sectors: [{sectorId: 2, responses: 2, mean: 3, distribution: []}]}]);
  const container = document.createElement("div");
  const root = createRoot(container);
  const client = new QueryClient();
  await act(async () => root.render(<QueryClientProvider client={client}><AnalyticsPage canManage={false} userId={1}/></QueryClientProvider>));
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 10)); });
  expect(container.querySelector(".fhdod-kpi strong")?.textContent).toBe(expected);
  for (const label of ["Iniciadas8","Completas6","Não concluídas2","Em andamento1","75%","25%","Plantão A","100%","Sem turno identificado: 1","Unidade 4 — Sem respostas no período · Sem publicação vigente"]) expect(container.textContent).toContain(label);
  expect(container.textContent).not.toContain("Ouvidoria");
  const list = container.querySelector("select[multiple]") as HTMLSelectElement;
  for (const count of [1,2]) {
    await act(async () => {list.options[count-1].selected = true; list.dispatchEvent(new Event("change", {bubbles:true}));});
    await act(async () => container.querySelector("form")!.dispatchEvent(new Event("submit", {bubbles:true,cancelable:true})));
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 10)); });
    const filter = {sectorIds: count === 1 ? [2] : [2,4]};
    expect(dashboard.mock.lastCall?.[0]).toMatchObject(filter);
    expect(questions.mock.lastCall?.[0]).toMatchObject(filter);
    expect(container.textContent?.includes("Pesquisas completas por setor")).toBe(count === 2);
  }
  await act(async () => root.unmount());
  client.clear();
});
