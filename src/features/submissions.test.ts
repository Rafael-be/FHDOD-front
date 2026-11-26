import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "../services/http";
import { newAttempt, submissionsService, type CachedForm } from "./submissions";

const answer = { questionId: 9, questionVersionId: 18, status: "answered" as const, score: 0 };
const cached: CachedForm = { etag: '"form-v1"', form: { sectorId: 3, formVersionId: 1, questions: [] } };

describe("submissionsService", () => {
  afterEach(() => vi.restoreAllMocks());

  it("consulta o formulário sem criar sessão e reutiliza o ETag na revalidação 304", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 304 }));
    const start = vi.spyOn(submissionsService, "start");
    expect(await submissionsService.currentForm(3, cached)).toBe(cached);
    expect(fetchMock).toHaveBeenCalledWith("/api/public/sectors/3/current-form", {
      credentials: "include", headers: { Accept: "application/json", "If-None-Match": '"form-v1"' },
    });
    expect(start).not.toHaveBeenCalled();
  });

  it("gera UUID e capability com 32 bytes aleatórios", () => {
    const attempt = newAttempt();
    expect(attempt.attemptId).toMatch(/^[\da-f-]{36}$/i);
    expect(attempt.capability).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it("envia a primeira resposta atomicamente com versão, tentativa e capability", async () => {
    const request = vi.spyOn(api, "request").mockResolvedValue(undefined);
    await submissionsService.start(3, 42, "attempt-1", "capability", answer);
    expect(request).toHaveBeenCalledWith("/api/public/sectors/3/submissions", {
      method: "POST", csrf: false, refreshOnUnauthorized: false,
      body: { formVersionId: 42, attemptId: "attempt-1", capability: "capability", answer },
    });
  });

  it("envia cada resposta seguinte separadamente com a capability no cabeçalho", async () => {
    const request = vi.spyOn(api, "request").mockResolvedValue(undefined);
    await submissionsService.answer("session-1", "token-1", answer);
    expect(request).toHaveBeenCalledWith("/api/public/submissions/session-1/answers", {
      method: "POST", csrf: false, refreshOnUnauthorized: false,
      headers: { "x-session-capability": "token-1" }, body: answer,
    });
  });
});
