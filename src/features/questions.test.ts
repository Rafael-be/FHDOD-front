import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "../services/http";
import { questionsService } from "./questions";

describe("questionsService", () => {
  afterEach(() => vi.restoreAllMocks());
  it("usa os contratos de perguntas próprias e ordenação", async () => {
    const request = vi.spyOn(api, "request").mockResolvedValue(undefined);
    await questionsService.createSector(3, "Como foi o atendimento?");
    await questionsService.reorderSector(3, [7, 9]);
    expect(request).toHaveBeenNthCalledWith(1, "/api/sectors/3/questions", { method: "POST", body: { text: "Como foi o atendimento?" } });
    expect(request).toHaveBeenNthCalledWith(2, "/api/sectors/3/questions/reorder", { method: "POST", body: { orderedIds: [7, 9] } });
  });

  it("cria perguntas padrão e NPS com o escopo confirmado", async () => {
    const request = vi.spyOn(api, "request").mockResolvedValue(undefined);
    await questionsService.createStandard({ text: "Pergunta padrão", scope: "selected_sectors", sectorIds: [3] });
    await questionsService.createNps({ text: "Recomendaria?", scope: "all_sectors", sectorIds: [] });
    expect(request).toHaveBeenNthCalledWith(1, "/api/standard-questions", { method: "POST", body: { text: "Pergunta padrão", scope: "selected_sectors", sectorIds: [3] } });
    expect(request).toHaveBeenNthCalledWith(2, "/api/nps-questions", { method: "POST", body: { text: "Recomendaria?", scope: "all_sectors", sectorIds: [] } });
  });

  it("reativa perguntas pelo endpoint confirmado", async () => {
    const request = vi.spyOn(api, "request").mockResolvedValue(undefined);
    await questionsService.reactivate(12);
    expect(request).toHaveBeenCalledWith("/api/questions/12/reactivate", { method: "POST" });
  });
});
