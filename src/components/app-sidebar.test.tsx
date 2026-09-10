import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppSidebar } from "./app-sidebar";
import { SidebarProvider } from "./ui/sidebar";
import { TooltipProvider } from "./ui/tooltip";
import * as kitchenApi from "@/features/kitchen-queue/api";
import { useAuthStore } from "@/features/auth/store";
import { STAFF_PRESET, OWNER_PRESET } from "@/features/auth/permissions";
import { makeKitchenQueueSummary } from "@/features/kitchen-queue/test-fixtures";

vi.mock("@/features/kitchen-queue/api", () => ({
  fetchKitchenQueueSummary: vi.fn(),
}));

const staffUser = {
  id: 2,
  name: "Staffer",
  email: "staff@gasa.test",
  roles: [] as string[],
  merchant: { id: 1, name: "Merchant One", status: "active" as const },
  permissions: [...STAFF_PRESET],
};

function renderSidebar() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <TooltipProvider>
          <SidebarProvider>
            <AppSidebar />
          </SidebarProvider>
        </TooltipProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("AppSidebar permission-aware nav", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(kitchenApi.fetchKitchenQueueSummary).mockResolvedValue(makeKitchenQueueSummary());
  });

  it("hides Reports and Settings for a staff user (no reports.view, no profile.view/team.view)", async () => {
    useAuthStore.setState({ status: "authed", token: "t", user: staffUser, sessionNotice: null });

    renderSidebar();

    expect(await screen.findByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("POS")).toBeInTheDocument();
    expect(screen.getByText("Queue")).toBeInTheDocument();
    expect(screen.getByText("Orders")).toBeInTheDocument();
    expect(screen.getByText("Cash Drawer")).toBeInTheDocument();
    expect(screen.queryByText("Reports")).not.toBeInTheDocument();
    expect(screen.queryByText("Settings")).not.toBeInTheDocument();
  });

  it("shows every entry for an owner", async () => {
    useAuthStore.setState({
      status: "authed",
      token: "t",
      user: { ...staffUser, permissions: [...OWNER_PRESET] },
      sessionNotice: null,
    });

    renderSidebar();

    expect(await screen.findByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Reports")).toBeInTheDocument();
    expect(screen.getByText("Settings")).toBeInTheDocument();
  });

  it("keeps Settings visible with only profile.view (no team.view) — partial access still shows the entry", async () => {
    useAuthStore.setState({
      status: "authed",
      token: "t",
      user: { ...staffUser, permissions: ["profile.view"] },
      sessionNotice: null,
    });

    renderSidebar();

    expect(await screen.findByText("Settings")).toBeInTheDocument();
  });
});
