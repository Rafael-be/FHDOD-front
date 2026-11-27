import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import { QuestionCreationPage } from "./QuestionCreationPage";
import { sectorsService } from "./sectors";
import { questionsService } from "./questions";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
afterEach(() => { vi.restoreAllMocks(); document.body.innerHTML = ""; });

it("preserva a validação de setores e o cadastro de pergunta padrão", async () => {
  vi.spyOn(sectorsService, "list").mockResolvedValue([{ id: 3, name: "Internação", code: "INT", deletedAt: null }]);
  const create = vi.spyOn(questionsService, "createStandard").mockResolvedValue({} as never);
  const done = vi.fn();
  const host = document.createElement("div"); document.body.append(host);
  const root = createRoot(host);
  await act(async () => { root.render(<QuestionCreationPage type="standard" onDone={done} />); });
  const radios = host.querySelectorAll<HTMLInputElement>('input[type="radio"]');
  await act(async () => { radios[1].click(); });
  const textarea = host.querySelector<HTMLTextAreaElement>("textarea")!;
  await act(async () => { Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!.set!.call(textarea, "Como foi seu atendimento?"); textarea.dispatchEvent(new Event("input", { bubbles: true })); });
  const submit = host.querySelector<HTMLButtonElement>('button[type="submit"]')!;
  await act(async () => { submit.click(); });
  expect(create).not.toHaveBeenCalled();
  expect(host.textContent).toContain("Selecione ao menos um setor");
  await act(async () => { host.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click(); });
  await act(async () => { submit.click(); });
  expect(create).toHaveBeenCalledWith({ text: "Como foi seu atendimento?", scope: "selected_sectors", sectorIds: [3] });
  expect(done).toHaveBeenCalledOnce();
  await act(async () => { root.unmount(); });
});
