import { api, type RequestOptions } from "@/lib/api/client";
import type { AuthUser } from "@/lib/api/types";

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

/** A wrong password is an expected, in-band 401 — never treated as a session expiring. */
export function login(credentials: LoginCredentials): Promise<LoginResponse> {
  return api.post<LoginResponse>(
    "/auth/login",
    { ...credentials, portal: "merchant" },
    { suppressUnauthorized: true },
  );
}

export function fetchMe(options?: RequestOptions): Promise<AuthUser> {
  return api.get<AuthUser>("/auth/me", options);
}

/** Revokes only the current token. Callers clear local state regardless of the outcome. */
export function logout(): Promise<void> {
  return api.post<void>("/auth/logout", undefined, { suppressUnauthorized: true });
}
