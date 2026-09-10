import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { RequirePermission } from "./require-permission";
import { useAuthStore } from "./store";
import { STAFF_PRESET, OWNER_PRESET } from "./permissions";

const staffUser = {
  id: 2,
  name: "Staffer",
  email: "staff@gasa.test",
  roles: [] as string[],
  merchant: { id: 1, name: "Merchant One", status: "active" as const },
  permissions: [...STAFF_PRESET],
};

function renderGuarded() {
  return render(
    <MemoryRouter>
      <RequirePermission permission="reports.view">
        <div>Protected reports content</div>
      </RequirePermission>
    </MemoryRouter>,
  );
}

describe("RequirePermission", () => {
  it("renders the page when the user holds the permission", () => {
    useAuthStore.setState({
      status: "authed",
      token: "t",
      user: { ...staffUser, permissions: [...OWNER_PRESET] },
      sessionNotice: null,
    });

    renderGuarded();

    expect(screen.getByText("Protected reports content")).toBeInTheDocument();
  });

  it("renders a calm no-access page in place, not a redirect, when the permission is missing", () => {
    useAuthStore.setState({ status: "authed", token: "t", user: staffUser, sessionNotice: null });

    renderGuarded();

    expect(screen.queryByText("Protected reports content")).not.toBeInTheDocument();
    expect(screen.getByText("You don't have access to this page")).toBeInTheDocument();
    expect(screen.getByText(/viewing reports/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to dashboard" })).toHaveAttribute(
      "href",
      "/app/dashboard",
    );
  });
});
