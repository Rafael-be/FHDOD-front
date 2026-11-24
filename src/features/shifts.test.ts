import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "../services/http";
import { shiftsService } from "./shifts";

describe("shiftsService", () => {
  afterEach(() => vi.restoreAllMocks());

  it("consulta modelo e versão vigente", async () => {
    const request = vi.spyOn(api, "request").mockResolvedValue("csv");
    await shiftsService.template();
    await shiftsService.download();
    expect(request).toHaveBeenNthCalledWith(1, "/api/shift-sheets/template");
    expect(request).toHaveBeenNthCalledWith(2, "/api/shift-sheets/current/export");
  });

  it("envia a planilha como corpo binário", async () => {
    const request = vi.spyOn(api, "request").mockResolvedValue({ versionId: 4, warnings: [] });
    await shiftsService.importFile(new Uint8Array([1, 2, 3]));
    expect(request).toHaveBeenCalledWith("/api/shift-sheets", expect.objectContaining({
      method: "POST",
      body: expect.any(Uint8Array),
      headers: { "Content-Type": "application/octet-stream" },
    }));
  });
});
