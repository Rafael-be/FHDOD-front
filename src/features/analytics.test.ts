import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "../services/http";
import { analyticsService, completionIndicators, type AnalyticsDashboard } from "./analytics";
import { ombudsmanService } from "./ombudsman";

describe("novas integrações", () => {
  afterEach(() => vi.restoreAllMocks());
  it("envia o período e os filtros reais ao dashboard", async () => {
    const request = vi.spyOn(api, "request").mockResolvedValue({shifts:[],sessions:{completionRate:null,nonCompletionRate:null,inProgress:0}});
    await analyticsService.dashboard({ from: "2026-11-01T03:00:00.000Z", to: "2026-12-01T03:00:00.000Z", sectorId: 2, shiftRangeId: 8 });
    const path = request.mock.calls[0][0] as string;
    const url = new URL(path, "http://local.test");
    expect(url.pathname).toBe("/api/analytics/dashboard");
    expect(Object.fromEntries(url.searchParams)).toEqual({ from: "2026-11-01T03:00:00.000Z", to: "2026-12-01T03:00:00.000Z", sectorId: "2", shiftRangeId: "8" });
  });
  it("envia filtros aos três novos endpoints de indicadores", async () => {
    const request = vi.spyOn(api,"request").mockResolvedValue([]);
    const filter = {from:"2026-11-01T03:00:00.000Z",to:"2026-12-01T03:00:00.000Z",sectorId:2,shiftRangeId:8};
    await analyticsService.heatmap(filter);
    await analyticsService.questionDistribution(filter);
    await analyticsService.criticalQuestions(filter,3);
    expect(request.mock.calls.map(call => new URL(call[0] as string,"http://local.test").pathname)).toEqual([
      "/api/analytics/heatmap","/api/analytics/questions/distribution","/api/analytics/questions/critical",
    ]);
    for (const [url] of request.mock.calls) {
      const params = new URL(url as string,"http://local.test").searchParams;
      expect(params.get("sectorId")).toBe("2");
      expect(params.get("shiftRangeId")).toBe("8");
      expect(params.get("from")).toBe(filter.from);
    }
    expect(new URL(request.mock.calls[2][0] as string,"http://local.test").searchParams.get("limit")).toBe("3");
  });
  it("sinaliza contrato legado sem interromper a renderização", async () => {
    vi.spyOn(api, "request").mockResolvedValue({sessions:{started:0}});
    await expect(analyticsService.dashboard({from:"2026-11-01T03:00:00Z",to:"2026-12-01T03:00:00Z"})).rejects.toThrow("API ainda não disponibiliza");
  });
  it("registra manifestação pública sem CSRF administrativo e altera status com CSRF padrão", async () => {
    const request = vi.spyOn(api, "request").mockResolvedValue(undefined);
    const input = { sectorId: 2, ticketType: "complaint" as const, body: "Mensagem fictícia", policyAccepted: true as const };
    await ombudsmanService.create(input);
    await ombudsmanService.updateStatus(4, "read");
    expect(request).toHaveBeenNthCalledWith(1, "/api/public/ombudsman/tickets", { method: "POST", body: input, csrf: false, refreshOnUnauthorized: false });
    expect(request).toHaveBeenNthCalledWith(2, "/api/ombudsman/tickets/4/status", { method: "PATCH", body: { status: "read" } });
  });
});

describe("integridade da conclusão", () => {
  const report = (started: number, complete: number, incomplete: number, rate: number | null): AnalyticsDashboard => ({
    sessions: {started, complete, incomplete, completionRate: rate, nonCompletionRate: rate === null ? null : 100 - rate, closedIncomplete: 0, inProgress: incomplete, endedOrExpired: 0, unknownDeadline: 0},
    daily: started ? [{day:"2026-11-01", started, complete}] : [], shifts: [], nps: {responses:0, detractors:0, passives:0, promoters:0, value:null}, unclassifiedCompleted:0, questions:[], distribution:[], dailyAnswers:[], sectors:[], ombudsman:[], responseRate:null, teamAttributionAvailable:false, timeZone:"America/Sao_Paulo", privacyNotice:"",
  });
  it("aceita 80 concluídas em 100 iniciadas como 80%", () => {
    expect(completionIndicators(report(100, 80, 20, 80))).toEqual({rate:80, nonCompletion:20});
  });
  it("não mostra 100% quando há sessões incompletas", () => {
    expect(completionIndicators(report(100, 80, 20, 100))).toMatchObject({rate:null, reason:expect.any(String)});
  });
  it("mantém indisponibilidade sem sessões e detecta série divergente", () => {
    expect(completionIndicators(report(0, 0, 0, null))).toEqual({rate:null, nonCompletion:null});
    expect(completionIndicators({...report(100, 80, 20, 80), daily:[{day:"2026-11-01",started:90,complete:80}]})).toMatchObject({rate:null, reason:expect.any(String)});
  });
});
