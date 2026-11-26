import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../services/http";
import { PublicSubmissionPage, currentFormKey } from "./PublicSubmissionPage";
import { submissionsService, type CachedForm, type SubmissionStart } from "./submissions";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const form: CachedForm = { form: { sectorId: 2, formVersionId: 42, questions: [
  { questionId: 1, questionVersionId: 2, text: "Recomendaria este atendimento?", questionKind: "standard", isNps: true, position: 1, required: true, options: [0, 1, 2], minScore: 0, maxScore: 10 },
  { questionId: 3, questionVersionId: 4, text: "Como foi o atendimento?", questionKind: "sector", isNps: false, position: 2, required: false, options: [1, 2, 3, 4, 5], minScore: 1, maxScore: 5 },
] } };
const started: SubmissionStart = { capability: { sessionId: "session-1", token: "token-1" }, session: { id: "session-1", sectorId: 2, formVersionId: 42, expiresAt: new Date(Date.now() + 180000).toISOString() }, answer: { sessionId: "session-1", status: "incomplete", answered: true, expiresAt: new Date(Date.now() + 180000).toISOString() }, replayed: false };
let root: Root;
let container: HTMLDivElement;
let client: QueryClient;
async function render(seed?: { sectorId: number; updatedAt?: number }) {
  container = document.createElement("div"); document.body.append(container);
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  if (seed) client.setQueryData(currentFormKey(seed.sectorId), form, { updatedAt: seed.updatedAt });
  root = createRoot(container);
  await act(async () => { root.render(<QueryClientProvider client={client}><PublicSubmissionPage sectorId={2} /></QueryClientProvider>); });
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
}
function button(label: string) { return [...container.querySelectorAll("button")].find((item) => item.textContent === label)!; }

