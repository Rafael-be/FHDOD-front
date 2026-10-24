import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "../services/http";
import { pagesService } from "./pages";
describe("pagesService", () => { afterEach(() => vi.restoreAllMocks()); it("consulta e publica páginas pelo slug", async () => { const request = vi.spyOn(api, "request").mockResolvedValue(undefined); await pagesService.get("lgpd"); await pagesService.publish("lgpd", "LGPD", "Conteúdo aprovado."); expect(request).toHaveBeenNthCalledWith(1, "/api/pages/lgpd", { refreshOnUnauthorized: false }); expect(request).toHaveBeenNthCalledWith(2, "/api/pages/lgpd", { method: "PUT", body: { title: "LGPD", content: "Conteúdo aprovado." } }); }); });
