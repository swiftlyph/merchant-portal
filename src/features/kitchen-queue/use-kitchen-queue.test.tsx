import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useKitchenQueue } from "./use-kitchen-queue";
import * as kitchenApi from "./api";
import { makeKitchenOrder, makeKitchenQueueResponse } from "./test-fixtures";

vi.mock("./api", () => ({
  fetchKitchenQueue: vi.fn(),
}));

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe("useKitchenQueue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("keeps the previous data visible while a refetch is in flight, never blanking to undefined", async () => {
    let resolveSecondFetch!: (value: ReturnType<typeof makeKitchenQueueResponse>) => void;
    vi.mocked(kitchenApi.fetchKitchenQueue)
      .mockResolvedValueOnce(
        makeKitchenQueueResponse({ data: [makeKitchenOrder({ id: 1, order_number: "ORD-000001" })] }),
      )
      .mockImplementationOnce(
        () => new Promise((resolve) => { resolveSecondFetch = resolve; }),
      );

    const { result } = renderHook(() => useKitchenQueue({ all: false }), { wrapper });

    await waitFor(() => expect(result.current.data?.data[0]?.order_number).toBe("ORD-000001"));

    // Trigger a second fetch (simulating a poll) — deliberately not awaited,
    // since the mock's promise won't resolve until we call
    // resolveSecondFetch below; awaiting it here would deadlock the test.
    const refetchPromise = result.current.refetch();

    // The second fetch is now in flight but not yet resolved. The
    // previously-fetched data must still be present in the SAME render
    // pass that started the fetch — this is what placeholderData:
    // previousData guarantees, and it's what stops a poll from blanking
    // the screen.
    expect(result.current.data?.data[0]?.order_number).toBe("ORD-000001");

    resolveSecondFetch(
      makeKitchenQueueResponse({ data: [makeKitchenOrder({ id: 2, order_number: "ORD-000002" })] }),
    );
    await refetchPromise;
    await waitFor(() => expect(result.current.data?.data[0]?.order_number).toBe("ORD-000002"));
  });
});
