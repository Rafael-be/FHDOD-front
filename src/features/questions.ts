import { api } from "../services/http";

export type QuestionKind = "sector" | "standard";
export type QuestionScope = "sector_only" | "all_sectors" | "selected_sectors";

export interface Question {
  id: number;
  questionKind: QuestionKind;
  scope: QuestionScope;
  sectorId: number | null;
  isNps: boolean;
  displayOrder: number;
  deletedAt: string | null;
  versionNumber: number;
  text: string;
  scaleMin: number;
  scaleMax: number;
  lowScoreThreshold: number;
}

export const questionsService = {
  list(sectorId: number) { return api.request<Question[]>(`/api/sectors/${sectorId}/questions`); },
  createSector(sectorId: number, text: string, displayOrder: number) { return api.request<Question>(`/api/sectors/${sectorId}/questions`, { method: "POST", body: { text, displayOrder } }); },
  updateText(id: number, text: string) { return api.request<Question>(`/api/questions/${id}`, { method: "PATCH", body: { text } }); },
  deactivate(id: number) { return api.request<void>(`/api/questions/${id}/deactivate`, { method: "POST" }); },
  reorderSector(sectorId: number, orderedIds: number[]) { return api.request<void>(`/api/sectors/${sectorId}/questions/reorder`, { method: "POST", body: { orderedIds } }); },
};
