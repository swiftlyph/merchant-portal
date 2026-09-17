import { useMemo, useState, type FormEvent } from "react";
import { ChefHatIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { useIngredients } from "@/features/ingredients/use-ingredients";
import { StockStatusBadge } from "@/features/ingredients/components/stock-status-badge";
import { UNIT_LABELS } from "@/features/ingredients/units";
import type { Unit } from "@/features/ingredients/types";
import { useUpdateRecipe } from "../use-update-recipe";
import type { Product, RecipeItem, RecipeLineInput } from "../types";
import { ApiError } from "@/lib/api/client";
import type { ApiFieldErrors } from "@/lib/api/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FieldError } from "@/components/ui/field";
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

interface LineState {
  /** Stable React key AND how server field errors ("ingredients.2.unit") are mapped back to a row after blank rows are dropped on submit — see handleSubmit. */
  key: string;
  ingredientId: string;
  quantity: string;
  unit: Unit | "";
}

let keyCounter = 0;
function nextKey(): string {
  keyCounter += 1;
  return `line-${keyCounter}`;
}

function toLineState(item: RecipeItem): LineState {
  return { key: nextKey(), ingredientId: String(item.ingredient_id), quantity: String(item.quantity), unit: item.unit };
}

function parsePositiveWholeNumber(value: string): number | null {
  return /^\d+$/.test(value.trim()) && Number(value.trim()) >= 1 ? Number(value.trim()) : null;
}

const LINE_FIELD_PATTERN = /^ingredients\.(\d+)\.(ingredient_id|quantity|unit)$/;

/**
 * Maps `ingredients.{index}.{field}` errors (index into the PAYLOAD, which
 * dropped any never-filled-in blank rows) back onto the row key each
 * payload entry actually came from, so the message lands under the right
 * row even though the arrays no longer line up 1:1.
 */
function mapServerErrors(errors: ApiFieldErrors, submittedKeys: string[]): Record<string, string[]> {
  const mapped: Record<string, string[]> = {};
  for (const [field, messages] of Object.entries(errors)) {
    const match = LINE_FIELD_PATTERN.exec(field);
    if (!match) continue;
    const key = submittedKeys[Number(match[1])];
    if (!key) continue;
    mapped[`${key}.${match[2]}`] = messages;
  }
  return mapped;
}

/**
 * Chef-hat icon for a product row: opens the recipe editor directly,
 * rather than nesting it under Edit — a merchant reaches for this far
 * more often than the rest of a product's fields once the catalog is set
 * up, so it gets its own entry point (also reachable from inside
 * ViewProductDetails, same pattern as EditProductDialog).
 */
export function EditRecipeButton({ product }: { product: Product }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={`Edit recipe for ${product.name}`}
        title="Edit recipe"
        className="text-muted-foreground hover:text-foreground"
        onClick={() => setOpen(true)}
      >
        <ChefHatIcon />
      </Button>
      <EditRecipeDialog product={product} open={open} onOpenChange={setOpen} />
    </>
  );
}

export function EditRecipeDialog({
  product,
  open,
  onOpenChange,
}: {
  product: Product;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        {open && <EditRecipeForm product={product} onOpenChange={onOpenChange} />}
      </DialogContent>
    </Dialog>
  );
}

