import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PublicSubmissionPage } from "./PublicSubmissionPage";
import { submissionsService, type SubmissionStart } from "./submissions";

const start: SubmissionStart = {
  capability: { sessionId: "session-1", token: "token-1" },
  session: { id: "session-1", sectorId: 2, shiftSheetVersionId: null, shiftRangeId: null, expiresAt: "2026-11-24T00:00:00Z" },
  questions: [{ questionId: 1, questionVersionId: 2, text: "Recomendaria este atendimento?", questionKind: "standard", isNps: true, position: 1 }],
};

describe("PublicSubmissionPage", () => {
  afterEach(() => { vi.restoreAllMocks(); document.body.innerHTML = ""; });

  it("exige seleção explícita da nota zero no NPS", async () => {
    vi.spyOn(submissionsService, "start").mockResolvedValue(start);
    const answer = vi.spyOn(submissionsService, "answer").mockResolvedValue({ sessionId: "session-1", status: "complete", answered: true });
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    await act(async () => { root.render(<PublicSubmissionPage sectorId={2} />); });

    const button = (label: string) => [...container.querySelectorAll("button")].find((item) => item.textContent === label)!;
    await act(async () => { button("Confirmar nota").click(); });
    expect(container.textContent).toContain("Informe uma nota entre 0 e 10.");
    expect(answer).not.toHaveBeenCalled();

    await act(async () => { button("0").click(); });
    expect(button("0").getAttribute("aria-pressed")).toBe("true");
    await act(async () => { button("Confirmar nota").click(); });
    expect(answer).toHaveBeenCalledWith("session-1", "token-1", { questionId: 1, questionVersionId: 2, status: "answered", score: 0 });
    await act(async () => { root.unmount(); });
  });
});
