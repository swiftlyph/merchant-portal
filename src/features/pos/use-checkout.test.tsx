import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useCheckout, linesToCheckoutRequest } from "./use-checkout";
import * as posApi from "./api";
import { makeCartBeneficiary, makeCartLine, makeCheckoutResponse } from "./test-fixtures";
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

describe("F13/P10 — linesToCheckoutRequest with beneficiaries", () => {
  it("omits `beneficiaries` and `items[*].beneficiary` entirely for an ordinary checkout", () => {
    const request = linesToCheckoutRequest([makeCartLine()], "cash", 0);
    expect(request.beneficiaries).toBeUndefined();
    expect(request.items[0]!.beneficiary).toBeUndefined();
  });

  it("resolves a line's beneficiaryLocalId to its POSITION in the beneficiaries array", () => {
    const beneficiary = makeCartBeneficiary({ localId: "b1", type: "senior", name: "Lola", id_number: "SC-1" });
    const lines = [makeCartLine({ beneficiaryLocalId: "b1" }), makeCartLine({ localId: "l2", beneficiaryLocalId: null })];

    const request = linesToCheckoutRequest(lines, "cash", 0, undefined, [beneficiary]);

    expect(request.beneficiaries).toEqual([{ type: "senior", name: "Lola", id_number: "SC-1" }]);
    expect(request.items[0]!.beneficiary).toBe(0);
    expect(request.items[1]!.beneficiary).toBeUndefined();
  });

  it("resolves indexes correctly for a SECOND beneficiary, never hardcoding one", () => {
    const senior = makeCartBeneficiary({ localId: "b1", type: "senior" });
    const pwd = makeCartBeneficiary({ localId: "b2", type: "pwd", name: "Juan", id_number: "PWD-1" });
    const lines = [
      makeCartLine({ localId: "l1", beneficiaryLocalId: "b2" }),
      makeCartLine({ localId: "l2", beneficiaryLocalId: "b1" }),
    ];

    const request = linesToCheckoutRequest(lines, "cash", 0, undefined, [senior, pwd]);

    expect(request.items[0]!.beneficiary).toBe(1); // b2 is at index 1
    expect(request.items[1]!.beneficiary).toBe(0); // b1 is at index 0
  });
});

describe("F13/P10 — idempotency key rotation with beneficiaries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("mints a NEW key when a beneficiary is added to an otherwise identical basket", async () => {
    vi.mocked(posApi.checkout)
      .mockRejectedValueOnce(new ApiError({ status: 422, message: "bad", code: "product_unavailable" }))
      .mockResolvedValueOnce(makeCheckoutResponse());

    const { result } = renderHook(() => useCheckout(), { wrapper });
    const before = linesToCheckoutRequest([makeCartLine({ localId: "l1" })], "cash", 0);
    const after = linesToCheckoutRequest(
      [makeCartLine({ localId: "l1", beneficiaryLocalId: "b1" })],
      "cash",
      0,
      undefined,
      [makeCartBeneficiary({ localId: "b1" })],
    );

    await expect(result.current.charge(before)).rejects.toThrow();
    await result.current.charge(after);

    const [, firstKey] = vi.mocked(posApi.checkout).mock.calls[0]!;
    const [, secondKey] = vi.mocked(posApi.checkout).mock.calls[1]!;
    expect(secondKey).not.toBe(firstKey);
  });

  it("mints a NEW key when a beneficiary's own details are edited", async () => {
    vi.mocked(posApi.checkout)
      .mockRejectedValueOnce(new ApiError({ status: 422, message: "bad", code: "validation_failed" }))
      .mockResolvedValueOnce(makeCheckoutResponse());

    const { result } = renderHook(() => useCheckout(), { wrapper });
    const lines = [makeCartLine({ localId: "l1", beneficiaryLocalId: "b1" })];
    const before = linesToCheckoutRequest(lines, "cash", 0, undefined, [
      makeCartBeneficiary({ localId: "b1", name: "Lola" }),
    ]);
    const after = linesToCheckoutRequest(lines, "cash", 0, undefined, [
      makeCartBeneficiary({ localId: "b1", name: "Lola Remedios" }),
    ]);

    await expect(result.current.charge(before)).rejects.toThrow();
    await result.current.charge(after);

    const [, firstKey] = vi.mocked(posApi.checkout).mock.calls[0]!;
    const [, secondKey] = vi.mocked(posApi.checkout).mock.calls[1]!;
    expect(secondKey).not.toBe(firstKey);
  });

  it("mints a NEW key when a beneficiary is removed", async () => {
    vi.mocked(posApi.checkout)
      .mockRejectedValueOnce(new ApiError({ status: 422, message: "bad", code: "product_unavailable" }))
      .mockResolvedValueOnce(makeCheckoutResponse());

    const { result } = renderHook(() => useCheckout(), { wrapper });
    const lines = [makeCartLine({ localId: "l1" })];
    const withBeneficiary = linesToCheckoutRequest(
      [{ ...lines[0]!, beneficiaryLocalId: "b1" }],
      "cash",
      0,
      undefined,
      [makeCartBeneficiary({ localId: "b1" })],
    );
    const without = linesToCheckoutRequest(lines, "cash", 0);

    await expect(result.current.charge(withBeneficiary)).rejects.toThrow();
    await result.current.charge(without);

    const [, firstKey] = vi.mocked(posApi.checkout).mock.calls[0]!;
    const [, secondKey] = vi.mocked(posApi.checkout).mock.calls[1]!;
    expect(secondKey).not.toBe(firstKey);
  });

  it("RESENDS the SAME key across a retry when nothing basket-relevant changed (beneficiaries included)", async () => {
    vi.mocked(posApi.checkout)
      .mockRejectedValueOnce(new ApiError({ status: 0, message: "network down" }))
      .mockResolvedValueOnce(makeCheckoutResponse());

    const { result } = renderHook(() => useCheckout(), { wrapper });
    const request = linesToCheckoutRequest(
      [makeCartLine({ localId: "l1", beneficiaryLocalId: "b1" })],
      "cash",
      0,
      undefined,
      [makeCartBeneficiary({ localId: "b1" })],
    );

    await expect(result.current.charge(request)).rejects.toThrow();
    await result.current.charge(request);

    const [, firstKey] = vi.mocked(posApi.checkout).mock.calls[0]!;
    const [, secondKey] = vi.mocked(posApi.checkout).mock.calls[1]!;
    expect(secondKey).toBe(firstKey);
  });
});
