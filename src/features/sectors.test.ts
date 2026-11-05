import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "../services/http";
import { sectorsService } from "./sectors";

describe("sectorsService", () => { afterEach(() => vi.restoreAllMocks()); it("usa os contratos de setor", async () => { const request = vi.spyOn(api, "request").mockResolvedValue(undefined); await sectorsService.create("uti", "UTI"); await sectorsService.status(1); await sectorsService.deactivate(1); expect(request).toHaveBeenNthCalledWith(1, "/api/sectors", { method: "POST", body: { code: "uti", name: "UTI" } }); expect(request).toHaveBeenNthCalledWith(2, "/api/sectors/1/status"); expect(request).toHaveBeenNthCalledWith(3, "/api/sectors/1/deactivate", { method: "POST" }); }); });
