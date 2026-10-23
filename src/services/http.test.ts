import { describe, expect, it, vi, afterEach } from "vitest";
import { HttpClient } from "./http";

const response = (body: unknown, status = 200) => new Response(status === 204 ? null : JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

describe("HttpClient", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("envia cookies e CSRF em uma mutação", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(response({ data: { csrfToken: "csrf" } })).mockResolvedValueOnce(response({ data: { id: 1 } }, 201));
    vi.stubGlobal("fetch", fetchMock);
    const client = new HttpClient("http://api.test");
    await expect(client.request<{ id: number }>("/api/managers", { method: "POST", body: { fullName: "Gestor" } })).resolves.toEqual({ id: 1 });
    expect(fetchMock.mock.calls[0][0]).toBe("http://api.test/api/auth/csrf");
    expect(fetchMock.mock.calls[1][1]).toMatchObject({ credentials: "include", method: "POST" });
    expect(new Headers(fetchMock.mock.calls[1][1].headers).get("x-csrf-token")).toBe("csrf");
  });

  it("coordena mutações iguais em andamento", async () => {
    let resolveRequest: (value: Response) => void = () => undefined;
    const pending = new Promise<Response>((resolve) => { resolveRequest = resolve; });
    const fetchMock = vi.fn().mockResolvedValueOnce(response({ data: { csrfToken: "csrf" } })).mockReturnValueOnce(pending);
    vi.stubGlobal("fetch", fetchMock);
    const client = new HttpClient("http://api.test");
    const first = client.request("/api/sectors/1/deactivate", { method: "POST" });
    const second = client.request("/api/sectors/1/deactivate", { method: "POST" });
    resolveRequest(response({}, 204));
    await Promise.all([first, second]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
