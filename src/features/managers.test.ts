import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "../services/http";
import { managersService } from "./managers";

describe("managersService", () => {
  afterEach(() => vi.restoreAllMocks());
  it("usa o contrato de criação e vínculos de gestores", async () => {
    const request = vi.spyOn(api, "request").mockResolvedValue(undefined);
    const input = { fullName: "Gestora Teste", email: "gestora@hospital.test", temporaryPassword: "senha-temporaria", sectorIds: [2] };
    await managersService.create(input); await managersService.assignSector(1, 2); await managersService.unassignSector(1, 2);
    expect(request).toHaveBeenNthCalledWith(1, "/api/managers", { method: "POST", body: input });
    expect(request).toHaveBeenNthCalledWith(2, "/api/managers/1/sectors/2", { method: "PUT" });
    expect(request).toHaveBeenNthCalledWith(3, "/api/managers/1/sectors/2", { method: "DELETE" });
  });
});
