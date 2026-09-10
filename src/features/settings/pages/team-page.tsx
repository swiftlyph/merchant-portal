import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TeamTable } from "../components/team-table";
import { InviteMemberDialog } from "../components/invite-member-dialog";
import { useTeam } from "../use-team";

/** `/app/settings/team`. */
export function TeamPage() {
  const { data, isPending, isError, error, refetch } = useTeam();
  const [inviteOpen, setInviteOpen] = useState(false);

  const members = data?.data ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Everyone with access to this merchant's portal.
        </p>
        <Button onClick={() => setInviteOpen(true)}>Add team member</Button>
      </div>

      {isPending && (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      )}

      {isError && !data && (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border p-10 text-center">
          <p className="text-sm text-muted-foreground">
            {error instanceof Error ? error.message : "Couldn't load the team."}
          </p>
          <Button variant="outline" size="sm" onClick={() => void refetch()}>
            Retry
          </Button>
        </div>
      )}

      {!isPending && data && members.length === 0 && (
        <div className="flex flex-col items-center gap-1 rounded-lg border border-dashed border-border p-10 text-center">
          <p className="text-sm font-medium">No team members yet</p>
        </div>
      )}

      {!isPending && members.length > 0 && <TeamTable members={members} />}

      <InviteMemberDialog open={inviteOpen} onOpenChange={setInviteOpen} />
    </div>
  );
}
