import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { pagesService } from "./pages";
import { ApiError } from "../services/http";
import { PublicSubmissionPage, currentFormKey } from "./PublicSubmissionPage";
import { submissionsService, type CachedForm, type SubmissionStart } from "./submissions";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const form: CachedForm = { form: { sectorId: 2, sectorName: "Pronto Atendimento", formVersionId: 42, questions: [
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
  afterEach(async () => { vi.useRealTimers(); if (root) await act(async () => root.unmount()); vi.restoreAllMocks(); document.body.innerHTML = ""; });

  it("mostra a primeira pergunta sem sessão e cria sessão apenas com a resposta zero", async () => {
    vi.spyOn(submissionsService, "currentForm").mockResolvedValue(form);
    const start = vi.spyOn(submissionsService, "start").mockResolvedValue(started);
    await render();
    expect(container.textContent).toContain("Recomendaria este atendimento?");
    expect(start).not.toHaveBeenCalled();
    expect(container.querySelector(".fhdod-satisfaction-rating")).toBeNull();
    expect(container.querySelector(".fhdod-question-progress")).toBeNull();
    await act(async () => { button("0").click(); });
    expect(start).toHaveBeenCalledOnce();
    expect(start.mock.calls[0][1]).toBe(42);
    expect(start.mock.calls[0][4]).toEqual({ questionId: 1, questionVersionId: 2, status: "answered", score: 0 });
    expect(container.textContent).toContain("Como foi o atendimento?");
    expect([...container.querySelectorAll(".fhdod-satisfaction-rating__score")].map((item) => item.textContent)).toEqual(["5", "4", "3", "2", "1"]);
    expect(container.querySelector(".fhdod-satisfaction-rating")).not.toBeNull();
    expect([...container.querySelectorAll(".fhdod-satisfaction-rating__face")].map((item) => (item as HTMLImageElement).src)).toHaveLength(5);
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
    await act(async () => {client.setQueryData(currentFormKey(2), {form:{...form.form, formVersionId:90}});});
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
    expect(button("Iniciar nova avaliação")).toBeUndefined();
    expect(container.textContent).toContain("Recomendaria este atendimento?");
  });

  it("pula com nota nula apenas após confirmação e encerra sem criar outra sessão", async () => {
    vi.spyOn(submissionsService, "currentForm").mockResolvedValue(form);
    const start = vi.spyOn(submissionsService, "start").mockResolvedValue(started);
    const answer = vi.spyOn(submissionsService, "answer").mockResolvedValue({...started.answer, status:"complete"});
    await render();
    expect(button("Pular")).toBeDefined();
    await act(async () => button("Pular").click());
    expect(start.mock.calls[0][4]).toEqual({questionId:1,questionVersionId:2,status:"skipped",score:null});
    expect(container.textContent).toContain("Como foi o atendimento?");
    await act(async () => button("Pular").click());
    expect(answer).toHaveBeenCalledWith("session-1","token-1",{questionId:3,questionVersionId:4,status:"skipped",score:null});
    expect(container.textContent).toContain("Obrigado pela sua participação");
    expect(start).toHaveBeenCalledOnce();
  });

  it("encerra no backend, reinicia sem reutilizar a tentativa e oculta o toast após cinco segundos", async () => {
    vi.spyOn(submissionsService, "currentForm").mockResolvedValue(form);
    const start = vi.spyOn(submissionsService, "start").mockResolvedValue(started);
    const close = vi.spyOn(submissionsService, "close").mockResolvedValue({sessionId:"session-1",status:"closed"});
    await render();
    expect(button("Encerrar sessão")).toBeUndefined();
    await act(async () => button("0").click());
    expect(button("Encerrar sessão")).toBeUndefined();
    expect(button("Pular")).toBeDefined();
    expect([...container.querySelectorAll(".fhdod-question-actions button")].map(item=>item.textContent)).toEqual(["Reiniciar formulário","Pular"]);
    await act(async () => button("Reiniciar formulário").click());
    expect(close).toHaveBeenCalledWith("session-1","token-1");
    expect(container.querySelector("h1")?.textContent).toBe("Recomendaria este atendimento?");
    await act(async () => button("0").click());
    expect(start).toHaveBeenCalledTimes(2);
    expect(start.mock.calls[0][2]).not.toBe(start.mock.calls[1][2]);
  });

  it("mantém a sessão e não mostra sucesso se o encerramento falhar", async () => {
    vi.spyOn(submissionsService, "currentForm").mockResolvedValue(form);
    vi.spyOn(submissionsService, "start").mockResolvedValue(started);
    vi.spyOn(submissionsService, "close").mockRejectedValue(new TypeError("offline"));
    await render();
    await act(async () => button("0").click());
    await act(async () => button("Reiniciar formulário").click());
    expect(container.querySelector("h1")?.textContent).toBe("Como foi o atendimento?");
    expect(container.textContent).toContain("Falha de conexão");
    expect(container.querySelector(".fhdod-toast")).toBeNull();
  });

  it("não avança nem registra nota quando o backend rejeita o skip", async () => {
    vi.spyOn(submissionsService, "currentForm").mockResolvedValue(form);
    vi.spyOn(submissionsService, "start").mockResolvedValue(started);
    vi.spyOn(submissionsService, "answer").mockRejectedValue(new ApiError("skip bloqueado", 400, "QUESTION_NOT_SKIPPABLE"));
    await render();
    await act(async () => button("0").click());
    await act(async () => button("Pular").click());
    expect(container.querySelector("h1")?.textContent).toBe("Como foi o atendimento?");
    expect(container.textContent).toContain("Esta pergunta não pode ser pulada.");
  });

  it("renova pelo prazo confirmado e ignora resposta tardia depois da expiração", async () => {
    vi.spyOn(submissionsService, "currentForm").mockResolvedValue({...form, form: {...form.form, questions: [{...form.form.questions[0], options: [7]}, form.form.questions[1]]}});
    const deadline = (seconds: number) => new Date(Date.now() + seconds * 1000).toISOString();
    vi.spyOn(submissionsService, "start").mockResolvedValue({...started,answer:{...started.answer,expiresAt:deadline(8)}});
    const refresh = vi.spyOn(submissionsService, "refresh").mockImplementation(async () => ({expiresAt:deadline(5),refreshesRemaining:0}));
    let resolve!: (result: SubmissionStart["answer"]) => void;
    vi.spyOn(submissionsService, "answer").mockImplementation(() => new Promise(done => {resolve = done;}));
    await render();
    vi.useFakeTimers();
    try {
      await act(async () => button("7").click());
      expect(container.querySelector('[role="dialog"]')?.textContent).toContain("Continuar respondendo");
      await act(async () => button("Continuar respondendo").click());
      expect(refresh).toHaveBeenCalledOnce();
      expect(container.textContent).toContain("Todas as renovações foram utilizadas");
      await act(async () => button("5").click());
      await act(async () => vi.advanceTimersByTimeAsync(6000));
      expect(container.querySelector("h1")?.textContent).toBe("Recomendaria este atendimento?");
      await act(async () => resolve({...started.answer,status:"complete"}));
      expect(container.textContent).not.toContain("Obrigado");
    } finally {vi.useRealTimers();}
  });

  it.each([
    [false, 2, undefined, true], [false, 3, undefined, false],
    [true, 6, undefined, true], [true, 7, undefined, false],
    [false, 3, 3, true], [true, 7, 7, true],
  ])("abre após resposta aceita: NPS=%s, nota=%s, corte=%s", async (isNps, score, lowScoreThreshold, expected) => {
    const oneQuestion = {...form, form: {...form.form, questions: [{...form.form.questions[0], isNps, minScore: isNps ? 0 : 1, maxScore: isNps ? 10 : 5, options: [score], lowScoreThreshold}]}};
    vi.spyOn(submissionsService, "currentForm").mockResolvedValue(oneQuestion);
    vi.spyOn(submissionsService, "start").mockResolvedValue({...started, answer: {...started.answer, status: "complete"}});
    vi.spyOn(pagesService,"get").mockResolvedValue({slug:"lgpd",title:"Política",content:"Texto",versionNumber:1,publishedAt:""});
    await render();
    await act(async () => button(String(score)).click());
    expect(container.textContent).toContain("Obrigado pela sua participação");
    expect(Boolean(container.querySelector('#ticket-type'))).toBe(expected);
    if (expected) {
      expect((container.querySelector('#ticket-type') as HTMLSelectElement).value).toBe("complaint");
      await act(async () => (container.querySelector('[aria-label="Fechar"]') as HTMLButtonElement).click());
    }
    await act(async () => button("Escrever manifestação").click());
    expect((container.querySelector('#ticket-type') as HTMLSelectElement).value).toBe("compliment");
  });

  it("guarda nota baixa e só abre ao concluir a última pergunta", async () => {
    vi.spyOn(submissionsService, "currentForm").mockResolvedValue({...form, form: {...form.form, questions: [{...form.form.questions[0], options: [6]}, form.form.questions[1]]}});
    let resolve!: (value: SubmissionStart) => void;
    vi.spyOn(submissionsService, "start").mockImplementation(() => new Promise(done => {resolve = done;}));
    await render();
    await act(async () => button("6").click());
    expect(container.querySelector('#ticket-type')).toBeNull();
    await act(async () => resolve(started));
    expect(container.querySelector('#ticket-type')).toBeNull();
    expect(container.textContent).toContain("Como foi o atendimento?");
    vi.spyOn(submissionsService, "answer").mockResolvedValue({...started.answer, status: "complete"});
    await act(async () => button("1").click());
    expect(container.textContent).toContain("Obrigado pela sua participação");
    expect((container.querySelector('#ticket-type') as HTMLSelectElement).value).toBe("complaint");
    await act(async () => (container.querySelector('[aria-label="Fechar"]') as HTMLButtonElement).click());
    expect(container.querySelector('#ticket-type')).toBeNull();
  });

  it("não abre a Ouvidoria após falha do backend", async () => {
    vi.spyOn(submissionsService, "currentForm").mockResolvedValue(form);
    vi.spyOn(submissionsService, "start").mockRejectedValue(new ApiError("falha", 500, "INTERNAL"));
    await render();
    await act(async () => button("0").click());
    expect(container.querySelector('#ticket-type')).toBeNull();
  });

  it("abre uma única Ouvidoria para NPS baixo, pausa o contador e usa Elogio na abertura manual", async () => {
    vi.spyOn(submissionsService, "currentForm").mockResolvedValue(form);
    vi.spyOn(submissionsService, "start").mockResolvedValue(started);
    vi.spyOn(submissionsService, "answer").mockResolvedValue({...started.answer,status:"complete"});
    vi.spyOn(pagesService,"get").mockResolvedValue({slug:"lgpd",title:"Política",content:"Texto de teste",versionNumber:1,publishedAt:""});
    await render();
    await act(async () => button("0").click());
    await act(async () => button("1").click());
    expect(container.querySelectorAll("form")).toHaveLength(1);
    expect((container.querySelector("#ticket-type") as HTMLSelectElement).value).toBe("complaint");
    expect(container.textContent).toContain("Esta manifestação será vinculada ao setor Pronto Atendimento.");
    expect(container.querySelectorAll('a[href="/lgpd"]')).toHaveLength(1);
    vi.useFakeTimers();
    try {await act(async () => vi.advanceTimersByTimeAsync(16000));} finally {vi.useRealTimers();}
    expect(container.textContent).toContain("00:15");
    await act(async () => (container.querySelector('[aria-label="Fechar"]') as HTMLButtonElement).click());
    expect(container.querySelector("form")).toBeNull();
    await act(async () => button("Escrever manifestação").click());
    expect((container.querySelector("#ticket-type") as HTMLSelectElement).value).toBe("compliment");
  });
});
