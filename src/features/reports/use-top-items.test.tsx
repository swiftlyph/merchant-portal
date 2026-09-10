import { describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useTopItems } from "./use-top-items";
import * as reportsApi from "./api";
import { makeTopItemsResponse } from "./test-fixtures";

vi.mock("./api", () => ({
  fetchSalesSummary: vi.fn(),
  fetchSalesByDay: vi.fn(),
  fetchTopItems: vi.fn(),
}));

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe("useTopItems", () => {
  it("fetches with the shared range plus its own limit", async () => {
    vi.mocked(reportsApi.fetchTopItems).mockResolvedValue(makeTopItemsResponse());

    const { result } = renderHook(
      () => useTopItems({ from: "2026-09-01", to: "2026-09-03", limit: 25 }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(reportsApi.fetchTopItems).toHaveBeenCalledWith({
      from: "2026-09-01",
      to: "2026-09-03",
      limit: 25,
    });
  });

  it("all three report hooks (summary/by-day/top-items) are called with the SAME range", async () => {
    const { useSalesSummary } = await import("./use-sales-summary");
    const { useSalesByDay } = await import("./use-sales-by-day");
    const { makeSalesSummary, makeSalesByDayResponse } = await import("./test-fixtures");

    vi.mocked(reportsApi.fetchSalesSummary).mockResolvedValue(makeSalesSummary());
    vi.mocked(reportsApi.fetchSalesByDay).mockResolvedValue(makeSalesByDayResponse());
    vi.mocked(reportsApi.fetchTopItems).mockResolvedValue(makeTopItemsResponse());

    const range = { from: "2026-09-05", to: "2026-09-08" };

    function useAllThree() {
      return {
        summary: useSalesSummary(range),
        byDay: useSalesByDay(range),
        topItems: useTopItems({ ...range, limit: 10 }),
      };
    }

    const { result } = renderHook(() => useAllThree(), { wrapper });

    await waitFor(() => {
      expect(result.current.summary.isSuccess).toBe(true);
      expect(result.current.byDay.isSuccess).toBe(true);
      expect(result.current.topItems.isSuccess).toBe(true);
    });

    expect(reportsApi.fetchSalesSummary).toHaveBeenCalledWith(range);
    expect(reportsApi.fetchSalesByDay).toHaveBeenCalledWith(range);
    expect(reportsApi.fetchTopItems).toHaveBeenCalledWith({ ...range, limit: 10 });
  });
});
