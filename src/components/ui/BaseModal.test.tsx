import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BaseModal } from "./BaseModal";

describe("BaseModal", () => {
  afterEach(() => { vi.useRealTimers(); document.body.innerHTML = ""; });

  it("devolve o foco à origem e mantém a saída até o fim da transição", async () => {
    vi.useFakeTimers();
    const opener = document.createElement("button");
    opener.textContent = "Abrir";
    const container = document.createElement("div");
    document.body.append(opener, container);
    opener.focus();
    const root = createRoot(container);

    await act(async () => { root.render(<BaseModal open title="Detalhes" onRequestClose={() => {}}>Conteúdo</BaseModal>); });
    expect(document.activeElement?.getAttribute("aria-label")).toBe("Fechar");

    await act(async () => { root.render(<BaseModal open={false} title="Detalhes" onRequestClose={() => {}}>Conteúdo</BaseModal>); });
    expect(document.activeElement).toBe(opener);
    expect(container.querySelector(".fhdod-modal-backdrop")?.getAttribute("data-state")).toBe("closing");
    expect(container.querySelector("[role=dialog]")?.getAttribute("aria-hidden")).toBe("true");

    await act(async () => { vi.advanceTimersByTime(240); });
    expect(container.querySelector("[role=dialog]")).toBeNull();
    await act(async () => { root.unmount(); });
  });

  it("cancela a saída se reabrir antes da desmontagem", async () => {
    vi.useFakeTimers();
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    await act(async () => { root.render(<BaseModal open title="Detalhes" onRequestClose={() => {}}>Conteúdo</BaseModal>); });
    await act(async () => { root.render(<BaseModal open={false} title="Detalhes" onRequestClose={() => {}}>Conteúdo</BaseModal>); });
    await act(async () => { root.render(<BaseModal open title="Detalhes" onRequestClose={() => {}}>Conteúdo</BaseModal>); });
    await act(async () => { vi.advanceTimersByTime(300); });
    expect(container.querySelector(".fhdod-modal-backdrop")?.getAttribute("data-state")).toBe("open");
    await act(async () => { root.unmount(); });
  });
});
