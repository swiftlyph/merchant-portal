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
