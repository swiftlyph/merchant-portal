import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { RequireActiveMerchant } from "./require-active-merchant";
import { useAuthStore } from "./store";

function renderGuardedApp() {
  return render(
    <MemoryRouter initialEntries={["/app"]}>
      <Routes>
        <Route path="/login" element={<div>Login page</div>} />
        <Route path="/suspended" element={<div>Suspended page</div>} />
        <Route
          path="/app"
          element={
            <RequireActiveMerchant>
              <div>Dashboard</div>
            </RequireActiveMerchant>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

const activeUser = {
  id: 1,
  name: "A",
  email: "a@a.com",
  roles: ["merchant"],
  merchant: { id: 1, name: "A's Shop", status: "active" as const },
  permissions: [],
};

describe("RequireActiveMerchant", () => {
  beforeEach(() => {
    useAuthStore.setState({ status: "guest", token: null, user: null, sessionNotice: null });
  });

  it("redirects guests to /login", () => {
    renderGuardedApp();

    expect(screen.getByText("Login page")).toBeInTheDocument();
    expect(screen.queryByText("Dashboard")).not.toBeInTheDocument();
  });

  it("redirects an authed user with no merchant to /suspended", () => {
    useAuthStore.setState({ status: "authed", token: "tok", user: { ...activeUser, merchant: null } });

    renderGuardedApp();

    expect(screen.getByText("Suspended page")).toBeInTheDocument();
    expect(screen.queryByText("Dashboard")).not.toBeInTheDocument();
  });

  it("redirects an authed user with a suspended merchant to /suspended", () => {
    useAuthStore.setState({
      status: "authed",
      token: "tok",
      user: { ...activeUser, merchant: { ...activeUser.merchant, status: "suspended" } },
    });

    renderGuardedApp();

    expect(screen.getByText("Suspended page")).toBeInTheDocument();
    expect(screen.queryByText("Dashboard")).not.toBeInTheDocument();
  });

  it("renders the protected content for an authed user with an active merchant", () => {
    useAuthStore.setState({ status: "authed", token: "tok", user: activeUser });

    renderGuardedApp();

    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.queryByText("Suspended page")).not.toBeInTheDocument();
    expect(screen.queryByText("Login page")).not.toBeInTheDocument();
  });
});