/** Mounted only while the dialog is open, so the form and its ingredient list reload fresh every time it's reopened. */
function EditRecipeForm({
  product,
  onOpenChange,
}: {
  product: Product;
  onOpenChange: (open: boolean) => void;
}) {
  const [lines, setLines] = useState<LineState[]>(() => product.recipe.map(toLineState));
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [formAlert, setFormAlert] = useState<string | null>(null);

  // The full ingredient list, one page: a recipe picker needs everything
  // to choose from, not a paginated slice — same tradeoff AddProductDialog
  // makes fetching the whole (small, fixed) category list at once.
  const ingredients = useIngredients({ perPage: 100 });
  const allIngredients = useMemo(() => ingredients.data?.data ?? [], [ingredients.data]);
  const ingredientsById = useMemo(
    () => new Map(allIngredients.map((ingredient) => [String(ingredient.id), ingredient])),
    [allIngredients],
  );

  const mutation = useUpdateRecipe(product.id, { onSuccess: () => onOpenChange(false) });

  function updateLine(key: string, patch: Partial<LineState>) {
    setLines((current) => current.map((line) => (line.key === key ? { ...line, ...patch } : line)));
    setFieldErrors((current) => {
      if (!current[`${key}.ingredient_id`] && !current[`${key}.quantity`] && !current[`${key}.unit`]) {
        return current;
      }
      const next = { ...current };
      delete next[`${key}.ingredient_id`];
      delete next[`${key}.quantity`];
      delete next[`${key}.unit`];
      return next;
    });
  }

  function handleIngredientChange(key: string, ingredientId: string) {
    const ingredient = ingredientsById.get(ingredientId);
    updateLine(key, { ingredientId, unit: ingredient?.display_unit ?? "" });
  }

  function addLine() {
    setLines((current) => [...current, { key: nextKey(), ingredientId: "", quantity: "1", unit: "" }]);
  }

  function removeLine(key: string) {
    setLines((current) => current.filter((line) => line.key !== key));
  }

  function optionsFor(line: LineState) {
    const usedElsewhere = new Set(
      lines.filter((l) => l.key !== line.key && l.ingredientId).map((l) => l.ingredientId),
    );
    return allIngredients.filter((ingredient) => !usedElsewhere.has(String(ingredient.id)));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormAlert(null);

    const errors: Record<string, string[]> = {};
    const submittedKeys: string[] = [];
    const payloadLines: RecipeLineInput[] = [];

    for (const line of lines) {
      // A row added but never given an ingredient is a blank filler, not
      // an error — dropped silently, same as the backend clearing a
      // recipe on an empty `ingredients` array.
      if (!line.ingredientId) continue;

      const quantity = parsePositiveWholeNumber(line.quantity);
      if (quantity === null) errors[`${line.key}.quantity`] = ["Enter a whole number greater than 0."];
      if (!line.unit) errors[`${line.key}.unit`] = ["Choose a unit."];

      if (quantity !== null && line.unit) {
        submittedKeys.push(line.key);
        payloadLines.push({ ingredient_id: Number(line.ingredientId), quantity, unit: line.unit });
      }
    }

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    mutation.mutate(
      { ingredients: payloadLines },
      {
        onError: (error: unknown) => {
          if (error instanceof ApiError && error.status === 422) {
            setFieldErrors(mapServerErrors(error.errors ?? {}, submittedKeys));
            return;
          }
          setFormAlert(
            error instanceof ApiError ? error.message : "Something went wrong. Please try again.",
          );
        },
      },
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <DialogHeader>
        <DialogTitle>Edit recipe — {product.name}</DialogTitle>
        <DialogDescription>
          What one sale of this product consumes from inventory. Untracked items — ice, hot
          water — don&apos;t need a line here.
        </DialogDescription>
      </DialogHeader>

      <div className="my-6 flex flex-col gap-3">
        {formAlert && (
          <Alert variant="destructive">
            <AlertDescription>{formAlert}</AlertDescription>
          </Alert>
        )}

        {ingredients.isError && (
          <Alert variant="destructive">
            <AlertDescription className="flex items-center justify-between gap-2">
              Couldn&apos;t load ingredients.
              <Button type="button" variant="link" size="xs" onClick={() => void ingredients.refetch()}>
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {lines.length === 0 && (
          <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No ingredients yet — this product is always available. Add one below to start
            deducting stock on each sale.
          </p>
        )}

        {lines.map((line) => {
          const ingredient = ingredientsById.get(line.ingredientId);
          return (
            <div key={line.key} className="flex flex-col gap-1 rounded-lg border border-border p-3">
              <div className="flex flex-wrap items-start gap-2">
                <div className="flex min-w-40 flex-1 flex-col gap-1">
                  <Select
                    value={line.ingredientId}
                    onValueChange={(value) => handleIngredientChange(line.key, value)}
                    disabled={ingredients.isPending}
                  >
                    <SelectTrigger
                      aria-label="Ingredient"
                      className="w-full"
                      aria-invalid={fieldErrors[`${line.key}.ingredient_id`] ? true : undefined}
                    >
                      <SelectValue placeholder={ingredients.isPending ? "Loading…" : "Choose an ingredient"} />
                    </SelectTrigger>
                    <SelectContent>
                      {optionsFor(line).map((option) => (
                        <SelectItem key={option.id} value={String(option.id)}>
                          {option.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldError errors={fieldErrors[`${line.key}.ingredient_id`]?.map((message) => ({ message }))} />
                </div>

                <div className="flex w-24 flex-col gap-1">
                  <Input
                    aria-label="Quantity"
                    inputMode="numeric"
                    value={line.quantity}
                    onChange={(e) => updateLine(line.key, { quantity: e.target.value })}
                    aria-invalid={fieldErrors[`${line.key}.quantity`] ? true : undefined}
                  />
                  <FieldError errors={fieldErrors[`${line.key}.quantity`]?.map((message) => ({ message }))} />
                </div>

                <div className="flex w-24 flex-col gap-1">
                  <Select
                    value={line.unit}
                    onValueChange={(value) => updateLine(line.key, { unit: value as Unit })}
                    disabled={!ingredient}
                  >
                    <SelectTrigger
                      aria-label="Unit"
                      className="w-full"
                      aria-invalid={fieldErrors[`${line.key}.unit`] ? true : undefined}
                    >
                      <SelectValue placeholder="Unit" />
                    </SelectTrigger>
                    <SelectContent>
                      {(ingredient?.available_units ?? []).map((unit) => (
                        <SelectItem key={unit} value={unit}>
                          {UNIT_LABELS[unit]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldError errors={fieldErrors[`${line.key}.unit`]?.map((message) => ({ message }))} />
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Remove ingredient line"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => removeLine(line.key)}
                >
                  <Trash2Icon />
                </Button>
              </div>

              {ingredient && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {ingredient.quantity_on_hand_formatted} {UNIT_LABELS[ingredient.display_unit]} on hand
                  <StockStatusBadge status={ingredient.stock_status} />
                </div>
              )}
            </div>
          );
        })}

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="self-start"
          onClick={addLine}
          disabled={ingredients.isPending || (ingredients.data && lines.length >= allIngredients.length)}
        >
          <PlusIcon />
          Add ingredient
        </Button>
      </div>

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
          {mutation.isPending ? "Saving…" : "Save recipe"}
        </Button>
      </DialogFooter>
    </form>
  );
}
