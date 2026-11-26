import { api } from "../services/http";

export type QuestionKind = "sector" | "standard";
export type QuestionScope = "sector_only" | "all_sectors" | "selected_sectors";
export interface Question {
  id: number; questionKind: QuestionKind; scope: QuestionScope; sectorId: number | null;
  isNps: boolean; displayOrder: number; deletedAt: string | null; versionNumber: number;
  text: string; scaleMin: number; scaleMax: number; lowScoreThreshold: number;
}
export interface ScopedQuestionInput { text: string; scope: "all_sectors" | "selected_sectors"; sectorIds: number[]; replaceGlobal?: boolean }
export interface CatalogQuestion extends Question { associations?: { sectorId: number }[]; versionId?: number; questionVersionId?: number }
export interface CatalogPage { items: CatalogQuestion[]; page: number; pageSize: number; total: number }

export const questionsService = {
  catalog(sectorId: number, page = 1) { return api.request<CatalogPage>(`/api/questions?sectorId=${sectorId}&page=${page}&pageSize=100`); },
  createStandard(input: ScopedQuestionInput) { return api.request<Question>("/api/catalog/standard-questions", { method: "POST", body: input }); },
  createNps(input: ScopedQuestionInput) { return api.request<Question>("/api/catalog/nps-questions", { method: "POST", body: input }); },
};
