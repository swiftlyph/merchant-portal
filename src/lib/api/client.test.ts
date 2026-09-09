import { beforeEach, describe, expect, it, vi } from "vitest";
import { api, registerOnUnauthorized, registerTokenGetter, ApiError } from "./client";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("api client", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    registerTokenGetter(() => null);
    registerOnUnauthorized(() => {});
  });

  it("returns parsed JSON on a 2xx response", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(
      jsonResponse(200, { id: 1, name: "Acme" }),
    );

    const result = await api.get<{ id: number; name: string }>("/merchants/1");

    expect(result).toEqual({ id: 1, name: "Acme" });
  });

  it("injects the bearer token from the registered getter", async () => {
    registerTokenGetter(() => "abc123");
    const fetchSpy = vi
      .spyOn(global, "fetch")
      .mockResolvedValue(jsonResponse(200, {}));

    await api.get("/merchants/1");

    const [, init] = fetchSpy.mock.calls[0]!;
    const headers = new Headers(init?.headers);
    expect(headers.get("Authorization")).toBe("Bearer abc123");
  });

  it("normalizes a 422 into an ApiError exposing the field errors map", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(
      jsonResponse(422, {
        message: "The given data was invalid.",
        code: "validation_failed",
        errors: { email: ["The email field is required."] },
      }),
    );

    await expect(api.post("/auth/login", {})).rejects.toMatchObject({
      status: 422,
      message: "The given data was invalid.",
      code: "validation_failed",
      errors: { email: ["The email field is required."] },
    });
  });

  it("triggers the registered onUnauthorized callback on a 401", async () => {
    const onUnauthorized = vi.fn();
    registerOnUnauthorized(onUnauthorized);
    vi.spyOn(global, "fetch").mockResolvedValue(
      jsonResponse(401, { message: "Unauthenticated." }),
    );

    await expect(api.get("/merchants/1")).rejects.toBeInstanceOf(ApiError);
    expect(onUnauthorized).toHaveBeenCalledOnce();
  });

  it("normalizes a 429 with the too_many_attempts code", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(
      jsonResponse(429, {
        message: "Too many login attempts.",
        code: "too_many_attempts",
      }),
    );

    await expect(api.post("/auth/login", {})).rejects.toMatchObject({
      status: 429,
      code: "too_many_attempts",
    });
  });

  it("normalizes a network failure into an ApiError", async () => {
    vi.spyOn(global, "fetch").mockRejectedValue(new TypeError("Failed to fetch"));

    const error = await api.get("/merchants/1").catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(0);
  });
});
