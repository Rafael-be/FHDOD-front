import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PublicSubmissionPage } from "./PublicSubmissionPage";
import { submissionsService, type CachedForm, type SubmissionStart } from "./submissions";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const started: SubmissionStart = {
  capability: { sessionId: "session-1", token: "token-1" },
  session: { id: "session-1", sectorId: 2, formVersionId: 42, expiresAt: new Date(Date.now() + 180000).toISOString() },
  answer: { sessionId: "session-1", status: "incomplete", answered: true, expiresAt: new Date(Date.now() + 180000).toISOString() },
  replayed: false,
};

let root: Root;
let container: HTMLDivElement;

function button(label: string) {
  return [...container.querySelectorAll("button")].find((item) => item.textContent === label)!;
}

describe("PublicSubmissionPage satisfaction scale", () => {
  afterEach(async () => {
    if (root) await act(async () => root.unmount());
    vi.restoreAllMocks();
    document.body.innerHTML = "";
  });

  it("keeps faces on every non-NPS 1-5 question across transitions", async () => {
    const form: CachedForm = { form: { sectorId: 2, sectorName: "Pronto Atendimento", formVersionId: 42, questions: [
      { questionId: 10, questionVersionId: 11, text: "Primeira satisfacao", questionKind: "standard", isNps: false, position: 1, required: true, options: [1, 2, 3, 4, 5], minScore: 1, maxScore: 5 },
      { questionId: 12, questionVersionId: 13, text: "NPS intermediario", questionKind: "standard", isNps: true, position: 2, required: true, options: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10], minScore: 0, maxScore: 10 },
      { questionId: 14, questionVersionId: 15, text: "Segunda satisfacao", questionKind: "sector", isNps: false, position: 3, required: false, options: [1, 2, 3, 4, 5], minScore: 1, maxScore: 5 },
      { questionId: 16, questionVersionId: 17, text: "Ultima satisfacao", questionKind: "standard", isNps: false, position: 4, required: true, options: [1, 2, 3, 4, 5], minScore: 1, maxScore: 5 },
    ] } };
    vi.spyOn(submissionsService, "currentForm").mockResolvedValue(form);
    vi.spyOn(submissionsService, "start").mockResolvedValue({ ...started, answer: { ...started.answer, status: "incomplete" } });
    vi.spyOn(submissionsService, "answer")
      .mockResolvedValueOnce({ ...started.answer, status: "incomplete" })
      .mockResolvedValueOnce({ ...started.answer, status: "incomplete" })
      .mockResolvedValueOnce({ ...started.answer, status: "complete" });

    container = document.createElement("div");
    document.body.append(container);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    root = createRoot(container);
    await act(async () => { root.render(<QueryClientProvider client={client}><PublicSubmissionPage sectorId={2} /></QueryClientProvider>); });
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });

    expect(container.querySelectorAll(".fhdod-satisfaction-rating__face")).toHaveLength(5);
    expect(container.querySelectorAll('[aria-pressed="true"]')).toHaveLength(0);
    await act(async () => button("5").click());
    expect(container.textContent).toContain("NPS intermediario");
    expect(container.querySelector(".fhdod-satisfaction-rating")).toBeNull();
    expect(container.querySelector(".fhdod-score-options")?.getAttribute("data-nps")).toBe("true");
    await act(async () => button("10").click());
    expect(container.textContent).toContain("Segunda satisfacao");
    expect(container.querySelectorAll(".fhdod-satisfaction-rating__face")).toHaveLength(5);
    await act(async () => button("4").click());
    expect(container.textContent).toContain("Ultima satisfacao");
    expect(container.querySelectorAll(".fhdod-satisfaction-rating__face")).toHaveLength(5);
    expect(container.querySelectorAll('[aria-pressed="true"]')).toHaveLength(0);
  });

  it("restarts after multiple answers, closes the old session and creates a fresh attempt", async () => {
    const form: CachedForm = { form: { sectorId: 2, sectorName: "Pronto Atendimento", formVersionId: 42, questions: [
      { questionId: 10, questionVersionId: 11, text: "Satisfação inicial", questionKind: "standard", isNps: false, position: 1, required: true, options: [1, 2, 3, 4, 5], minScore: 1, maxScore: 5 },
      { questionId: 12, questionVersionId: 13, text: "NPS", questionKind: "standard", isNps: true, position: 2, required: true, options: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10], minScore: 0, maxScore: 10 },
      { questionId: 14, questionVersionId: 15, text: "Satisfação seguinte", questionKind: "sector", isNps: false, position: 3, required: false, options: [1, 2, 3, 4, 5], minScore: 1, maxScore: 5 },
    ] } };
    vi.spyOn(submissionsService, "currentForm").mockResolvedValue(form);
    const start = vi.spyOn(submissionsService, "start").mockResolvedValue(started);
    vi.spyOn(submissionsService, "answer").mockResolvedValue({ ...started.answer, status: "incomplete" });
    let finishClose!: (result: { sessionId: string; status: "closed" }) => void;
    const close = vi.spyOn(submissionsService, "close").mockImplementation(() => new Promise(resolve => { finishClose = resolve; }));
    container = document.createElement("div"); document.body.append(container);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    root = createRoot(container);
    await act(async () => root.render(<QueryClientProvider client={client}><PublicSubmissionPage sectorId={2} /></QueryClientProvider>));
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); });
    expect(container.querySelectorAll('[aria-pressed="true"]')).toHaveLength(0);
    expect(button("Reiniciar formulário").className).toContain("tertiary");
    await act(async () => button("5").click());
    expect(container.textContent).toContain("NPS");
    expect(container.querySelectorAll('[aria-pressed="true"]')).toHaveLength(0);
    await act(async () => button("10").click());
    expect(container.textContent).toContain("Satisfação seguinte");
    expect(container.querySelectorAll('[aria-pressed="true"]')).toHaveLength(0);
    await act(async () => { button("Reiniciar formulário").click(); button("Reiniciar formulário").click(); });
    expect(close).toHaveBeenCalledOnce();
    expect(button("Reiniciar formulário").disabled).toBe(true);
    await act(async () => finishClose({ sessionId: "session-1", status: "closed" }));
    expect(close).toHaveBeenCalledWith("session-1", "token-1");
    expect(container.querySelector("h1")?.textContent).toBe("Satisfação inicial");
    expect(container.querySelectorAll('[aria-pressed="true"]')).toHaveLength(0);
    await act(async () => button("4").click());
    expect(start).toHaveBeenCalledTimes(2);
    expect(start.mock.calls[1][2]).not.toBe(start.mock.calls[0][2]);
    expect(start.mock.calls[1][3]).not.toBe(start.mock.calls[0][3]);
  });
});
