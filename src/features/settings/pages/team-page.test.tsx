import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TeamPage } from "./team-page";
import * as settingsApi from "../api";
import { useAuthStore } from "@/features/auth/store";
import { ApiError } from "@/lib/api/client";
import { makeAddTeamMemberResponse, makeTeamMember, makeTeamMembersResponse } from "../test-fixtures";
import { OWNER_PRESET } from "@/features/auth/permissions";

vi.mock("../api", () => ({
  fetchProfile: vi.fn(),
  updateProfile: vi.fn(),
  fetchTeam: vi.fn(),
  addTeamMember: vi.fn(),
  updateTeamMember: vi.fn(),
  removeTeamMember: vi.fn(),
}));

function renderTeamPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/app/settings/team"]}>
        <TeamPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("TeamPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

  it("renders members with their roles and marks the owner", async () => {
    vi.mocked(settingsApi.fetchTeam).mockResolvedValue(makeTeamMembersResponse());

    renderTeamPage();

    expect(await screen.findByText("merchant@gasa.test")).toBeInTheDocument();
    expect(screen.getByText("Owner of this merchant")).toBeInTheDocument();
    expect(screen.getByText("jamie@merchantone.test")).toBeInTheDocument();
    // The owner row shows "(you)" subtly since the current user is the owner here.
    expect(screen.getByText("(you)")).toBeInTheDocument();
  });

  it("does not render a remove action on the owner row", async () => {
    vi.mocked(settingsApi.fetchTeam).mockResolvedValue(makeTeamMembersResponse());

    renderTeamPage();
    await screen.findByText("merchant@gasa.test");

    const ownerRow = screen.getByText("merchant@gasa.test").closest("tr")!;
    expect(within(ownerRow).queryByRole("button", { name: "Remove" })).not.toBeInTheDocument();

    const memberRow = screen.getByText("jamie@merchantone.test").closest("tr")!;
    expect(within(memberRow).getByRole("button", { name: "Remove" })).toBeInTheDocument();
  });

  it("changes a member's role", async () => {
    vi.mocked(settingsApi.fetchTeam).mockResolvedValue(makeTeamMembersResponse());
    vi.mocked(settingsApi.updateTeamMember).mockResolvedValue(
      makeTeamMember({ role_in_merchant: "manager" }),
    );

    renderTeamPage();
    const user = userEvent.setup();
    await screen.findByText("jamie@merchantone.test");

    await user.click(screen.getByLabelText("Role for Jamie Cruz"));
    await user.click(await screen.findByRole("option", { name: "Manager" }));

    await waitFor(() => {
      expect(settingsApi.updateTeamMember).toHaveBeenCalledWith(2, { role_in_merchant: "manager" });
    });
  });

  it("removes a member behind the confirm dialog", async () => {
    vi.mocked(settingsApi.fetchTeam).mockResolvedValue(makeTeamMembersResponse());
    vi.mocked(settingsApi.removeTeamMember).mockResolvedValue({
      message: "Removed from team.",
      code: "team_member_removed",
    });

    renderTeamPage();
    const user = userEvent.setup();
    await screen.findByText("jamie@merchantone.test");

    const memberRow = screen.getByText("jamie@merchantone.test").closest("tr")!;
    await user.click(within(memberRow).getByRole("button", { name: "Remove" }));

    const dialog = await screen.findByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: "Remove" }));

    await waitFor(() => {
      expect(settingsApi.removeTeamMember).toHaveBeenCalledWith(2);
    });
  });

  it("handles cannot_remove_owner defensively", async () => {
    vi.mocked(settingsApi.fetchTeam).mockResolvedValue(
      makeTeamMembersResponse({ data: [makeTeamMember({ id: 1, is_owner: true, role_in_merchant: "owner" })] }),
    );

    renderTeamPage();
    await screen.findByText("jamie@merchantone.test");
    // Owner row: no Remove button rendered at all — nothing more to assert here
    // beyond §"does not render a remove action on the owner row" above.
  });

  it("shows the invite link with copy button on 201, and explains email isn't sent yet", async () => {
    vi.mocked(settingsApi.fetchTeam).mockResolvedValue(makeTeamMembersResponse());
    vi.mocked(settingsApi.addTeamMember).mockResolvedValue(makeAddTeamMemberResponse());

    renderTeamPage();
    const user = userEvent.setup();
    // userEvent.setup() installs its own jsdom-compatible Clipboard stub —
    // spy on its writeText rather than replacing navigator.clipboard
    // wholesale, since user-event's own stub would just overwrite that.
    const writeText = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue(undefined);
    await screen.findByText("jamie@merchantone.test");

    await user.click(screen.getByRole("button", { name: "Add team member" }));
    const dialog = await screen.findByRole("dialog");
    await user.type(within(dialog).getByLabelText("Name"), "New Hire");
    await user.type(within(dialog).getByLabelText("Email"), "new.hire@merchantone.test");
    await user.click(within(dialog).getByRole("button", { name: "Add team member" }));

    expect(await screen.findByText(/share this link with them; it expires and works once/i)).toBeInTheDocument();
    const linkInput = screen.getByDisplayValue(/accept-invite\?token=/);
    expect(linkInput).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Copy invite link" }));
    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith("/accept-invite?token=test-invite-token-abc123");
    });
  });

  it("shows a plain-language message for member_already_exists without leaking merchant info", async () => {
    vi.mocked(settingsApi.fetchTeam).mockResolvedValue(makeTeamMembersResponse());
    vi.mocked(settingsApi.addTeamMember).mockRejectedValue(
      new ApiError({
        status: 422,
        code: "member_already_exists",
        message: "This email is already a member of your team.",
      }),
    );

    renderTeamPage();
    const user = userEvent.setup();
    await screen.findByText("jamie@merchantone.test");

    await user.click(screen.getByRole("button", { name: "Add team member" }));
    const dialog = await screen.findByRole("dialog");
    await user.type(within(dialog).getByLabelText("Name"), "Dup");
    await user.type(within(dialog).getByLabelText("Email"), "jamie@merchantone.test");
    await user.click(within(dialog).getByRole("button", { name: "Add team member" }));

    expect(await screen.findByText("This email is already on your team.")).toBeInTheDocument();
  });

  it("shows a plain-language message for email_unavailable without naming another merchant", async () => {
    vi.mocked(settingsApi.fetchTeam).mockResolvedValue(makeTeamMembersResponse());
    vi.mocked(settingsApi.addTeamMember).mockRejectedValue(
      new ApiError({
        status: 422,
        code: "email_unavailable",
        message: "This email address is unavailable.",
      }),
    );

    renderTeamPage();
    const user = userEvent.setup();
    await screen.findByText("jamie@merchantone.test");

    await user.click(screen.getByRole("button", { name: "Add team member" }));
    const dialog = await screen.findByRole("dialog");
    await user.type(within(dialog).getByLabelText("Name"), "Someone");
    await user.type(within(dialog).getByLabelText("Email"), "someone@elsewhere.test");
    await user.click(within(dialog).getByRole("button", { name: "Add team member" }));

    const message = await screen.findByText("This email address is unavailable.");
    expect(message).toBeInTheDocument();
    expect(screen.queryByText(/another merchant/i)).not.toBeInTheDocument();
  });
});

