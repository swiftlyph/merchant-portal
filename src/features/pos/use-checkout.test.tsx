import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useCheckout, linesToCheckoutRequest } from "./use-checkout";
import * as posApi from "./api";
import { makeCartLine, makeCheckoutResponse } from "./test-fixtures";
import { ApiError } from "@/lib/api/client";

vi.mock("./api", () => ({
  checkout: vi.fn(),
}));

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe("linesToCheckoutRequest", () => {
  it("sends only product_id and quantity — never a price", () => {
    const lines = [makeCartLine({ product_id: 5, quantity: 2, unit_price_cents: 99999 })];
    const request = linesToCheckoutRequest(lines, "cash", 0);
    expect(request.items).toEqual([{ product_id: 5, quantity: 2 }]);
    expect(JSON.stringify(request)).not.toContain("99999");
  });

  it("includes add_ons only when a line has them", () => {
    const withAddOns = [
      makeCartLine({ add_ons: [{ localId: "a", name: "Extra shot", price_cents: 2500 }] }),
    ];
    expect(linesToCheckoutRequest(withAddOns, "cash", 0).items[0]!.add_ons).toEqual([
      { name: "Extra shot", price_cents: 2500 },
    ]);

    const withoutAddOns = [makeCartLine({ add_ons: [] })];
    expect(linesToCheckoutRequest(withoutAddOns, "cash", 0).items[0]!.add_ons).toBeUndefined();
  });

  it("includes cash_cents/gcash_cents only for split", () => {
    const lines = [makeCartLine()];
    const cash = linesToCheckoutRequest(lines, "cash", 0, { cash_cents: 100, gcash_cents: 200 });
    expect(cash.cash_cents).toBeUndefined();
    expect(cash.gcash_cents).toBeUndefined();

    const split = linesToCheckoutRequest(lines, "split", 0, { cash_cents: 4500, gcash_cents: 4500 });
    expect(split.cash_cents).toBe(4500);
    expect(split.gcash_cents).toBe(4500);
  });
});

describe("useCheckout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("mints a fresh idempotency key on the first charge of a basket", async () => {
    vi.mocked(posApi.checkout).mockResolvedValue(makeCheckoutResponse());
    const { result } = renderHook(() => useCheckout(), { wrapper });

    const request = linesToCheckoutRequest([makeCartLine()], "cash", 0);
    await result.current.charge(request);

    expect(posApi.checkout).toHaveBeenCalledTimes(1);
    const [, key] = vi.mocked(posApi.checkout).mock.calls[0]!;
    expect(key).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("resends the SAME key on a retry of an unchanged basket after a failure", async () => {
    vi.mocked(posApi.checkout)
      .mockRejectedValueOnce(new ApiError({ status: 0, message: "network down" }))
      .mockResolvedValueOnce(makeCheckoutResponse());

    const { result } = renderHook(() => useCheckout(), { wrapper });
    const request = linesToCheckoutRequest([makeCartLine()], "cash", 0);

    await expect(result.current.charge(request)).rejects.toThrow();
    await result.current.charge(request);

    expect(posApi.checkout).toHaveBeenCalledTimes(2);
    const [, firstKey] = vi.mocked(posApi.checkout).mock.calls[0]!;
    const [, secondKey] = vi.mocked(posApi.checkout).mock.calls[1]!;
    expect(secondKey).toBe(firstKey);
  });

  it("mints a NEW key when the basket changes after a failure", async () => {
    vi.mocked(posApi.checkout)
      .mockRejectedValueOnce(new ApiError({ status: 422, message: "bad", code: "product_unavailable" }))
      .mockResolvedValueOnce(makeCheckoutResponse());

    const { result } = renderHook(() => useCheckout(), { wrapper });
    const first = linesToCheckoutRequest([makeCartLine({ product_id: 1 })], "cash", 0);
    const changed = linesToCheckoutRequest([makeCartLine({ product_id: 2 })], "cash", 0);

    await expect(result.current.charge(first)).rejects.toThrow();
    await result.current.charge(changed);

    const [, firstKey] = vi.mocked(posApi.checkout).mock.calls[0]!;
    const [, secondKey] = vi.mocked(posApi.checkout).mock.calls[1]!;
    expect(secondKey).not.toBe(firstKey);
  });

  it("mints a fresh key for the NEXT order after a success", async () => {
    vi.mocked(posApi.checkout).mockResolvedValue(makeCheckoutResponse());
    const { result } = renderHook(() => useCheckout(), { wrapper });
    const request = linesToCheckoutRequest([makeCartLine()], "cash", 0);

    await result.current.charge(request);
    await result.current.charge(request); // same basket shape, but a NEW order (after a successful prior charge)

    const [, firstKey] = vi.mocked(posApi.checkout).mock.calls[0]!;
    const [, secondKey] = vi.mocked(posApi.checkout).mock.calls[1]!;
    expect(secondKey).not.toBe(firstKey);
  });

  it("invalidates orders and kitchen-queue queries on success", async () => {
    vi.mocked(posApi.checkout).mockResolvedValue(makeCheckoutResponse());
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useCheckout(), {
      wrapper: ({ children }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>,
    });

    await result.current.charge(linesToCheckoutRequest([makeCartLine()], "cash", 0));

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["orders"] });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["kitchen-queue"] });
    });
  });

  it("reset() forces a fresh key on the next charge, even for the same basket", async () => {
    vi.mocked(posApi.checkout).mockResolvedValue(makeCheckoutResponse());
    const { result } = renderHook(() => useCheckout(), { wrapper });
    const request = linesToCheckoutRequest([makeCartLine()], "cash", 0);

    await result.current.charge(request);
    const [, firstKey] = vi.mocked(posApi.checkout).mock.calls[0]!;

    result.current.reset();
    await result.current.charge(request);
    const [, secondKey] = vi.mocked(posApi.checkout).mock.calls[1]!;

    expect(secondKey).not.toBe(firstKey);
  });
});
