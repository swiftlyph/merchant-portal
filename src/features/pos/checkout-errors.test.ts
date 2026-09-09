import { describe, expect, it } from "vitest";
import { describeCheckoutError } from "./checkout-errors";
import { ApiError } from "@/lib/api/client";

describe("describeCheckoutError", () => {
  it("a network failure (status 0) reassures it's safe to retry with the same key", () => {
    const info = describeCheckoutError(new ApiError({ status: 0, message: "network" }));
    expect(info.canRetrySameKey).toBe(true);
    expect(info.requiresNewKey).toBe(false);
    expect(info.message.toLowerCase()).toContain("retry");
  });

  it("product_unavailable surfaces the offending product ids and does not require a new key", () => {
    const info = describeCheckoutError(
      new ApiError({ status: 422, message: "nope", code: "product_unavailable", errors: { product_ids: ["9999"] } }),
    );
    expect(info.unavailableProductIds).toEqual(["9999"]);
    expect(info.requiresNewKey).toBe(false);
  });

  it("split_mismatch tells the cashier to fix the split amounts", () => {
    const info = describeCheckoutError(new ApiError({ status: 422, message: "nope", code: "split_mismatch" }));
    expect(info.message.toLowerCase()).toContain("split");
  });

  it("discount_exceeds_subtotal tells the cashier to lower the discount", () => {
    const info = describeCheckoutError(
      new ApiError({ status: 422, message: "nope", code: "discount_exceeds_subtotal" }),
    );
    expect(info.message.toLowerCase()).toContain("discount");
  });

  it("idempotency_key_reuse (409) requires a new key", () => {
    const info = describeCheckoutError(
      new ApiError({ status: 409, message: "reused", code: "idempotency_key_reuse" }),
    );
    expect(info.requiresNewKey).toBe(true);
  });

  it("falls back to the server's own message for an unrecognized code", () => {
    const info = describeCheckoutError(
      new ApiError({ status: 422, message: "Some specific field error.", code: "something_new" }),
    );
    expect(info.message).toBe("Some specific field error.");
  });

  it("handles a non-ApiError gracefully", () => {
    const info = describeCheckoutError(new Error("boom"));
    expect(info.message).toBe("boom");
    expect(info.requiresNewKey).toBe(false);
  });
});
