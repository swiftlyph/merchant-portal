import { useState } from "react";
import { IconCheck, IconCopy } from "@tabler/icons-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useResetTeamMemberPassword } from "../use-reset-team-member-password";
import { describeResetPasswordError } from "../errors";
import type { ResetTeamMemberPasswordResponse, TeamMember } from "../types";

/**
 * Two-step flow, like InviteMemberDialog: confirm, then (on success) the
 * fresh invite link. `invite` is only present in local/dev — production
 * has no link to show, since email delivery doesn't exist yet either; the
 * dialog still confirms the reset even without one.
 */
export function ResetPasswordDialog({
  open,
  onOpenChange,
  member,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: TeamMember;
}) {
  const { mutateAsync, isPending } = useResetTeamMemberPassword();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<ResetTeamMemberPasswordResponse | null>(null);
  const [copied, setCopied] = useState(false);

  async function confirmReset() {
    setErrorMessage(null);
    try {
      setResult(await mutateAsync(member.id));
    } catch (error) {
      setErrorMessage(describeResetPasswordError(error));
    }
  }

  async function copyLink(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be denied (permissions, insecure context) —
      // the link is still selectable/visible in the input, so this is a
      // soft failure, not something to block on.
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (!isPending ? onOpenChange(next) : undefined)}>
      <DialogContent className="sm:max-w-md">
        {!result ? (
          <>
            <DialogHeader>
              <DialogTitle>Reset password for {member.name}?</DialogTitle>
              <DialogDescription>
                Their current password stops working and they're signed out everywhere. Email isn't
                sent yet — you'll get a link to share with them by hand.
              </DialogDescription>
            </DialogHeader>

            {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}

            <DialogFooter>
              <Button variant="outline" disabled={isPending} onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button variant="destructive" disabled={isPending} onClick={() => void confirmReset()}>
                {isPending ? "Resetting…" : "Reset password"}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{member.name}'s password was reset</DialogTitle>
              <DialogDescription>
                Share this link with them so they can set a new one; it expires and works once.
              </DialogDescription>
            </DialogHeader>

            {result.invite ? (
              <div className="flex gap-2">
                <Input readOnly value={result.invite.url} onFocus={(e) => e.target.select()} />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label="Copy reset link"
                  onClick={() => void copyLink(result.invite!.url)}
                >
                  {copied ? <IconCheck className="text-success" /> : <IconCopy />}
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No reset link is available in this environment — share access with them another way.
              </p>
            )}

            <DialogFooter>
              <Button onClick={() => onOpenChange(false)}>Done</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
