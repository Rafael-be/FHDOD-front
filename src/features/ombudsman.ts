import { api } from "../services/http";

export type TicketType = "complaint" | "compliment" | "suggestion_other";
export type TicketStatus = "open" | "read" | "contact_attempt" | "contact_failed" | "resolved";
export interface Ticket {
  id: number; sectorId: number; ticketType: TicketType; status: TicketStatus; body: string;
  phone: string | null; occurredAt: string; createdAt: string; updatedAt: string;
  acceptedPolicyVersionId?: number; policyAcceptedAt?: string;
}
export interface TicketPage { items: Ticket[]; page: number; pageSize: number; total: number }
export interface TicketFilters { sectorId?: number; ticketType?: TicketType; status?: TicketStatus; page?: number; pageSize?: number }
export const ombudsmanService = {
  create(input: { sectorId: number; ticketType: TicketType; body: string; phone?: string; policyAccepted: true }) {
    return api.request<{ id: number; status: TicketStatus }>("/api/public/ombudsman/tickets", { method: "POST", body: input, csrf: false, refreshOnUnauthorized: false });
  },
  list(filters: TicketFilters) {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(filters)) if (value !== undefined) query.set(key, String(value));
    return api.request<TicketPage>(`/api/ombudsman/tickets?${query}`);
  },
  get(id: number) { return api.request<Ticket>(`/api/ombudsman/tickets/${id}`); },
  updateStatus(id: number, status: TicketStatus) { return api.request<{ id: number; status: TicketStatus }>(`/api/ombudsman/tickets/${id}/status`, { method: "PATCH", body: { status } }); },
};
