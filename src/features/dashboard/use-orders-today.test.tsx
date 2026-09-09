import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useOrdersToday } from "./use-orders-today";
import * as ordersApi from "@/features/orders/api";
import { makeOrdersPage } from "@/features/orders/test-fixtures";
import { todayDateParam } from "./today";

vi.mock("@/features/orders/api", () => ({
  fetchOrders: vi.fn(),
}));

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe("useOrdersToday", () => {
  beforeEach(() => vi.clearAllMocks());

  it("filters to today's date and reads meta.total, in a single request", async () => {
    vi.mocked(ordersApi.fetchOrders).mockResolvedValue(
      makeOrdersPage({ data: [], meta: { ...makeOrdersPage().meta, total: 12 } }),
    );

    const { result } = renderHook(() => useOrdersToday(), { wrapper });

    await waitFor(() => expect(result.current.total).toBe(12));

    expect(ordersApi.fetchOrders).toHaveBeenCalledTimes(1);
    expect(ordersApi.fetchOrders).toHaveBeenCalledWith({
      date: todayDateParam(),
      perPage: 1,
      page: 1,
    });
  });

  it("never pages through results to compute the count", async () => {
    vi.mocked(ordersApi.fetchOrders).mockResolvedValue(makeOrdersPage());
    const { result } = renderHook(() => useOrdersToday(), { wrapper });

    await waitFor(() => expect(result.current.isPending).toBe(false));

    expect(ordersApi.fetchOrders).toHaveBeenCalledTimes(1);
    const [filters] = vi.mocked(ordersApi.fetchOrders).mock.calls[0]!;
    expect(filters!.perPage).toBe(1);
  });

  it("surfaces isError/error independently for a per-card error state", async () => {
    vi.mocked(ordersApi.fetchOrders).mockRejectedValue(new Error("nope"));
    const { result } = renderHook(() => useOrdersToday(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.total).toBeUndefined();
  });
});
