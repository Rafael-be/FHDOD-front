import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import { AccountPage } from "./AccountPage";
import { sectorsService } from "./sectors";

vi.mock("./auth/AuthContext", () => ({ useAuth: () => ({ clearSession: vi.fn() }) }));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
afterEach(() => { vi.restoreAllMocks(); document.body.innerHTML = ""; });

it("mostra dados reais do gestor e seus setores autorizados", async () => {
  vi.spyOn(sectorsService, "list").mockResolvedValue([{ id: 4, name: "Internação", code: "INT", deletedAt: null }]);
  const host = document.createElement("div"); document.body.append(host);
  const root = createRoot(host);
  await act(async () => { root.render(<AccountPage user={{ id: 2, name: "Ana Silva", email: "ana@hospital.org.br", role: "sector_manager", mustChangePassword: false }} onCredentialChange={() => undefined} />); });
  expect(host.textContent).toContain("Ana Silva");
  expect(host.textContent).toContain("ana@hospital.org.br");
  expect(host.textContent).toContain("Gestor de setor");
  expect(host.textContent).toContain("Internação");
  expect(host.querySelectorAll(".fhdod-account-layout > .fhdod-profile-card")).toHaveLength(4);
  await act(async () => { root.unmount(); });
});
