import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "../services/http";
import { questionsService } from "./questions";

describe("questionsService", () => {
  afterEach(() => vi.restoreAllMocks());
  it("usa os contratos de perguntas próprias e ordenação", async () => {
    const request = vi.spyOn(api, "request").mockResolvedValue(undefined);
    await questionsService.createSector(3, "Como foi o atendimento?", 1);
    await questionsService.reorderSector(3, [7, 9]);
    expect(request).toHaveBeenNthCalledWith(1, "/api/sectors/3/questions", { method: "POST", body: { text: "Como foi o atendimento?", displayOrder: 1 } });
    expect(request).toHaveBeenNthCalledWith(2, "/api/sectors/3/questions/reorder", { method: "POST", body: { orderedIds: [7, 9] } });
  });
});
