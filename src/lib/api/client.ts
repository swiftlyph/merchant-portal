import { ApiError, type ApiErrorShape } from "./types";

const BASE_URL = import.meta.env.VITE_API_URL as string;

type TokenGetter = () => string | null;

/** Pluggable so the auth phase can wire in real token storage without this file changing. */
let getToken: TokenGetter = () => null;

export function registerTokenGetter(getter: TokenGetter): void {
  getToken = getter;
}

type UnauthorizedCallback = () => void;

let onUnauthorized: UnauthorizedCallback | null = null;

/** Auth phase wires this to logout so any 401, anywhere, ends the session. */
export function registerOnUnauthorized(cb: UnauthorizedCallback): void {
  onUnauthorized = cb;
}

export interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
}

const FALLBACK_MESSAGE = "Something went wrong. Please try again.";
const NETWORK_ERROR_MESSAGE =
  "Unable to reach the server. Check your connection and try again.";

async function parseErrorBody(response: Response): Promise<ApiErrorShape> {
  try {
    const data = (await response.json()) as Partial<ApiErrorShape>;
    return {
      message: data.message ?? FALLBACK_MESSAGE,
      code: data.code,
      errors: data.errors,
    };
  } catch {
    return { message: FALLBACK_MESSAGE };
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { body, headers, ...rest } = options;

  const finalHeaders = new Headers(headers);
  finalHeaders.set("Accept", "application/json");
  if (body !== undefined) {
    finalHeaders.set("Content-Type", "application/json");
  }
  const token = getToken();
  if (token) {
    finalHeaders.set("Authorization", `Bearer ${token}`);
  }

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...rest,
      headers: finalHeaders,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError({ status: 0, message: NETWORK_ERROR_MESSAGE });
  }

  if (!response.ok) {
    const { message, code, errors } = await parseErrorBody(response);
    const error = new ApiError({ status: response.status, message, code, errors });
    if (response.status === 401) {
      onUnauthorized?.();
    }
    throw error;
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) =>
    apiRequest<T>(path, { ...options, method: "GET" }),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    apiRequest<T>(path, { ...options, method: "POST", body }),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    apiRequest<T>(path, { ...options, method: "PUT", body }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    apiRequest<T>(path, { ...options, method: "PATCH", body }),
  delete: <T>(path: string, options?: RequestOptions) =>
    apiRequest<T>(path, { ...options, method: "DELETE" }),
};

export { ApiError };
