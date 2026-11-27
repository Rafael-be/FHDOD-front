import { api } from "../services/http";

export interface DraftItem {
  questionId: number | null; sourceQuestionVersionId: number | null;
  questionKind: "sector" | "standard"; isNps: boolean; text: string; position: number;
  canEditContent?: boolean; editRestrictionReason?: string;
}
export interface FormDraft {
  sectorId: number; publishedVersionId: number | null; operationalStatus: "active" | "preparing";
  missingRequirements: string[]; draftStatus: "drafting" | "published" | "unpublished";
  revision: number; items: DraftItem[];
}
export interface DraftReadiness {
  operationalStatus: "active" | "preparing"; draftStatus: FormDraft["draftStatus"];
  status: "active" | "preparing"; missingRequirements: string[]; publishedVersionId: number | null;
}
export interface FormVersion { id: number; versionNumber: number; publishedAt: string; current: boolean; questionCount?: number }
export interface VersionDetail { versionId: number; items: (DraftItem & { questionVersionId: number })[] }
export function normalizeDraftItems(items: DraftItem[]): DraftItem[] {
  return [...items.filter((item) => !item.isNps), ...items.filter((item) => item.isNps)]
    .map((item, index) => ({ ...item, position: index + 1 }));
}
export function readinessFingerprint(revision: number, items: DraftItem[]): string {
  return `${revision}:${JSON.stringify(normalizeDraftItems(items))}`;
}
const path = (sectorId: number) => `/api/sectors/${sectorId}`;
export const formDraftService = {
  get: (sectorId: number) => api.request<FormDraft>(`${path(sectorId)}/form-draft`),
  save: (sectorId: number, expectedRevision: number, items: DraftItem[]) => api.request<{ revision: number; draftStatus: FormDraft["draftStatus"] }>(`${path(sectorId)}/form-draft`, { method: "PUT", body: { expectedRevision, items: items.map((item, index) => ({ questionId: item.questionId, sourceQuestionVersionId: item.sourceQuestionVersionId, questionKind: item.questionKind, isNps: item.isNps, text: item.text.trim(), position: index + 1 })) } }),
  discard: (sectorId: number, expectedRevision: number) => api.request<{ discarded: boolean }>(`${path(sectorId)}/form-draft`, { method: "DELETE", body: { expectedRevision } }),
  readiness: (sectorId: number) => api.request<DraftReadiness>(`${path(sectorId)}/form-draft/readiness`),
  publish: (sectorId: number, expectedRevision: number) => api.request<{ published: boolean; formVersionId: number | null; versionNumber?: number }>(`${path(sectorId)}/form-draft/publish`, { method: "POST", body: { expectedRevision } }),
  history: (sectorId: number) => api.request<FormVersion[]>(`${path(sectorId)}/form-versions`),
  version: (sectorId: number, versionId: number) => api.request<VersionDetail>(`${path(sectorId)}/form-versions/${versionId}`),
  restore: (sectorId: number, versionId: number, expectedRevision: number) => api.request<{ revision: number }>(`${path(sectorId)}/form-versions/${versionId}/restore`, { method: "POST", body: { expectedRevision } }),
};
