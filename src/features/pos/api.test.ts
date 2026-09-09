import { beforeEach, describe, expect, it, vi } from "vitest";
import { checkout, fetchMenu } from "./api";
import { api } from "@/lib/api/client";
import { makeCheckoutResponse } from "./test-fixtures";

vi.mock("@/lib/api/client", () => ({
  api: { get: vi.fn(), post: vi.fn() },
}));

describe("fetchMenu", () => {
  beforeEach(() => vi.clearAllMocks());

  it("normalizes a well-formed response", async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: [{ id: 1, name: "Espresso", price_cents: 9000, price_formatted: "₱90.00", currency: "PHP", is_available: true }],
    });

    const result = await fetchMenu();
    expect(result.data).toHaveLength(1);
    expect(result.data[0]).toMatchObject({ id: 1, name: "Espresso", price_cents: 9000, is_available: true });
  });

  it("defaults missing/malformed fields rather than throwing", async () => {
    vi.mocked(api.get).mockResolvedValue({ data: [{}] });

    const result = await fetchMenu();
    expect(result.data[0]).toEqual({
      id: 0,
      name: "",
      price_cents: 0,
      price_formatted: "",
      currency: "PHP",
      is_available: false,
    });
  });

  it("defaults to an empty list when data is missing entirely", async () => {
    vi.mocked(api.get).mockResolvedValue({});
    const result = await fetchMenu();
    expect(result.data).toEqual([]);
  });
});

describe("checkout", () => {
  beforeEach(() => vi.clearAllMocks());

  it("sends the Idempotency-Key header", async () => {
    vi.mocked(api.post).mockResolvedValue(makeCheckoutResponse());

    await checkout({ payment_method: "cash", items: [{ product_id: 1, quantity: 1 }] }, "test-key-123");

    expect(api.post).toHaveBeenCalledWith(
      "/merchant/orders",
      { payment_method: "cash", items: [{ product_id: 1, quantity: 1 }] },
      { headers: { "Idempotency-Key": "test-key-123" } },
    );
  });
});
