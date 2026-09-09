import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DashboardPage } from "./DashboardPage";
import { useAuthStore } from "@/features/auth/store";
import {
  setQueryClientClear,
  setSessionNavigator,
  SESSION_EXPIRED_MESSAGE,
} from "@/features/auth/session";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const user = { id: 1, name: "Merchant One", email: "merchant@gasa.test", roles: ["merchant"] };

function renderDashboard() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("DashboardPage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    useAuthStore.setState({ status: "authed", token: "tok", user, sessionNotice: null });
  });

  it("renders the signed-in user's name from the live /auth/me query", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(jsonResponse(200, user));

    renderDashboard();

    expect(await screen.findByText("Signed in as Merchant One.")).toBeInTheDocument();
  });

  it("a revoked token's 401 on this query triggers session expiry, not a silent failure", async () => {
    const navigate = vi.fn();
    const clearCache = vi.fn();
    setSessionNavigator(navigate);
    setQueryClientClear(clearCache);
    vi.spyOn(global, "fetch").mockResolvedValue(
      jsonResponse(401, { message: "Unauthenticated." }),
    );

    renderDashboard();

    await waitFor(() => expect(useAuthStore.getState().status).toBe("guest"));
    expect(useAuthStore.getState().sessionNotice).toBe(SESSION_EXPIRED_MESSAGE);
    expect(navigate).toHaveBeenCalledWith("/login");
    expect(clearCache).toHaveBeenCalledTimes(1);
  });
});
