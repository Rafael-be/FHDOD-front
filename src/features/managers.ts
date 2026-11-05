import { api } from "../services/http";

export interface SectorOption { id: number; code: string; name: string; deletedAt: string | null }
export interface Manager { id: number; fullName: string; email: string; role: "sector_manager"; deletedAt: string | null }
export interface ManagerDetails extends Manager { sectors: SectorOption[] }
export interface CreateManagerInput { fullName: string; email: string; temporaryPassword: string; sectorIds: number[] }

export const managersService = {
  list(includeDeleted = false) { return api.request<Manager[]>(`/api/managers${includeDeleted ? "?deleted=true" : ""}`); },
  details(id: number, includeDeleted = false) { return api.request<ManagerDetails>(`/api/managers/${id}${includeDeleted ? "?deleted=true" : ""}`); },
  create(input: CreateManagerInput) { return api.request<Manager>("/api/managers", { method: "POST", body: input }); },
  update(id: number, input: Pick<Manager, "fullName" | "email">) { return api.request<Manager>(`/api/managers/${id}`, { method: "PATCH", body: input }); },
  deactivate(id: number) { return api.request<void>(`/api/managers/${id}/deactivate`, { method: "POST" }); },
  reactivate(id: number, temporaryPassword: string) { return api.request<void>(`/api/managers/${id}/reactivate`, { method: "POST", body: { temporaryPassword } }); },
  sectors(id: number) { return api.request<SectorOption[]>(`/api/managers/${id}/sectors`); },
  assignSector(managerId: number, sectorId: number) { return api.request<void>(`/api/managers/${managerId}/sectors/${sectorId}`, { method: "PUT" }); },
  unassignSector(managerId: number, sectorId: number) { return api.request<void>(`/api/managers/${managerId}/sectors/${sectorId}`, { method: "DELETE" }); },
  availableSectors() { return api.request<SectorOption[]>("/api/sectors"); },
};
