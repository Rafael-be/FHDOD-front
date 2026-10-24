import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "../services/http";
import { auditService } from "./audit";

describe("auditService", () => { afterEach(() => vi.restoreAllMocks()); it("preserva paginação baseada em cursor", async () => { const request = vi.spyOn(api, "request").mockResolvedValue({ records: [], nextCursor: null }); await auditService.list("cursor-opaco", 101); expect(request).toHaveBeenCalledWith("/api/audit-logs?limit=100&cursor=cursor-opaco"); }); });
