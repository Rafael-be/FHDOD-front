import { describe, expect, it } from "vitest";
import { readinessFingerprint, type DraftItem } from "./formDraft";

const item = (text: string, isNps = false): DraftItem => ({ questionId: isNps ? 2 : 1, sourceQuestionVersionId: 1, questionKind: "standard", isNps, text, position: 1 });

describe("readinessFingerprint", () => {
  it("permanece igual para o mesmo rascunho e muda quando a composição muda", () => {
    expect(readinessFingerprint(3, [item("Atendimento")])).toBe(readinessFingerprint(3, [item("Atendimento")]));
    expect(readinessFingerprint(3, [item("Atendimento")])).not.toBe(readinessFingerprint(3, [item("Atendimento revisado")]));
    expect(readinessFingerprint(3, [item("Atendimento")])).not.toBe(readinessFingerprint(4, [item("Atendimento")]));
  });
});
