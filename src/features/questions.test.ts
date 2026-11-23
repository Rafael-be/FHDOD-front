import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "../services/http";
import { questionsService } from "./questions";
import { formDraftService } from "./formDraft";

describe("formulários e catálogo", () => {
  afterEach(() => vi.restoreAllMocks());
  it("cadastra catálogo sem usar as rotas de escrita legadas", async () => {
    const request = vi.spyOn(api, "request").mockResolvedValue(undefined);
    const input = { text: "Pergunta padrão", scope: "selected_sectors" as const, sectorIds: [3] };
    await questionsService.createStandard(input);
    await questionsService.createNps({ ...input, replaceGlobal: false });
    expect(request).toHaveBeenNthCalledWith(1, "/api/catalog/standard-questions", { method: "POST", body: input });
    expect(request).toHaveBeenNthCalledWith(2, "/api/catalog/nps-questions", { method: "POST", body: { ...input, replaceGlobal: false } });
  });
  it("salva uma revisão do rascunho e publica somente em ação separada", async () => {
    const request = vi.spyOn(api, "request").mockResolvedValue(undefined);
    const item = { questionId: null, sourceQuestionVersionId: null, questionKind: "sector" as const, isNps: false, text: " Como foi? ", position: 7 };
    await formDraftService.save(3, 2, [item]);
    await formDraftService.publish(3, 3);
    expect(request).toHaveBeenNthCalledWith(1, "/api/sectors/3/form-draft", { method: "PUT", body: { expectedRevision: 2, items: [{ ...item, text: "Como foi?", position: 1 }] } });
    expect(request).toHaveBeenNthCalledWith(2, "/api/sectors/3/form-draft/publish", { method: "POST", body: { expectedRevision: 3 } });
  });
  it("descarta e restaura exigindo revisão", async () => {
    const request = vi.spyOn(api, "request").mockResolvedValue(undefined);
    await formDraftService.discard(3, 4);
    await formDraftService.restore(3, 8, 0);
    expect(request).toHaveBeenNthCalledWith(1, "/api/sectors/3/form-draft", { method: "DELETE", body: { expectedRevision: 4 } });
    expect(request).toHaveBeenNthCalledWith(2, "/api/sectors/3/form-versions/8/restore", { method: "POST", body: { expectedRevision: 0 } });
  });
});
