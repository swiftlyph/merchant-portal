import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SuspendedPage } from "./SuspendedPage";
import { useAuthStore } from "../store";

const suspendedUser = {
  id: 1,
  name: "Suspended Owner",
  email: "suspended@gasa.test",
  roles: ["merchant"],
  merchant: { id: 2, name: "Suspended Merchant", status: "suspended" as const },
};

function renderSuspendedRoute() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/suspended"]}>
        <Routes>
          <Route path="/login" element={<div>Login page</div>} />
          <Route path="/app" element={<div>Dashboard</div>} />
          <Route path="/suspended" element={<SuspendedPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("SuspendedPage", () => {
  beforeEach(() => {
    useAuthStore.setState({ status: "guest", token: null, user: null, sessionNotice: null });
  });

  it("redirects guests to /login", () => {
    renderSuspendedRoute();

    expect(screen.getByText("Login page")).toBeInTheDocument();
  });

  it("redirects an active merchant to /app instead of showing a stale suspended state", () => {
    useAuthStore.setState({
      status: "authed",
      token: "tok",
      user: { ...suspendedUser, merchant: { ...suspendedUser.merchant, status: "active" } },
    });

    renderSuspendedRoute();

    expect(screen.getByText("Dashboard")).toBeInTheDocument();
  });

  it("shows the merchant name, the inactive message, and a logout button", () => {
    useAuthStore.setState({ status: "authed", token: "tok", user: suspendedUser });

    renderSuspendedRoute();

    expect(screen.getByText("Suspended Merchant")).toBeInTheDocument();
    expect(screen.getByText("Your account is currently inactive.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Log out" })).toBeInTheDocument();
  });

  it("falls back to a generic label when the merchant is missing", () => {
    useAuthStore.setState({ status: "authed", token: "tok", user: { ...suspendedUser, merchant: null } });

    renderSuspendedRoute();

    expect(screen.getByText("Your merchant")).toBeInTheDocument();
  });
});
