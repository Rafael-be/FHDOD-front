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
      questionId: 9,
      questionVersionId: 18,
      status: "answered",
      score: 10,
    });
    expect(request).toHaveBeenCalledWith("/api/public/submissions/session-1/answers", {
      method: "POST",
      csrf: false,
      refreshOnUnauthorized: false,
      headers: { "x-session-capability": "token-1" },
      body: { questionId: 9, questionVersionId: 18, status: "answered", score: 10 },
    });
  });
  it("renova e encerra apenas a sessão identificada pela capability", async () => {
    const request = vi.spyOn(api, "request").mockResolvedValue(undefined);
    await submissionsService.refresh("session-1", "token-1");
    await submissionsService.close("session-1", "token-1");
    for (const [path, options] of request.mock.calls) {
      expect(path).toMatch(/^\/api\/public\/submissions\/session-1\/(refresh|close)$/);
      expect(options).toMatchObject({ method: "POST", csrf: false, refreshOnUnauthorized: false, headers: { "x-session-capability": "token-1" } });
    }
  });
});