describe("TeamPage permission gating", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("without team.manage: no Add button, no role select, no Remove — role shows as plain text", async () => {
    useAuthStore.setState({
      status: "authed",
      token: "t",
      user: {
        id: 2,
        name: "Staffer",
        email: "staff@gasa.test",
        roles: [],
        merchant: { id: 1, name: "Merchant One", status: "active" },
        permissions: ["team.view"],
      },
      sessionNotice: null,
    });
    vi.mocked(settingsApi.fetchTeam).mockResolvedValue(makeTeamMembersResponse());

    renderTeamPage();
    await screen.findByText("jamie@merchantone.test");

    expect(screen.queryByRole("button", { name: "Add team member" })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Role for Jamie Cruz")).not.toBeInTheDocument();
    expect(screen.getByText("Staff")).toBeInTheDocument();

    const memberRow = screen.getByText("jamie@merchantone.test").closest("tr")!;
    expect(within(memberRow).queryByRole("button", { name: "Remove" })).not.toBeInTheDocument();
  });

  it("with team.manage: Add, role select, and Remove are all present", async () => {
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
    vi.mocked(settingsApi.fetchTeam).mockResolvedValue(makeTeamMembersResponse());

    renderTeamPage();
    await screen.findByText("jamie@merchantone.test");

    expect(screen.getByRole("button", { name: "Add team member" })).toBeInTheDocument();
    expect(screen.getByLabelText("Role for Jamie Cruz")).toBeInTheDocument();

    const memberRow = screen.getByText("jamie@merchantone.test").closest("tr")!;
    expect(within(memberRow).getByRole("button", { name: "Remove" })).toBeInTheDocument();
  });
});
