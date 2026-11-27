import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SectorsPage } from "./SectorsPage";
import { sectorsService } from "./sectors";

describe("SectorsPage", () => {
  afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); document.body.innerHTML = ""; });

  it("mantém o modal montado durante a saída e devolve o foco ao botão acionador", async () => {
    vi.spyOn(sectorsService, "list").mockResolvedValue([]);
    const container = document.createElement("div"); document.body.append(container);
    const root = createRoot(container);
    await act(async () => { root.render(<SectorsPage canManage onQuestions={() => {}} />); });
    const opener = [...container.querySelectorAll("button")].find((button) => button.textContent === "Cadastrar setor")!;
    opener.focus(); await act(async () => { opener.click(); });
    expect(container.querySelector("[role=dialog]")?.getAttribute("aria-hidden")).toBeNull();
    vi.useFakeTimers();
    const close = container.querySelector<HTMLButtonElement>('button[aria-label="Fechar"]')!;
    await act(async () => { close.click(); });
    expect(container.querySelector(".fhdod-modal-backdrop")?.getAttribute("data-state")).toBe("closing");
    expect(document.activeElement).toBe(opener);
    await act(async () => { vi.advanceTimersByTime(240); });
    expect(container.querySelector("[role=dialog]")).toBeNull();
    await act(async () => { root.unmount(); });
  });

  it("distingue carregamento de setor pendente", async () => {
    let resolveStatus: (value: { sectorId: number; status: "active"; missingRequirements: string[] }) => void = () => undefined;
    const status = new Promise<{ sectorId: number; status: "active"; missingRequirements: string[] }>((resolve) => { resolveStatus = resolve; });
    vi.spyOn(sectorsService, "list").mockResolvedValue([{ id: 1, code: "A", name: "Ambulatório", deletedAt: null }]);
    vi.spyOn(sectorsService, "status").mockReturnValue(status);
    const container = document.createElement("div"); document.body.append(container);
    const root = createRoot(container);
    await act(async () => { root.render(<SectorsPage canManage={false} onQuestions={() => {}} />); });
    expect(container.textContent).toContain("Carregando...");
    expect(container.textContent).not.toContain("Pendente");
    await act(async () => { resolveStatus({ sectorId: 1, status: "active", missingRequirements: [] }); await status; });
    expect(container.textContent).toContain("Ativo");
    await act(async () => { root.unmount(); });
  });

  it("abre e copia o endereço público configurado do setor", async () => {
    vi.stubEnv("VITE_PUBLIC_APP_URL", "https://hospital.org.br");
    vi.spyOn(sectorsService, "list").mockResolvedValue([{ id: 7, code: "PA", name: "Pronto Atendimento", deletedAt: null }]);
    vi.spyOn(sectorsService, "status").mockResolvedValue({ sectorId: 7, status: "active", missingRequirements: [] });
    const open = vi.spyOn(window, "open").mockImplementation(() => null);
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    const container = document.createElement("div"); document.body.append(container);
    const root = createRoot(container);
    await act(async () => { root.render(<SectorsPage canManage={false} onQuestions={() => undefined} />); });
    const button = (label: string) => [...container.querySelectorAll("button")].find((item) => item.textContent?.includes(label))!;
    await act(async () => { button("Abrir link").click(); });
    expect(open).toHaveBeenCalledWith("https://hospital.org.br/avaliacao/7", "_blank", "noopener,noreferrer");
    await act(async () => { button("Copiar link").click(); });
    expect(writeText).toHaveBeenCalledWith("https://hospital.org.br/avaliacao/7");
    expect(container.textContent).toContain("Link copiado.");
    await act(async () => { root.unmount(); });
    vi.unstubAllEnvs();
  });
});
