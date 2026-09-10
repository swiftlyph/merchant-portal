export type MerchantStatus = "pending" | "active" | "suspended";

/** The merchant a user owns, or null if they don't own one yet. */
export interface Merchant {
  id: number;
  name: string;
  status: MerchantStatus;
}

/** The flat user object returned by /auth/login and /auth/me. */
export interface AuthUser {
  id: number;
  name: string;
  email: string;
  roles: string[];
  merchant: Merchant | null;
  /**
   * The resolved catalog permissions for the user's ACTIVE merchant (see
   * features/auth/permissions.ts for the catalog and the useCan hook this
   * feeds). Additive on the wire — always present, [] when merchant is
   * null — so an old cached value here is just "no permissions", never a
   * crash.
   */
  permissions: string[];
}

/** Field name -> list of validation messages, as returned on 422 responses. */
export type ApiFieldErrors = Record<string, string[]>;

/** Shape of every error response from the backend: { message, code, errors? }. */
export interface ApiErrorShape {
  message: string;
  code?: string;
  errors?: ApiFieldErrors;
}

/** Thrown by the api client for any non-2xx response, and for network failures. */
export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly errors?: ApiFieldErrors;

  constructor({
    status,
    message,
    code,
    errors,
  }: {
    status: number;
    message: string;
    code?: string;
    errors?: ApiFieldErrors;
  }) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.errors = errors;
  }
}
