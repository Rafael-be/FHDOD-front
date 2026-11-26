import {act} from "react";
import {createRoot} from "react-dom/client";
import {expect, it, vi} from "vitest";
import {authService} from "../features/auth/auth.service";
import {api} from "../services/http";

Object.assign(globalThis, {IS_REACT_ACT_ENVIRONMENT: true});
it("bloqueia rotas administrativas do gestor antes de montar páginas ou buscar dados", async () => {
  window.history.replaceState({}, "", "/ouvidoria");
  vi.spyOn(authService,"resume").mockResolvedValue({user:{id:2, name:"Gestor", email:"gestor@test.invalid",role:"sector_manager",mustChangePassword:false}});
  const request = vi.spyOn(api,"request");
  const {App} = await import("./App");
  const host = document.createElement("div"), root = createRoot(host);
  try {
    await act(async () => root.render(<App/>));
    for (const path of ["/ouvidoria", "/tv-wall/config"]) {
      await act(async () => {
        window.history.pushState({}, "", path);
        window.dispatchEvent(new PopStateEvent("popstate"));
      });
      expect(host.textContent).toContain("Acesso restrito");
      expect(host.querySelector('nav a[href="/ouvidoria"]')).toBeNull();
      expect(host.querySelector('nav a[href="/tv-wall/config"]')).toBeNull();
    }
    expect(request).not.toHaveBeenCalled();
  } finally {
    await act(async () => root.unmount());
    window.history.replaceState({}, "", "/");
    vi.restoreAllMocks();
  }
});
