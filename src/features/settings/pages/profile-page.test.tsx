import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ProfilePage } from "./profile-page";
import * as settingsApi from "../api";
import { ApiError } from "@/lib/api/client";
import { makeProfile } from "../test-fixtures";
import { useAuthStore } from "@/features/auth/store";
import { OWNER_PRESET } from "@/features/auth/permissions";

vi.mock("../api", () => ({
  fetchProfile: vi.fn(),
  updateProfile: vi.fn(),
  fetchTeam: vi.fn(),
  addTeamMember: vi.fn(),
  updateTeamMember: vi.fn(),
  removeTeamMember: vi.fn(),
}));

function renderProfilePage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  // useUnsavedChangesGuard's useBlocker only works under a data router
  // (matching the app's real createBrowserRouter) — a plain MemoryRouter
  // throws "useBlocker must be used within a data router".
  const router = createMemoryRouter(
    [
      { path: "/app/settings/profile", element: <ProfilePage /> },
      { path: "/app/dashboard", element: <div>Elsewhere</div> },
    ],
    { initialEntries: ["/app/settings/profile"] },
  );
  const result = render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return { ...result, router };
}

describe("ProfilePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // This file exercises the form itself, not permission gating (see a
    // dedicated permissions test for that) — an owner fixture keeps the
    // form editable, same as before F10.
    useAuthStore.setState({
      status: "authed",
      token: "t",
      user: {
        id: 1,
        name: "Merchant One",
        email: "merchant@gasa.test",
        roles: [],
        merchant: { id: 1, name: "Merchant One", status: "active" },
        permissions: [...OWNER_PRESET],
      },
      sessionNotice: null,
    });
  });

  it("loads and shows existing profile values", async () => {
    vi.mocked(settingsApi.fetchProfile).mockResolvedValue(
      makeProfile({ legal_name: "Merchant One Foods Inc.", city: "Quezon City" }),
    );

    renderProfilePage();

    expect(await screen.findByDisplayValue("Merchant One Foods Inc.")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Quezon City")).toBeInTheDocument();
    // Status is read-only, not an editable control.
    expect(screen.getByDisplayValue("Active")).toBeDisabled();
  });

  it("reflects the receipt header/footer in the live preview as typed", async () => {
    vi.mocked(settingsApi.fetchProfile).mockResolvedValue(
      makeProfile({ receipt_header: "", receipt_footer: "" }),
    );

    renderProfilePage();
    const user = userEvent.setup();
    await screen.findByLabelText("Receipt header");

    await user.type(screen.getByLabelText("Receipt header"), "Merchant One");
    await user.type(screen.getByLabelText("Receipt footer"), "Thanks for visiting!");

    const preview = screen.getByLabelText("Receipt preview");
    expect(preview).toHaveTextContent("Merchant One");
    expect(preview).toHaveTextContent("Thanks for visiting!");
  });

  it("saves changes and disables Save again until something else changes", async () => {
    vi.mocked(settingsApi.fetchProfile).mockResolvedValue(makeProfile({ city: "Quezon City" }));
    vi.mocked(settingsApi.updateProfile).mockResolvedValue(makeProfile({ city: "Makati" }));

    renderProfilePage();
    const user = userEvent.setup();
    await screen.findByDisplayValue("Quezon City");

    const cityInput = screen.getByLabelText("City");
    await user.clear(cityInput);
    await user.type(cityInput, "Makati");

    const saveButton = screen.getByRole("button", { name: /save changes/i });
    expect(saveButton).toBeEnabled();
    await user.click(saveButton);

    await waitFor(() => {
      expect(settingsApi.updateProfile).toHaveBeenCalledWith(
        expect.objectContaining({ city: "Makati" }),
      );
    });
    await waitFor(() => expect(saveButton).toBeDisabled());
  });

  it("places 422 field errors under their fields", async () => {
    vi.mocked(settingsApi.fetchProfile).mockResolvedValue(makeProfile());
    vi.mocked(settingsApi.updateProfile).mockRejectedValue(
      new ApiError({
        status: 422,
        code: "validation_failed",
        message: "The given data was invalid.",
        errors: { receipt_header: ["The receipt header must not be greater than 255 characters."] },
      }),
    );

    renderProfilePage();
    const user = userEvent.setup();
    await screen.findByLabelText("Receipt header");

    await user.type(screen.getByLabelText("Receipt header"), "x");
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    expect(
      await screen.findByText("The receipt header must not be greater than 255 characters."),
    ).toBeInTheDocument();
  });

  it("shows an unsaved-changes indicator once a field is dirty", async () => {
    vi.mocked(settingsApi.fetchProfile).mockResolvedValue(makeProfile({ city: "Quezon City" }));

    renderProfilePage();
    const user = userEvent.setup();
    await screen.findByDisplayValue("Quezon City");

    await user.type(screen.getByLabelText("City"), " Extension");

    expect(screen.getByText("Unsaved changes")).toBeInTheDocument();
  });

  it("blocks in-app navigation while dirty, and Stay cancels the navigation", async () => {
    vi.mocked(settingsApi.fetchProfile).mockResolvedValue(makeProfile({ city: "Quezon City" }));

    const { router } = renderProfilePage();
    const user = userEvent.setup();
    await screen.findByDisplayValue("Quezon City");

    await user.type(screen.getByLabelText("City"), " Extension");
    void router.navigate("/app/dashboard");

    expect(await screen.findByText(/unsaved changes\. leave without saving/i)).toBeInTheDocument();
    expect(screen.queryByText("Elsewhere")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Stay" }));
    expect(screen.queryByText(/unsaved changes\. leave without saving/i)).not.toBeInTheDocument();
    expect(screen.getByDisplayValue("Quezon City Extension")).toBeInTheDocument();
  });
});

describe("ProfilePage permission gating", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("without profile.edit: fields are disabled and there is no Save action", async () => {
    useAuthStore.setState({
      status: "authed",
      token: "t",
      user: {
        id: 2,
        name: "Staffer",
        email: "staff@gasa.test",
        roles: [],
        merchant: { id: 1, name: "Merchant One", status: "active" },
        permissions: ["profile.view"],
      },
      sessionNotice: null,
    });
    vi.mocked(settingsApi.fetchProfile).mockResolvedValue(makeProfile({ city: "Quezon City" }));

    renderProfilePage();

    await screen.findByDisplayValue("Quezon City");
    expect(screen.getByLabelText("Legal name")).toBeDisabled();
    expect(screen.getByLabelText("City")).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Save changes" })).not.toBeInTheDocument();
  });

  it("with profile.edit: fields are editable and Save is available once dirty", async () => {
    useAuthStore.setState({
      status: "authed",
      token: "t",
      user: {
        id: 1,
        name: "Owner",
        email: "merchant@gasa.test",
        roles: [],
        merchant: { id: 1, name: "Merchant One", status: "active" },
        permissions: [...OWNER_PRESET],
      },
      sessionNotice: null,
    });
    vi.mocked(settingsApi.fetchProfile).mockResolvedValue(makeProfile({ city: "Quezon City" }));

    renderProfilePage();
    const user = userEvent.setup();

    await screen.findByDisplayValue("Quezon City");
    expect(screen.getByLabelText("City")).not.toBeDisabled();

    await user.type(screen.getByLabelText("City"), " Extension");
    expect(screen.getByRole("button", { name: "Save changes" })).toBeInTheDocument();
  });
});
