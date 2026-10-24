import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "../../services/http";
import { authService } from "./auth.service";

describe("authService", () => {
  afterEach(() => vi.restoreAllMocks());
  const user = { id: 1, name: "Administrador", email: "admin@hospital.test", role: "superuser" as const, mustChangePassword: false };

  it("envia login sem CSRF e não tenta refresh para credenciais inválidas", async () => {
    const request = vi.spyOn(api, "request").mockResolvedValue({ user });
    await expect(authService.login("admin@hospital.test", "senha-segura")).resolves.toEqual({ user });
    expect(request).toHaveBeenCalledWith("/api/auth/login", expect.objectContaining({ method: "POST", body: { email: "admin@hospital.test", password: "senha-segura" }, csrf: false, refreshOnUnauthorized: false }));
  });

  it("recupera sessão somente pelo endpoint de refresh disponível", async () => {
    const request = vi.spyOn(api, "request").mockResolvedValue({ user });
    await expect(authService.resume()).resolves.toEqual({ user });
    expect(request).toHaveBeenCalledWith("/api/auth/refresh", expect.objectContaining({ method: "POST", csrf: false, refreshOnUnauthorized: false }));
  });

  it("consulta /me apenas quando a atualização explícita é solicitada", async () => {
    const request = vi.spyOn(api, "request").mockResolvedValue({ user: { ...user, email: "novo@hospital.test", role: "sector_manager" } });
    await expect(authService.me()).resolves.toMatchObject({ user: { id: 1, role: "sector_manager" } });
    expect(request).toHaveBeenCalledWith("/api/auth/me", { method: "GET" });
  });

  it("rejeita uma resposta sem mustChangePassword", async () => {
    vi.spyOn(api, "request").mockResolvedValue({ user: { id: 1, name: "Administrador", email: "admin@hospital.test", role: "superuser" } });
    await expect(authService.login("admin@hospital.test", "senha-segura")).rejects.toMatchObject({ code: "INVALID_AUTH_RESPONSE" });
  });

  it("limpa o estado do cliente após trocar credenciais", async () => {
    const request = vi.spyOn(api, "request").mockResolvedValue(undefined);
    const clear = vi.spyOn(api, "clearSessionState");
    await authService.changeEmail("senha-atual", "novo@hospital.test");
    expect(request).toHaveBeenCalledWith("/api/auth/change-email", expect.objectContaining({ method: "POST", body: { currentPassword: "senha-atual", email: "novo@hospital.test" } }));
    expect(clear).toHaveBeenCalledOnce();
  });
});
