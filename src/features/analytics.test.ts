import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "../services/http";
import { analyticsService } from "./analytics";
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
