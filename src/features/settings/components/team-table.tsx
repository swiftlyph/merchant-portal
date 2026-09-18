import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuthStore, useCan } from "@/features/auth/store";
import { RoleSelect } from "./role-select";
import { RemoveMemberDialog } from "./remove-member-dialog";
import { ResetPasswordDialog } from "./reset-password-dialog";
import { useUpdateTeamMember } from "../use-update-team-member";
import { describeUpdateMemberError } from "../errors";
import { formatDate, ROLE_LABEL } from "../format";
import type { RoleInMerchant, TeamMember } from "../types";

export function TeamTable({ members }: { members: TeamMember[] }) {
  const currentUserId = useAuthStore((s) => s.user?.id);
  const [removeTarget, setRemoveTarget] = useState<TeamMember | null>(null);
  const [resetTarget, setResetTarget] = useState<TeamMember | null>(null);

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Joined</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map((member) => (
            <TeamRow
              key={member.id}
              member={member}
              isCurrentUser={member.id === currentUserId}
              onRequestRemove={() => setRemoveTarget(member)}
              onRequestReset={() => setResetTarget(member)}
            />
          ))}
        </TableBody>
      </Table>

      {removeTarget && (
        <RemoveMemberDialog
          open
          onOpenChange={(open) => !open && setRemoveTarget(null)}
          member={removeTarget}
        />
      )}

      {resetTarget && (
        <ResetPasswordDialog
          open
          onOpenChange={(open) => !open && setResetTarget(null)}
          member={resetTarget}
        />
      )}
    </>
  );
}

function TeamRow({
  member,
  isCurrentUser,
  onRequestRemove,
  onRequestReset,
}: {
  member: TeamMember;
  isCurrentUser: boolean;
  onRequestRemove: () => void;
  onRequestReset: () => void;
}) {
  const { mutate, isPending } = useUpdateTeamMember();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const canManageTeam = useCan("team.manage");

  function handleRoleChange(role: RoleInMerchant) {
    setErrorMessage(null);
    mutate(
      { userId: member.id, roleInMerchant: role },
      { onError: (error) => setErrorMessage(describeUpdateMemberError(error)) },
    );
  }

  return (
    <TableRow>
      <TableCell>
        <div className="flex flex-col">
          <span className="font-medium">
            {member.name}
            {isCurrentUser && <span className="ml-2 text-xs text-muted-foreground">(you)</span>}
          </span>
          {member.is_owner && <span className="text-xs text-muted-foreground">Owner of this merchant</span>}
        </div>
      </TableCell>
      <TableCell className="text-muted-foreground">{member.email}</TableCell>
      <TableCell>
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            {member.is_owner && <Badge variant="secondary">Owner</Badge>}
            {/* Read-only without team.manage: a plain label, not a disabled
                select — there's no action here to grey out, just a fact to
                show. */}
            {canManageTeam ? (
              <RoleSelect
                value={member.role_in_merchant}
                onValueChange={handleRoleChange}
                disabled={isPending}
                aria-label={`Role for ${member.name}`}
              />
            ) : (
              !member.is_owner && (
                <span className="text-sm text-muted-foreground">
                  {ROLE_LABEL[member.role_in_merchant]}
                </span>
              )
            )}
          </div>
          {errorMessage && <span className="text-xs text-destructive">{errorMessage}</span>}
        </div>
      </TableCell>
      <TableCell className="text-muted-foreground">{formatDate(member.created_at)}</TableCell>
      <TableCell className="text-right">
        {/* No reset/remove action for the owner row (does not apply) or without team.manage — absent, not disabled, either way. */}
        {!member.is_owner && canManageTeam && (
          <>
            <Button variant="ghost" size="sm" onClick={onRequestReset}>
              Reset password
            </Button>
            <Button variant="ghost" size="sm" onClick={onRequestRemove}>
              Remove
            </Button>
          </>
        )}
      </TableCell>
    </TableRow>
  );
}
