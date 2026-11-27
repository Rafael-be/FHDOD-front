import { api, ApiError } from "../services/http";

export interface SubmissionQuestion {
  questionId: number;
  questionVersionId: number;
  text: string;
  questionKind: "sector" | "standard";
  isNps: boolean;
  position: number;
  required: boolean;
  options: number[];
  minScore: number;
  maxScore: number;
  lowScoreThreshold?: number;
}

export function lowScoreTriggersOmbudsman(question: SubmissionQuestion, score: number | null): boolean {
  if (score === null) return false;
  const fallback = question.isNps ? 6 : 2;
  const custom = question.lowScoreThreshold;
  const threshold = typeof custom === "number" && Number.isInteger(custom) && custom >= question.minScore && custom <= question.maxScore ? custom : fallback;
  return score <= threshold;
}
export interface CurrentForm { sectorId: number; sectorName?: string; formVersionId: number; questions: SubmissionQuestion[] }
export interface CachedForm { form: CurrentForm; etag?: string }
export interface SubmissionAnswer { questionId: number; questionVersionId: number; status: "answered" | "skipped"; score: number | null }
export interface SubmissionAnswerResult { sessionId: string; status: "incomplete" | "complete"; answered: boolean; expiresAt: string; refreshesRemaining?: number; replayed?: boolean }
export interface SubmissionStart {
  capability: { sessionId: string; token: string };
  session: { id: string; sectorId: number; formVersionId: number; expiresAt: string };
  answer: SubmissionAnswerResult;
  replayed: boolean;
}

export function isSatisfactionQuestion(question: Pick<SubmissionQuestion, "isNps" | "options" | "minScore" | "maxScore">): boolean {
  return !question.isNps && question.minScore === 1 && question.maxScore === 5 && [1, 2, 3, 4, 5].every((score) => question.options.includes(score));
}

const baseUrl = import.meta.env.VITE_API_BASE_URL ?? "";
export function newAttempt() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const capability = btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return { attemptId: crypto.randomUUID(), capability };
}

export const submissionsService = {
  async currentForm(sectorId: number, previous?: CachedForm): Promise<CachedForm> {
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/api/public/sectors/${sectorId}/current-form`, {
      credentials: "include",
      headers: { Accept: "application/json", ...(previous?.etag ? { "If-None-Match": previous.etag } : {}) },
    });
    if (response.status === 304 && previous) return previous;
    if (response.status === 304) throw new Error("Formulário em cache indisponível.");
    const payload = await response.json();
    if (!response.ok) throw new ApiError(payload?.error?.message ?? "Não foi possível carregar o formulário.", response.status, payload?.error?.code);
    return { form: payload.data as CurrentForm, etag: response.headers.get("ETag") ?? undefined };
  },
  start(sectorId: number, formVersionId: number, attemptId: string, capability: string, answer: SubmissionAnswer) {
    return api.request<SubmissionStart>(`/api/public/sectors/${sectorId}/submissions`, {
      method: "POST", csrf: false, refreshOnUnauthorized: false,
      body: { formVersionId, attemptId, capability, answer },
    });
  },
  answer(sessionId: string, token: string, answer: SubmissionAnswer) {
    return api.request<SubmissionAnswerResult>(`/api/public/submissions/${sessionId}/answers`, {
      method: "POST", csrf: false, refreshOnUnauthorized: false,
      headers: { "x-session-capability": token }, body: answer,
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