describe("PublicSubmissionPage", () => {
  afterEach(async () => { if (root) await act(async () => root.unmount()); vi.restoreAllMocks(); document.body.innerHTML = ""; });

  it("mostra a primeira pergunta sem sessão e cria sessão apenas com a resposta zero", async () => {
    vi.spyOn(submissionsService, "currentForm").mockResolvedValue(form);
    const start = vi.spyOn(submissionsService, "start").mockResolvedValue(started);
    await render();
    expect(container.textContent).toContain("Recomendaria este atendimento?");
    expect(start).not.toHaveBeenCalled();
    expect(container.querySelector(".fhdod-question-progress")).toBeNull();
    await act(async () => { button("0").click(); });
    expect(start).toHaveBeenCalledOnce();
    expect(start.mock.calls[0][1]).toBe(42);
    expect(start.mock.calls[0][4]).toEqual({ questionId: 1, questionVersionId: 2, status: "answered", score: 0 });
    expect(container.textContent).toContain("Como foi o atendimento?");
    expect([...container.querySelectorAll(".fhdod-score-options button")].map((item) => item.textContent)).toEqual(["5", "4", "3", "2", "1"]);
    expect(container.querySelector("h1")?.getAttribute("tabindex")).toBe("-1");
  });

  it("aguarda confirmação, bloqueia clique duplo e conclui após resposta individual", async () => {
    vi.spyOn(submissionsService, "currentForm").mockResolvedValue(form);
    vi.spyOn(submissionsService, "start").mockResolvedValue(started);
    let resolve!: (value: { sessionId: string; status: "complete"; answered: true; expiresAt: string }) => void;
    const answer = vi.spyOn(submissionsService, "answer").mockImplementation(() => new Promise((done) => { resolve = done; }));
    await render();
    await act(async () => { button("0").click(); });
    await act(async () => { button("5").click(); button("5").click(); });
    expect(answer).toHaveBeenCalledOnce();
    expect(container.textContent).toContain("Como foi o atendimento?");
    await act(async () => resolve({ sessionId: "session-1", status: "complete", answered: true, expiresAt: new Date(Date.now() + 120000).toISOString() }));
    expect(container.textContent).toContain("Obrigado pela sua participação");
    expect(answer).toHaveBeenCalledWith("session-1", "token-1", { questionId: 3, questionVersionId: 4, status: "answered", score: 5 });
  });

  it("mantém tentativa e resposta ao repetir após falha de conexão", async () => {
    vi.spyOn(submissionsService, "currentForm").mockResolvedValue(form);
    const start = vi.spyOn(submissionsService, "start").mockRejectedValueOnce(new TypeError("network")).mockResolvedValue(started);
    await render();
    await act(async () => { button("0").click(); });
    expect(container.textContent).toContain("Falha de conexão");
    await act(async () => { button("Tentar enviar novamente").click(); });
    expect(start).toHaveBeenCalledTimes(2);
    expect(start.mock.calls[1].slice(1)).toEqual(start.mock.calls[0].slice(1));
  });

  it("recarrega o formulário ao receber FORM_VERSION_CHANGED", async () => {
    const currentForm = vi.spyOn(submissionsService, "currentForm").mockResolvedValue(form);
    vi.spyOn(submissionsService, "start").mockRejectedValue(new ApiError("changed", 409, "FORM_VERSION_CHANGED"));
    await render();
    await act(async () => { button("0").click(); });
    expect(currentForm).toHaveBeenCalledTimes(2);
    expect(container.textContent).toContain("O formulário foi atualizado");
    expect(client.getQueryData(currentFormKey(2))).toEqual(form);
  });

  it("mantém cache separado por setor e reutiliza formulário fresco", async () => {
    const currentForm = vi.spyOn(submissionsService, "currentForm").mockResolvedValue(form);
    await render();
    expect(currentForm).toHaveBeenCalledOnce();
    expect(client.getQueryData(currentFormKey(2))).toEqual(form);
    expect(client.getQueryData(currentFormKey(3))).toBeUndefined();
    await act(async () => { root.unmount(); });
    root = createRoot(container);
    await act(async () => { root.render(<QueryClientProvider client={client}><PublicSubmissionPage sectorId={2} /></QueryClientProvider>); });
    expect(currentForm).toHaveBeenCalledOnce();
    await act(async () => { root.unmount(); });
    root = createRoot(container);
    await act(async () => { root.render(<QueryClientProvider client={client}><PublicSubmissionPage sectorId={3} /></QueryClientProvider>); });
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
    expect(currentForm).toHaveBeenCalledTimes(2);
    expect(currentForm.mock.calls[1][0]).toBe(3);
  });

  it("revalida o formulário depois de cinco minutos", async () => {
    const currentForm = vi.spyOn(submissionsService, "currentForm").mockResolvedValue(form);
    await render({ sectorId: 2, updatedAt: Date.now() - 5 * 60 * 1000 - 1000 });
    expect(currentForm).toHaveBeenCalledOnce();
    expect(currentForm.mock.calls[0][1]).toEqual(form);
  });

  it("encerra a interface quando o backend informa expiração e permite nova tentativa", async () => {
    vi.spyOn(submissionsService, "currentForm").mockResolvedValue(form);
    vi.spyOn(submissionsService, "start").mockResolvedValue(started);
    vi.spyOn(submissionsService, "answer").mockRejectedValue(new ApiError("expired", 410, "SUBMISSION_EXPIRED"));
    await render();
    await act(async () => { button("0").click(); });
    await act(async () => { button("5").click(); });
    expect(container.textContent).toContain("O prazo da avaliação terminou");
    await act(async () => { button("Iniciar nova avaliação").click(); });
    expect(container.textContent).toContain("Recomendaria este atendimento?");
  });
  it("opens ombudsman after a confirmed low NPS score", async () => {
    vi.spyOn(submissionsService, "currentForm").mockResolvedValue(form);
    vi.spyOn(submissionsService, "start").mockResolvedValue(started);
    vi.spyOn(submissionsService, "answer").mockResolvedValueOnce({ sessionId: "session-1", status: "incomplete", answered: true, expiresAt: new Date(Date.now() + 120000).toISOString() }).mockResolvedValueOnce({ sessionId: "session-1", status: "complete", answered: true, expiresAt: new Date(Date.now() + 120000).toISOString() });
    await render();
    await act(async () => { button("0").click(); });
    expect(container.querySelector('[role="dialog"]')).not.toBeNull();
    expect(container.querySelector('[role="dialog"]')).not.toBeNull();
  });
});
