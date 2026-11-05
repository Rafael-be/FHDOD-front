export type UserRole = "superuser" | "sector_manager";

export interface AuthenticatedUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  mustChangePassword: boolean;
}

export interface AuthUserResponse { user: AuthenticatedUser }

export function isAuthenticatedUser(value: unknown): value is AuthenticatedUser {
  if (!value || typeof value !== "object") return false;
  const user = value as Record<string, unknown>;
  return typeof user.id === "number" && Number.isSafeInteger(user.id) && typeof user.name === "string" && typeof user.email === "string" && (user.role === "superuser" || user.role === "sector_manager") && typeof user.mustChangePassword === "boolean";
}
