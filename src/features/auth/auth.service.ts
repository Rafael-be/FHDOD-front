import { ApiError, api } from "../../services/http";
import { isAuthenticatedUser, type AuthUserResponse } from "./auth.types";

export interface PasswordChangeInput { currentPassword: string; newPassword: string }

function userResponse(response: AuthUserResponse): AuthUserResponse {
  if (!isAuthenticatedUser(response?.user)) throw new ApiError("Resposta de autenticação inválida.", 502, "INVALID_AUTH_RESPONSE");
  return response;
}

export const authService = {
  async login(email: string, password: string) { return userResponse(await api.request<AuthUserResponse>("/api/auth/login", { method: "POST", body: { email, password }, csrf: false, refreshOnUnauthorized: false, dedupeKey: "auth:login" })); },
  async resume() { return userResponse(await api.request<AuthUserResponse>("/api/auth/refresh", { method: "POST", csrf: false, refreshOnUnauthorized: false, dedupeKey: "auth:refresh" })); },
  async me() { return userResponse(await api.request<AuthUserResponse>("/api/auth/me", { method: "GET" })); },
  async logout() { await api.request<void>("/api/auth/logout", { method: "POST" }); api.clearSessionState(); },
  async changeTemporaryPassword(input: PasswordChangeInput) { await api.request<void>("/api/auth/change-temporary-password", { method: "POST", body: input }); api.clearSessionState(); },
  async changePassword(input: PasswordChangeInput) { await api.request<void>("/api/auth/change-password", { method: "POST", body: input }); api.clearSessionState(); },
  async changeEmail(currentPassword: string, email: string) { await api.request<void>("/api/auth/change-email", { method: "POST", body: { currentPassword, email } }); api.clearSessionState(); },
};
