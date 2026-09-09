import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LoginPage } from "./login-page";
import { useAuthStore } from "../store";
import { ApiError } from "@/lib/api/client";
import * as authApi from "../api";

vi.mock("../api", () => ({
  login: vi.fn(),
}));

function renderLoginPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/login"]}>
        <LoginPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

async function fillAndSubmit(email: string, password: string) {
  renderLoginPage();
  const user = userEvent.setup();
  if (email) await user.type(screen.getByLabelText("Email"), email);
  if (password) await user.type(screen.getByLabelText("Password"), password);
  await user.click(screen.getByRole("button", { name: /sign in/i }));
}

describe("LoginPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ status: "guest", token: null, user: null, sessionNotice: null });
  });

  it("places a 422 response's messages under their fields", async () => {
    // Client-side checks only catch blank fields, so a format error like this
    // has to come back from the server to be shown at all.
    vi.mocked(authApi.login).mockRejectedValue(
      new ApiError({
        status: 422,
        message: "The given data was invalid.",
        code: "validation_failed",
        errors: { email: ["The email field must be a valid email address."] },
      }),
    );

    await fillAndSubmit("not-an-email", "password");

    expect(
      await screen.findByText("The email field must be a valid email address."),
    ).toBeInTheDocument();
    expect(authApi.login).toHaveBeenCalledTimes(1);
  });

  it("shows a form alert for invalid_credentials without touching field errors", async () => {
    vi.mocked(authApi.login).mockRejectedValue(
      new ApiError({ status: 401, message: "Invalid credentials.", code: "invalid_credentials" }),
    );

    await fillAndSubmit("merchant@gasa.test", "wrong-password");

    expect(await screen.findByText("Email or password is incorrect")).toBeInTheDocument();
  });

  it("shows a portal_forbidden alert", async () => {
    vi.mocked(authApi.login).mockRejectedValue(
      new ApiError({ status: 403, message: "Forbidden.", code: "portal_forbidden" }),
    );

    await fillAndSubmit("company@gasa.test", "password");

    expect(
      await screen.findByText("This account can't access the merchant portal"),
    ).toBeInTheDocument();
  });

  it("disables the submit button for the cooldown window after a 429", async () => {
    vi.mocked(authApi.login).mockRejectedValue(
      new ApiError({ status: 429, message: "Too many attempts.", code: "too_many_attempts" }),
    );

    await fillAndSubmit("merchant@gasa.test", "password");

    expect(
      await screen.findByText("Too many attempts, try again in a minute"),
    ).toBeInTheDocument();
    const button = screen.getByRole("button", { name: /try again in 60s/i });
    expect(button).toBeDisabled();
  });

  it("catches required fields client-side before ever calling the API", async () => {
    await fillAndSubmit("", "");

    expect(await screen.findByText("Email is required.")).toBeInTheDocument();
    expect(screen.getByText("Password is required.")).toBeInTheDocument();
    expect(authApi.login).not.toHaveBeenCalled();
  });
});
