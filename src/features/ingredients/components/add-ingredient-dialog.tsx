import { useState, type FormEvent } from "react";
import { PlusIcon } from "lucide-react";
import { useCreateIngredient } from "../use-create-ingredient";
import { UNITS_BY_TYPE, UNIT_LABELS, UNIT_TYPE_OPTIONS } from "../units";
import type { CreateIngredientInput, Unit, UnitType } from "../types";
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
  DialogTrigger,
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
  unitType: UnitType;
  displayUnit: Unit;
  quantityOnHand: string;
  lowStockThreshold: string;
}

const EMPTY_FORM: FormState = {
  name: "",
  unitType: "mass",
  displayUnit: "kg",
  quantityOnHand: "0",
  lowStockThreshold: "0",
};

/** Backend field name -> the form field its message belongs under. */
const SERVER_FIELD_MAP: Record<string, keyof FormState> = {
  name: "name",
  unit_type: "unitType",
  display_unit: "displayUnit",
  quantity_on_hand: "quantityOnHand",
  low_stock_threshold: "lowStockThreshold",
};

type FieldErrors = Partial<Record<keyof FormState, string[]>>;

/** Whole numbers only — quantities are stored as an integer count of the smallest unit server-side, so "1.5" here would be silently truncated. */
function parseWholeNumber(value: string): number | null {
  return /^\d+$/.test(value.trim()) ? Number(value.trim()) : null;
}

/**
 * "Add ingredient" button plus the modal form it opens. Choosing a unit
 * type narrows the display-unit dropdown to that family (mass/volume/
 * count never mix — see the Unit type's docblock) and resets it to that
 * family's first unit, so the two fields can never end up mismatched.
 *
 * Quantities are typed in the chosen display unit; the server converts to
 * base units on save (CreateIngredientAction) — the client never does that
 * math itself, same reason prices are always sent as integer cents.
 */
export function AddIngredientDialog() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formAlert, setFormAlert] = useState<string | null>(null);

  const mutation = useCreateIngredient({
    onSuccess: () => handleOpenChange(false),
  });

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setForm(EMPTY_FORM);
      setFieldErrors({});
      setFormAlert(null);
      mutation.reset();
    }
  }

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    if (fieldErrors[key]) {
      setFieldErrors((current) => ({ ...current, [key]: undefined }));
    }
  }

  function handleUnitTypeChange(unitType: UnitType) {
    // Non-null: every UnitType maps to a non-empty unit list.
    setForm((current) => ({ ...current, unitType, displayUnit: UNITS_BY_TYPE[unitType][0]! }));
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

    const input: CreateIngredientInput = {
      name,
      unit_type: form.unitType,
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
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <PlusIcon />
          Add Ingredient
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit} noValidate>
          <DialogHeader>
            <DialogTitle>Add ingredient</DialogTitle>
            <DialogDescription>
              This is where stock actually lives — attach it to a product&apos;s recipe from the
              Products page to have sales deduct it automatically.
            </DialogDescription>
          </DialogHeader>

          <FieldGroup className="my-6">
            {formAlert && (
              <Alert variant="destructive">
                <AlertDescription>{formAlert}</AlertDescription>
              </Alert>
            )}

            <Field data-invalid={fieldErrors.name ? true : undefined}>
              <FieldLabel htmlFor="ingredient-name">Name</FieldLabel>
              <Input
                id="ingredient-name"
                autoFocus
                placeholder="Matcha Powder"
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                aria-invalid={fieldErrors.name ? true : undefined}
              />
              <FieldError errors={fieldErrors.name?.map((message) => ({ message }))} />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="ingredient-unit-type">Measured in</FieldLabel>
                <Select value={form.unitType} onValueChange={(v) => handleUnitTypeChange(v as UnitType)}>
                  <SelectTrigger id="ingredient-unit-type" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {UNIT_TYPE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldDescription>Fixed once created — can&apos;t be changed later.</FieldDescription>
              </Field>

              <Field data-invalid={fieldErrors.displayUnit ? true : undefined}>
                <FieldLabel htmlFor="ingredient-display-unit">Display unit</FieldLabel>
                <Select value={form.displayUnit} onValueChange={(v) => update("displayUnit", v as Unit)}>
                  <SelectTrigger id="ingredient-display-unit" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {UNITS_BY_TYPE[form.unitType].map((unit) => (
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
                <FieldLabel htmlFor="ingredient-quantity">
                  Quantity on hand ({UNIT_LABELS[form.displayUnit]})
                </FieldLabel>
                <Input
                  id="ingredient-quantity"
                  inputMode="numeric"
                  value={form.quantityOnHand}
                  onChange={(e) => update("quantityOnHand", e.target.value)}
                  aria-invalid={fieldErrors.quantityOnHand ? true : undefined}
                />
                <FieldError errors={fieldErrors.quantityOnHand?.map((message) => ({ message }))} />
              </Field>

              <Field data-invalid={fieldErrors.lowStockThreshold ? true : undefined}>
                <FieldLabel htmlFor="ingredient-threshold">
                  Low-stock at ({UNIT_LABELS[form.displayUnit]})
                </FieldLabel>
                <Input
                  id="ingredient-threshold"
                  inputMode="numeric"
                  value={form.lowStockThreshold}
                  onChange={(e) => update("lowStockThreshold", e.target.value)}
                  aria-invalid={fieldErrors.lowStockThreshold ? true : undefined}
                />
                <FieldError
                  errors={fieldErrors.lowStockThreshold?.map((message) => ({ message }))}
                />
              </Field>
            </div>
          </FieldGroup>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={mutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Adding…" : "Add ingredient"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
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
