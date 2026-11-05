import { api } from "../services/http";

export interface Sector { id: number; code: string; name: string; deletedAt: string | null }
export interface SectorStatus { sectorId: number; status: "active" | "preparing"; missingRequirements: string[] }

export const sectorsService = {
  list(includeDeleted = false) { return api.request<Sector[]>(`/api/sectors${includeDeleted ? "?deleted=true" : ""}`); },
  create(code: string, name: string) { return api.request<Sector>("/api/sectors", { method: "POST", body: { code, name } }); },
  update(id: number, name: string) { return api.request<Sector>(`/api/sectors/${id}`, { method: "PATCH", body: { name } }); },
  status(id: number) { return api.request<SectorStatus>(`/api/sectors/${id}/status`); },
  deactivate(id: number) { return api.request<void>(`/api/sectors/${id}/deactivate`, { method: "POST" }); },
  reactivate(id: number) { return api.request<void>(`/api/sectors/${id}/reactivate`, { method: "POST" }); },
};
