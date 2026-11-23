import { api } from "../services/http";

export interface SubmissionCapability {
  sessionId: string;
  token: string;
}

export interface SubmissionQuestion {
  sessionQuestionId: number;
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
  answer(sessionId: string, token: string, input: { sessionQuestionId: number; status: "answered" | "skipped"; score: number | null }) {
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
};
