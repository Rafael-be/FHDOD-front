import { api } from "../services/http";

export interface SubmissionCapability {
  sessionId: string;
  token: string;
}

export interface SubmissionQuestion {
  questionId: number;
  questionVersionId: number;
  text: string;
  questionKind: "sector" | "standard";
  isNps: boolean;
  position: number;
}

export interface SubmissionStart {
  capability: SubmissionCapability;
  session: {
    id: string;
    sectorId: number;
    shiftSheetVersionId: number | null;
    shiftRangeId: number | null;
    expiresAt: string;
  };
  questions: SubmissionQuestion[];
}

export interface SubmissionAnswerResult {
  sessionId: string;
  status: "incomplete" | "complete";
  answered: boolean;
}

export const submissionsService = {
  start(sectorId: number) {
    return api.request<SubmissionStart>(`/api/public/sectors/${sectorId}/submissions`, { method: "POST", csrf: false, refreshOnUnauthorized: false });
  },
  answer(sessionId: string, token: string, input: { questionId: number; questionVersionId: number; status: "answered" | "skipped"; score: number | null }) {
    return api.request<SubmissionAnswerResult>(`/api/public/submissions/${sessionId}/answers`, {
      method: "POST",
      csrf: false,
      refreshOnUnauthorized: false,
      headers: { "x-session-capability": token },
      body: input,
    });
  },
  restart(sessionId: string, token: string) {
    return api.request<SubmissionStart>(`/api/public/submissions/${sessionId}/restart`, {
      method: "POST",
      csrf: false,
      refreshOnUnauthorized: false,
      headers: { "x-session-capability": token },
    });
  },
  refresh(sessionId: string, token: string) {
    return api.request<{ expiresAt: string; refreshesRemaining: number }>(`/api/public/submissions/${sessionId}/refresh`, {
      method: "POST", csrf: false, refreshOnUnauthorized: false, headers: { "x-session-capability": token },
    });
  },
  close(sessionId: string, token: string) {
    return api.request<{ sessionId: string; status: "closed" }>(`/api/public/submissions/${sessionId}/close`, {
      method: "POST", csrf: false, refreshOnUnauthorized: false, headers: { "x-session-capability": token },
    });
  },
};
