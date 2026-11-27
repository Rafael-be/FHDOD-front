import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FormsPage } from "./FormsPage";
import { sectorsService } from "./sectors";

vi.mock("./SectorQuestionsPage", () => ({ SectorQuestionsPage: ({ sectorId }: { sectorId: number }) => <div data-testid="form-editor">Editor {sectorId}</div> }));

let root: Root;
let host: HTMLDivElement;

describe("FormsPage", () => {
  afterEach(async () => { if (root) await act(async () => root.unmount()); vi.restoreAllMocks(); document.body.innerHTML = ""; });

  it("lista setores autorizados, seleciona automaticamente e troca sem botão Aplicar", async () => {
    vi.spyOn(sectorsService, "list").mockResolvedValue([
      { id: 1, code: "PA", name: "Pronto Atendimento", deletedAt: null },
      { id: 2, code: "UTI", name: "UTI", deletedAt: null },
    ]);
    host = document.createElement("div"); document.body.append(host); root = createRoot(host);
    await act(async () => { root.render(<FormsPage />); });
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
    const select = host.querySelector("select") as HTMLSelectElement;
    expect(select).not.toBeNull();
    expect(select.value).toBe("1");
    expect(host.textContent).toContain("Editor 1");
    expect(host.textContent).not.toContain("Aplicar");
    await act(async () => { select.value = "2"; select.dispatchEvent(new Event("change", { bubbles: true })); });
    expect(host.textContent).toContain("Editor 2");
  });
});
