import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "../services/http";
import { submissionsService } from "./submissions";

describe("submissionsService", () => {
  afterEach(() => vi.restoreAllMocks());

  it("inicia uma sessão pública sem autenticação administrativa", async () => {
    const request = vi.spyOn(api, "request").mockResolvedValue(undefined);
    await submissionsService.start(3);
    expect(request).toHaveBeenCalledWith("/api/public/sectors/3/submissions", {
      method: "POST",
      csrf: false,
      refreshOnUnauthorized: false,
    });
  });

  it("envia a capability da sessão ao registrar uma resposta", async () => {
    const request = vi.spyOn(api, "request").mockResolvedValue(undefined);
    await submissionsService.answer("session-1", "token-1", {
      sessionQuestionId: 9,
      status: "answered",
      score: 10,
    });
    expect(request).toHaveBeenCalledWith("/api/public/submissions/session-1/answers", {
      method: "POST",
      csrf: false,
      refreshOnUnauthorized: false,
      headers: { "x-session-capability": "token-1" },
      body: { sessionQuestionId: 9, status: "answered", score: 10 },
    });
  });
});
