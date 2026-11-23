import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppLayout } from "./AppLayout";

describe("AppLayout", () => {
  afterEach(() => vi.restoreAllMocks());
  it("respeita o bloqueio de navegação do editor", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    const navigate = vi.fn();
    await act(async () => { root.render(<AppLayout currentPath="/" onNavigate={navigate} onLogout={vi.fn()} canManage={false}>Conteúdo</AppLayout>); });
    const blocker = (event: Event) => event.preventDefault();
    window.addEventListener("fhdod:beforeNavigate", blocker);
    try {
      const button = [...container.querySelectorAll("button")].find((item) => item.textContent === "Indicadores");
      expect(button).toBeDefined();
      expect(button?.getAttribute("aria-current")).toBe("page");
      await act(async () => { button!.click(); });
      expect(navigate).not.toHaveBeenCalled();
    } finally {
      window.removeEventListener("fhdod:beforeNavigate", blocker);
      await act(async () => { root.unmount(); });
      container.remove();
    }
  });
});
