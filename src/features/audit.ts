import { api } from "../services/http";

export interface AuditRecord { id: number; actorUserId: number | null; action: string; entityType: string; entityId: number | null; oldValues: unknown; newValues: unknown; createdAt: string }
export interface AuditPage { records: AuditRecord[]; nextCursor: string | null }

export const auditService = {
  list(cursor?: string, limit = 50) {
    const query = new URLSearchParams({ limit: String(Math.min(100, Math.max(1, limit))) });
    if (cursor) query.set("cursor", cursor);
    return api.request<AuditPage>(`/api/audit-logs?${query.toString()}`);
  },
};
