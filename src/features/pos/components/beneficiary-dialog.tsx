import { useEffect, useState } from "react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { CartBeneficiaryType } from "../cart-types";

const TYPE_LABEL: Record<CartBeneficiaryType, string> = {
  senior: "Senior Citizen",
  pwd: "Person with Disability (PWD)",
};

/**
 * F13/P10: "Add senior/PWD discount" — type, name, ID number, matching
 * the backend's own required fields exactly (App\Domains\Orders\Http\
 * Requests\CheckoutRequest: `beneficiaries.*.name`/`id_number` are
 * `required`, never nullable). Client-side validation here only spares a
 * round trip for the obvious case (blank fields); the 422 the server can
 * still return for anything this dialog doesn't catch is handled
 * defensively at checkout time regardless (see checkout-errors.ts).
 *
 * Deliberately just the three fields, no line-assignment UI here — a
 * beneficiary is added first, unassigned, and the cashier then taps
 * individual cart lines to claim them for this person (see
 * CartLineItem's beneficiary toggle). That two-step flow is what lets a
 * SECOND beneficiary on the same order feel natural: add one, assign
 * their lines, add another, assign theirs — never a hardcoded "one
 * discount per order" assumption anywhere in this dialog or the store.
 */
export function BeneficiaryDialog({
  open,
  onOpenChange,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (beneficiary: { type: CartBeneficiaryType; name: string; id_number: string }) => void;
}) {
  const [type, setType] = useState<CartBeneficiaryType>("senior");
  const [name, setName] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (open) {
      setType("senior");
      setName("");
      setIdNumber("");
      setTouched(false);
    }
  }, [open]);

  const nameError = touched && name.trim() === "" ? "Name is required." : undefined;
  const idNumberError = touched && idNumber.trim() === "" ? "ID number is required." : undefined;
  const canAdd = name.trim() !== "" && idNumber.trim() !== "";

  function submit() {
    setTouched(true);
    if (!canAdd) return;
    onAdd({ type, name: name.trim(), id_number: idNumber.trim() });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Add senior/PWD discount</DialogTitle>
          <DialogDescription>
            Enter the details from their ID. You&apos;ll assign which items are theirs next.
          </DialogDescription>
        </DialogHeader>

        <FieldGroup className="gap-4">
          <Field>
            <FieldLabel htmlFor="beneficiary-type">Type</FieldLabel>
            <Select value={type} onValueChange={(v) => setType(v as CartBeneficiaryType)}>
              <SelectTrigger id="beneficiary-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="senior">{TYPE_LABEL.senior}</SelectItem>
                <SelectItem value="pwd">{TYPE_LABEL.pwd}</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <Field data-invalid={nameError ? true : undefined}>
            <FieldLabel htmlFor="beneficiary-name">Name</FieldLabel>
            <Input
              id="beneficiary-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-invalid={nameError ? true : undefined}
              autoFocus
            />
            <FieldError errors={nameError ? [{ message: nameError }] : undefined} />
          </Field>

          <Field data-invalid={idNumberError ? true : undefined}>
            <FieldLabel htmlFor="beneficiary-id-number">ID number</FieldLabel>
            <Input
              id="beneficiary-id-number"
              value={idNumber}
              onChange={(e) => setIdNumber(e.target.value)}
              aria-invalid={idNumberError ? true : undefined}
            />
            <FieldError errors={idNumberError ? [{ message: idNumberError }] : undefined} />
          </Field>
        </FieldGroup>

        <DialogFooter>
          <Button type="button" onClick={submit}>
            Add
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
