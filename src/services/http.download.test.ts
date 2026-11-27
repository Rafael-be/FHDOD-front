import { afterEach, expect, it, vi } from "vitest";
import { HttpClient } from "./http";

afterEach(() => vi.unstubAllGlobals());
it("envia cookie e CSRF e recebe o PDF binário", async () => {
  const fetcher = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ data: { csrfToken: "token-123" } }), { headers: { "Content-Type": "application/json" } }))
    .mockResolvedValueOnce(new Response(new Blob(["pdf-bytes"], { type: "application/pdf" }), { headers: { "Content-Disposition": 'attachment; filename="report.pdf"' } }));
  vi.stubGlobal("fetch", fetcher);
  const result = await new HttpClient().download("/api/reports/download", { type: "general", format: "pdf" });
  expect(result.disposition).toContain("report.pdf");
  expect(fetcher.mock.calls[1][1].credentials).toBe("include");
  expect(fetcher.mock.calls[1][1].headers["x-csrf-token"]).toBe("token-123");
  expect(result.blob.size).toBeGreaterThan(0);
});
it("interpreta erro JSON no lugar de arquivo", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ data: { csrfToken: "token" } }), { headers: { "Content-Type": "application/json" } }))
    .mockResolvedValueOnce(new Response(JSON.stringify({ error: { code: "VALIDATION_ERROR", message: "Período inválido" } }), { status: 400, headers: { "Content-Type": "application/json" } })));
  await expect(new HttpClient().download("/api/reports/download", {})).rejects.toMatchObject({ status: 400, code: "VALIDATION_ERROR", message: "Período inválido" });
});
