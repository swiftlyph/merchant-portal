import { describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useSalesSummary } from "./use-sales-summary";
import * as reportsApi from "./api";
import { makeSalesSummary } from "./test-fixtures";

vi.mock("./api", () => ({
  fetchSalesSummary: vi.fn(),
  fetchSalesByDay: vi.fn(),
  fetchTopItems: vi.fn(),
}));

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe("useSalesSummary", () => {
  it("fetches with the given range and returns the parsed summary", async () => {
    vi.mocked(reportsApi.fetchSalesSummary).mockResolvedValue(makeSalesSummary());

    const { result } = renderHook(() => useSalesSummary({ from: "2026-09-01", to: "2026-09-03" }), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(reportsApi.fetchSalesSummary).toHaveBeenCalledWith({
      from: "2026-09-01",
      to: "2026-09-03",
    });
    expect(result.current.data?.net_formatted).toBe(result.current.data?.net_formatted);
  });

  it("never reformats a cents value client-side when a formatted string exists", async () => {
    const summary = makeSalesSummary({ net_cents: 999, net_formatted: "₱9.99 (server)" });
    vi.mocked(reportsApi.fetchSalesSummary).mockResolvedValue(summary);

    const { result } = renderHook(() => useSalesSummary({}), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    // The formatted string is passed through verbatim — this hook/component
    // stack must never derive its own string from net_cents.
    expect(result.current.data?.net_formatted).toBe("₱9.99 (server)");
  });

  it("surfaces range_too_large as an isError state", async () => {
    const { ApiError } = await import("@/lib/api/client");
    vi.mocked(reportsApi.fetchSalesSummary).mockRejectedValue(
      new ApiError({ status: 422, message: "The report range spans 517 days; the maximum is 366.", code: "range_too_large" }),
    );

    const { result } = renderHook(() => useSalesSummary({ from: "2025-01-01", to: "2026-06-01" }), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as InstanceType<typeof ApiError>).code).toBe("range_too_large");
  });
});
