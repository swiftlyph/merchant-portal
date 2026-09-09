import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { RequireAuth } from "./RequireAuth";
import { useAuthStore } from "./store";

function LoginProbe() {
  const location = useLocation();
  const state = location.state as { from?: { pathname: string } } | null;
  return <div>Login page{state?.from ? ` (from ${state.from.pathname})` : ""}</div>;
}

function renderGuardedApp() {
  return render(
    <MemoryRouter initialEntries={["/app"]}>
      <Routes>
        <Route path="/login" element={<LoginProbe />} />
        <Route
          path="/app"
          element={
            <RequireAuth>
              <div>Dashboard</div>
            </RequireAuth>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe("RequireAuth", () => {
  beforeEach(() => {
    useAuthStore.setState({ status: "guest", token: null, user: null, sessionNotice: null });
  });

  it("redirects guests to /login, preserving the attempted location", () => {
    renderGuardedApp();

    expect(screen.getByText("Login page (from /app)")).toBeInTheDocument();
    expect(screen.queryByText("Dashboard")).not.toBeInTheDocument();
  });

  it("renders the protected content when authed", () => {
    useAuthStore.setState({
      status: "authed",
      token: "tok",
      user: {
        id: 1,
        name: "A",
        email: "a@a.com",
        roles: ["merchant"],
        merchant: { id: 1, name: "A's Shop", status: "active" },
      },
    });

    renderGuardedApp();

    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.queryByText(/Login page/)).not.toBeInTheDocument();
  });
});
