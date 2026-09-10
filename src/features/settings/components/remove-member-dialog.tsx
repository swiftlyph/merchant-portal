import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useRemoveTeamMember } from "../use-remove-team-member";
import { describeRemoveMemberError } from "../errors";
import type { TeamMember } from "../types";

/**
 * The owner row never renders this dialog's trigger at all (see
 * TeamTable) — cannot_remove_owner is still handled here defensively in
 * case that ever changes or the backend disagrees.
 */
export function RemoveMemberDialog({
  open,
  onOpenChange,
  member,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: TeamMember;
}) {
  const { mutateAsync, isPending } = useRemoveTeamMember();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function confirmRemove() {
    setErrorMessage(null);
    try {
      await mutateAsync(member.id);
      onOpenChange(false);
    } catch (error) {
      setErrorMessage(describeRemoveMemberError(error));
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={(next) => (!isPending ? onOpenChange(next) : undefined)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove {member.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            They'll lose access to this merchant's portal immediately. This can't be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={isPending}
            onClick={(e) => {
              e.preventDefault();
              void confirmRemove();
            }}
          >
            {isPending ? "Removing…" : "Remove"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
