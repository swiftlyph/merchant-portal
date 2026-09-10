import { useRef, useState } from "react";
import { IconAlertTriangle, IconCheck, IconCopy } from "@tabler/icons-react";
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
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { RoleSelect } from "./role-select";
import { useAddTeamMember } from "../use-add-team-member";
import { describeAddMemberError } from "../errors";
import { ApiError } from "@/lib/api/client";
import type { ApiFieldErrors } from "@/lib/api/types";
import type { AddTeamMemberResponse, RoleInMerchant } from "../types";

/**
 * Add-member dialog with a two-step flow: the form, then (on success) the
 * invite link. `invite` is only present in local/dev — production has no
 * link to show, since email delivery doesn't exist yet either; the dialog
 * still confirms the member was added even without one.
 */
export function InviteMemberDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { mutateAsync, isPending, reset } = useAddTeamMember();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<RoleInMerchant>("staff");
  const [fieldErrors, setFieldErrors] = useState<ApiFieldErrors>({});
  const [formAlert, setFormAlert] = useState<string | null>(null);
  const [created, setCreated] = useState<AddTeamMemberResponse | null>(null);
  const [copied, setCopied] = useState(false);
  const inFlightRef = useRef(false);

  const canSubmit = name.trim().length > 0 && email.trim().length > 0;

  function resetForm() {
    setName("");
    setEmail("");
    setRole("staff");
    setFieldErrors({});
    setFormAlert(null);
    setCreated(null);
    setCopied(false);
    reset();
  }

  function close() {
    onOpenChange(false);
    resetForm();
  }

  async function submit() {
    if (inFlightRef.current || !canSubmit) return;
    inFlightRef.current = true;
    setFormAlert(null);
    setFieldErrors({});
    try {
      const response = await mutateAsync({ name: name.trim(), email: email.trim(), role_in_merchant: role });
      setCreated(response);
    } catch (error) {
      if (error instanceof ApiError && error.status === 422 && error.errors) {
        setFieldErrors(error.errors);
      } else {
        setFormAlert(describeAddMemberError(error));
      }
    } finally {
      inFlightRef.current = false;
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
    <Dialog open={open} onOpenChange={(next) => (!isPending ? (next ? onOpenChange(true) : close()) : undefined)}>
      <DialogContent className="sm:max-w-md">
        {!created ? (
          <>
            <DialogHeader>
              <DialogTitle>Add team member</DialogTitle>
              <DialogDescription>
                Email isn't sent yet — you'll get a link to share with them by hand.
              </DialogDescription>
            </DialogHeader>

            <FieldGroup>
              {formAlert && (
                <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                  <IconAlertTriangle className="mt-0.5 size-4 shrink-0" />
                  {formAlert}
                </div>
              )}

              <Field data-invalid={fieldErrors.name ? true : undefined}>
                <FieldLabel htmlFor="member-name">Name</FieldLabel>
                <Input
                  id="member-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  aria-invalid={fieldErrors.name ? true : undefined}
                />
                <FieldError errors={fieldErrors.name?.map((message) => ({ message }))} />
              </Field>

              <Field data-invalid={fieldErrors.email ? true : undefined}>
                <FieldLabel htmlFor="member-email">Email</FieldLabel>
                <Input
                  id="member-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  aria-invalid={fieldErrors.email ? true : undefined}
                />
                <FieldError errors={fieldErrors.email?.map((message) => ({ message }))} />
              </Field>

              <Field>
                <FieldLabel htmlFor="member-role">Role</FieldLabel>
                <RoleSelect value={role} onValueChange={setRole} aria-label="Role" />
              </Field>
            </FieldGroup>

            <DialogFooter>
              <Button disabled={isPending || !canSubmit} onClick={() => void submit()}>
                {isPending ? "Adding…" : "Add team member"}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{created.name} was added</DialogTitle>
              <DialogDescription>
                Share this link with them; it expires and works once.
              </DialogDescription>
            </DialogHeader>

            {created.invite ? (
              <div className="flex gap-2">
                <Input readOnly value={created.invite.url} onFocus={(e) => e.target.select()} />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label="Copy invite link"
                  onClick={() => void copyLink(created.invite!.url)}
                >
                  {copied ? <IconCheck className="text-success" /> : <IconCopy />}
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No invite link is available in this environment — share access with them another way.
              </p>
            )}

            <DialogFooter>
              <Button onClick={close}>Done</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
