import { useState, type FormEvent } from "react";
import { PencilIcon } from "lucide-react";
import { useUpdateIngredient } from "../use-update-ingredient";
import { UNITS_BY_TYPE, UNIT_LABELS, UNIT_TYPE_OPTIONS } from "../units";
import type { Ingredient, Unit, UpdateIngredientInput } from "../types";
import { ApiError } from "@/lib/api/client";
import type { ApiFieldErrors } from "@/lib/api/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface FormState {
  name: string;
  displayUnit: Unit;
  quantityOnHand: string;
  lowStockThreshold: string;
}

function toFormState(ingredient: Ingredient): FormState {
  return {
    name: ingredient.name,
    displayUnit: ingredient.display_unit,
    quantityOnHand: ingredient.quantity_on_hand_formatted,
    lowStockThreshold: ingredient.low_stock_threshold_formatted,
  };
}

/** Backend field name -> the form field its message belongs under. */
const SERVER_FIELD_MAP: Record<string, keyof FormState> = {
  name: "name",
  display_unit: "displayUnit",
  quantity_on_hand: "quantityOnHand",
  low_stock_threshold: "lowStockThreshold",
};

type FieldErrors = Partial<Record<keyof FormState, string[]>>;

function parseWholeNumber(value: string): number | null {
  return /^\d+$/.test(value.trim()) ? Number(value.trim()) : null;
}

/**
 * Pencil icon for an ingredient row. `unit_type` shows as read-only
 * context (same rule as a product's code) — the field simply isn't sent,
 * matching UpdateIngredientRequest never accepting it server-side.
 * Switching the display unit here re-enters the quantities in the NEW
 * unit rather than converting the typed values, since the person is
 * looking at the ingredient's current numbers when they change it.
 */
export function EditIngredientButton({ ingredient }: { ingredient: Ingredient }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={`Edit ${ingredient.name}`}
        title="Edit"
        className="text-muted-foreground hover:text-foreground"
        onClick={() => setOpen(true)}
      >
        <PencilIcon />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          {open && <EditIngredientForm ingredient={ingredient} onOpenChange={setOpen} />}
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Mounted only while the dialog is open, so the form resets to `ingredient`'s current values every time it's reopened. */
function EditIngredientForm({
  ingredient,
  onOpenChange,
}: {
  ingredient: Ingredient;
  onOpenChange: (open: boolean) => void;
}) {
  const [form, setForm] = useState<FormState>(() => toFormState(ingredient));
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formAlert, setFormAlert] = useState<string | null>(null);

  const unitTypeLabel = UNIT_TYPE_OPTIONS.find((o) => o.value === ingredient.unit_type)?.label
    ?? ingredient.unit_type;

  const mutation = useUpdateIngredient(ingredient.id, {
    onSuccess: () => onOpenChange(false),
  });

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    if (fieldErrors[key]) {
      setFieldErrors((current) => ({ ...current, [key]: undefined }));
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormAlert(null);

    const errors: FieldErrors = {};
    const name = form.name.trim();
    if (!name) errors.name = ["Name is required."];

    const quantityOnHand = parseWholeNumber(form.quantityOnHand);
    const lowStockThreshold = parseWholeNumber(form.lowStockThreshold);
    if (quantityOnHand === null) errors.quantityOnHand = ["Enter a whole number."];
    if (lowStockThreshold === null) errors.lowStockThreshold = ["Enter a whole number."];

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0 || quantityOnHand === null || lowStockThreshold === null) {
      return;
    }

    const input: UpdateIngredientInput = {
      name,
      display_unit: form.displayUnit,
      quantity_on_hand: quantityOnHand,
      low_stock_threshold: lowStockThreshold,
    };

    mutation.mutate(input, {
      onError: (error: unknown) => {
        if (error instanceof ApiError && error.status === 422) {
          setFieldErrors(mapServerErrors(error.errors ?? {}));
          return;
        }
        setFormAlert(
          error instanceof ApiError ? error.message : "Something went wrong. Please try again.",
        );
      },
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <DialogHeader>
        <DialogTitle>Edit ingredient</DialogTitle>
        <DialogDescription>Ingredient ID: {ingredient.code}. Changes apply immediately.</DialogDescription>
      </DialogHeader>

      <FieldGroup className="my-6">
        {formAlert && (
          <Alert variant="destructive">
            <AlertDescription>{formAlert}</AlertDescription>
          </Alert>
        )}

        <Field data-invalid={fieldErrors.name ? true : undefined}>
          <FieldLabel htmlFor="edit-ingredient-name">Name</FieldLabel>
          <Input
            id="edit-ingredient-name"
            autoFocus
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            aria-invalid={fieldErrors.name ? true : undefined}
          />
          <FieldError errors={fieldErrors.name?.map((message) => ({ message }))} />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="edit-ingredient-unit-type">Measured in</FieldLabel>
            <Input id="edit-ingredient-unit-type" value={unitTypeLabel} disabled readOnly />
            <FieldDescription>Fixed at creation — can&apos;t be changed.</FieldDescription>
          </Field>

          <Field data-invalid={fieldErrors.displayUnit ? true : undefined}>
            <FieldLabel htmlFor="edit-ingredient-display-unit">Display unit</FieldLabel>
            <Select value={form.displayUnit} onValueChange={(v) => update("displayUnit", v as Unit)}>
              <SelectTrigger id="edit-ingredient-display-unit" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {UNITS_BY_TYPE[ingredient.unit_type].map((unit) => (
                  <SelectItem key={unit} value={unit}>
                    {UNIT_LABELS[unit]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError errors={fieldErrors.displayUnit?.map((message) => ({ message }))} />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={fieldErrors.quantityOnHand ? true : undefined}>
            <FieldLabel htmlFor="edit-ingredient-quantity">
              Quantity on hand ({UNIT_LABELS[form.displayUnit]})
            </FieldLabel>
            <Input
              id="edit-ingredient-quantity"
              inputMode="numeric"
              value={form.quantityOnHand}
              onChange={(e) => update("quantityOnHand", e.target.value)}
              aria-invalid={fieldErrors.quantityOnHand ? true : undefined}
            />
            <FieldError errors={fieldErrors.quantityOnHand?.map((message) => ({ message }))} />
          </Field>

          <Field data-invalid={fieldErrors.lowStockThreshold ? true : undefined}>
            <FieldLabel htmlFor="edit-ingredient-threshold">
              Low-stock at ({UNIT_LABELS[form.displayUnit]})
            </FieldLabel>
            <Input
              id="edit-ingredient-threshold"
              inputMode="numeric"
              value={form.lowStockThreshold}
              onChange={(e) => update("lowStockThreshold", e.target.value)}
              aria-invalid={fieldErrors.lowStockThreshold ? true : undefined}
            />
            <FieldError errors={fieldErrors.lowStockThreshold?.map((message) => ({ message }))} />
          </Field>
        </div>
      </FieldGroup>

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={() => onOpenChange(false)}
          disabled={mutation.isPending}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Saving…" : "Save changes"}
        </Button>
      </DialogFooter>
    </form>
  );
}

function mapServerErrors(errors: ApiFieldErrors): FieldErrors {
  const mapped: FieldErrors = {};
  for (const [key, messages] of Object.entries(errors)) {
    const field = SERVER_FIELD_MAP[key];
    if (field) mapped[field] = messages;
  }
  return mapped;
}
