import { describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useSalesByDay } from "./use-sales-by-day";
import * as reportsApi from "./api";
import { makeSalesByDayResponse, makeSalesByDayRow } from "./test-fixtures";

vi.mock("./api", () => ({
  fetchSalesSummary: vi.fn(),
  fetchSalesByDay: vi.fn(),
  fetchTopItems: vi.fn(),
}));

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe("useSalesByDay", () => {
  it("fetches with the given range", async () => {
    vi.mocked(reportsApi.fetchSalesByDay).mockResolvedValue(makeSalesByDayResponse());

    const { result } = renderHook(() => useSalesByDay({ from: "2026-09-01", to: "2026-09-03" }), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(reportsApi.fetchSalesByDay).toHaveBeenCalledWith({ from: "2026-09-01", to: "2026-09-03" });
  });

  it("keeps zero-sale days in the returned data — never dropped", async () => {
    vi.mocked(reportsApi.fetchSalesByDay).mockResolvedValue(
      makeSalesByDayResponse({
        data: [
          makeSalesByDayRow({ date: "2026-09-01", orders_count: 1, net_cents: 5000 }),
          makeSalesByDayRow({ date: "2026-09-02", orders_count: 0, net_cents: 0, net_formatted: "₱0.00" }),
          makeSalesByDayRow({ date: "2026-09-03", orders_count: 1, net_cents: 3000 }),
        ],
      }),
    );

    const { result } = renderHook(() => useSalesByDay({ from: "2026-09-01", to: "2026-09-03" }), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.data).toHaveLength(3);
    expect(result.current.data?.data[1]).toMatchObject({ date: "2026-09-02", orders_count: 0, net_cents: 0 });
  });
});
