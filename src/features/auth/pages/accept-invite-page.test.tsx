import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AcceptInvitePage } from "./accept-invite-page";
import { useAuthStore } from "../store";
import { ApiError } from "@/lib/api/client";
import * as authApi from "../api";

vi.mock("../api", () => ({
  acceptInvite: vi.fn(),
  logout: vi.fn(),
}));

function renderAcceptInvitePage(initialEntry = "/invite/test-token-123") {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/invite/:token" element={<AcceptInvitePage />} />
          <Route path="/accept-invite" element={<AcceptInvitePage />} />
          <Route path="/app" element={<div>App home</div>} />
          <Route path="/login" element={<div>Login page</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

async function fillAndSubmit(password: string, confirmPassword: string) {
  const user = userEvent.setup();
  if (password) await user.type(screen.getByLabelText("Password"), password);
  if (confirmPassword) {
    await user.type(screen.getByLabelText("Confirm password"), confirmPassword);
  }
  await user.click(screen.getByRole("button", { name: /set password/i }));
}

describe("AcceptInvitePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ status: "guest", token: null, user: null, sessionNotice: null });
  });

  it("reads the token from the :token path param", async () => {
    vi.mocked(authApi.acceptInvite).mockResolvedValue({
      token: "session-token",
      user: { id: 1, name: "New Hire", email: "new@merchantone.test", roles: [], merchant: { id: 1, name: "Merchant One", status: "active" }, permissions: [] },
    });

    renderAcceptInvitePage("/invite/test-token-123");
    await fillAndSubmit("longenoughpassword", "longenoughpassword");

    expect(authApi.acceptInvite).toHaveBeenCalledWith(
      { token: "test-token-123", password: "longenoughpassword" },
      expect.anything(),
    );
  });

  it("reads the token from ?token= on /accept-invite", async () => {
    vi.mocked(authApi.acceptInvite).mockResolvedValue({
      token: "session-token",
      user: { id: 1, name: "New Hire", email: "new@merchantone.test", roles: [], merchant: { id: 1, name: "Merchant One", status: "active" }, permissions: [] },
    });

    renderAcceptInvitePage("/accept-invite?token=query-token-456");
    await fillAndSubmit("longenoughpassword", "longenoughpassword");

    expect(authApi.acceptInvite).toHaveBeenCalledWith(
      { token: "query-token-456", password: "longenoughpassword" },
      expect.anything(),
    );
  });

  it("catches a password/confirm mismatch client-side without calling the API", async () => {
    renderAcceptInvitePage();
    await fillAndSubmit("longenoughpassword", "different-password");

    expect(await screen.findByText("Passwords don't match.")).toBeInTheDocument();
    expect(authApi.acceptInvite).not.toHaveBeenCalled();
  });

  it("catches a too-short password client-side without calling the API", async () => {
    renderAcceptInvitePage();
    await fillAndSubmit("short", "short");

    expect(
      await screen.findByText(/at least 8 characters/),
    ).toBeInTheDocument();
    expect(authApi.acceptInvite).not.toHaveBeenCalled();
  });

  it("sets auth state and lands on /app on success", async () => {
    vi.mocked(authApi.acceptInvite).mockResolvedValue({
      token: "session-token",
      user: {
        id: 5,
        name: "New Hire",
        email: "new@merchantone.test",
        roles: [],
        merchant: { id: 1, name: "Merchant One", status: "active" },
        permissions: [],
      },
    });

    renderAcceptInvitePage();
    await fillAndSubmit("longenoughpassword", "longenoughpassword");

    expect(await screen.findByText("App home")).toBeInTheDocument();
    expect(useAuthStore.getState().status).toBe("authed");
    expect(useAuthStore.getState().user?.email).toBe("new@merchantone.test");
  });

  it("renders a calm dead-end on 422 invalid_invite, with no retry loop", async () => {
    vi.mocked(authApi.acceptInvite).mockRejectedValue(
      new ApiError({
        status: 422,
        code: "invalid_invite",
        message: "This invitation is invalid or has expired.",
      }),
    );

    renderAcceptInvitePage();
    await fillAndSubmit("longenoughpassword", "longenoughpassword");

    expect(await screen.findByText(/invalid or has expired/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /set password/i })).not.toBeInTheDocument();
  });

  it("shows a cooldown alert on 429", async () => {
    vi.mocked(authApi.acceptInvite).mockRejectedValue(
      new ApiError({ status: 429, message: "Too many attempts." }),
    );

    renderAcceptInvitePage();
    await fillAndSubmit("longenoughpassword", "longenoughpassword");

    expect(await screen.findByText(/too many attempts/i)).toBeInTheDocument();
  });

  it("asks an already-authed user to sign out instead of showing the form", () => {
    useAuthStore.setState({
      status: "authed",
      token: "existing-token",
      user: { id: 9, name: "Existing User", email: "existing@merchantone.test", roles: [], merchant: { id: 1, name: "Merchant One", status: "active" }, permissions: [] },
      sessionNotice: null,
    });

    renderAcceptInvitePage();

    expect(screen.getByText(/already signed in/i)).toBeInTheDocument();
    expect(screen.queryByLabelText("Password")).not.toBeInTheDocument();
  });
});
