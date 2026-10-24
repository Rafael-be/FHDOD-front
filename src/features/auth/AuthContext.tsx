import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ApiError, api } from "../../services/http";
import { authService } from "./auth.service";
import type { AuthenticatedUser } from "./auth.types";

type AuthStatus = "checking" | "anonymous" | "authenticated" | "unavailable";
interface AuthContextValue { status: AuthStatus; user: AuthenticatedUser | null; login(email: string, password: string): Promise<void>; logout(): Promise<void>; restore(): Promise<void>; refreshUser(): Promise<void>; clearSession(): void; }
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("checking"); const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const generation = useRef(0); const restoreRequest = useRef<Promise<void> | null>(null);
  const clearSession = useCallback(() => { generation.current += 1; setUser(null); setStatus("anonymous"); }, []);
  useEffect(() => { api.setSessionExpiredHandler(clearSession); return () => api.setSessionExpiredHandler(null); }, [clearSession]);
  const restore = useCallback(async () => {
    if (restoreRequest.current) return restoreRequest.current;
    const operationGeneration = generation.current;
    const operation = authService.resume().then(({ user: nextUser }) => { if (generation.current === operationGeneration) { setUser(nextUser); setStatus("authenticated"); } }).catch((error: unknown) => {
      if (generation.current !== operationGeneration) return;
      setUser(null);
      setStatus(error instanceof ApiError && [401, 403].includes(error.status) ? "anonymous" : "unavailable");
    }).finally(() => { restoreRequest.current = null; });
    restoreRequest.current = operation;
    return operation;
  }, []);
  useEffect(() => { void restore(); }, [restore]);
  const login = useCallback(async (email: string, password: string) => { const operationGeneration = ++generation.current; const { user: nextUser } = await authService.login(email, password); if (generation.current === operationGeneration) { setUser(nextUser); setStatus("authenticated"); } }, []);
  const refreshUser = useCallback(async () => { const operationGeneration = generation.current; const { user: nextUser } = await authService.me(); if (generation.current === operationGeneration) { setUser(nextUser); setStatus("authenticated"); } }, []);
  const logout = useCallback(async () => { const logoutGeneration = ++generation.current; setUser(null); setStatus("anonymous"); try { await authService.logout(); } finally { if (generation.current === logoutGeneration) clearSession(); } }, [clearSession]);
  const value = useMemo(() => ({ status, user, login, logout, restore, refreshUser, clearSession }), [status, user, login, logout, restore, refreshUser, clearSession]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue { const value = useContext(AuthContext); if (!value) throw new Error("useAuth deve ser usado dentro de AuthProvider."); return value; }
