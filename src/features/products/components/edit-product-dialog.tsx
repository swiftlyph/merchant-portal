import { useState, type FormEvent } from "react";
import { PencilIcon } from "lucide-react";
import { useUpdateProduct } from "../use-update-product";
import { useCategories } from "../use-categories";
import { EditRecipeButton } from "./edit-recipe-dialog";
import type { Product, ProductStatus, UpdateProductInput } from "../types";
import { parseAmountToCents } from "@/lib/money";
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
  category: string;
  price: string;
  status: ProductStatus;
}

function toFormState(product: Product): FormState {
  return {
    name: product.name,
    category: product.category,
    price: String(product.price_cents / 100),
    status: product.status,
  };
}

/** Backend field name -> the form field its message belongs under. */
const SERVER_FIELD_MAP: Record<string, keyof FormState> = {
  name: "name",
  category: "category",
  price_cents: "price",
  status: "status",
};

type FieldErrors = Partial<Record<keyof FormState, string[]>>;

/**
 * The edit form itself, controlled by the caller ({@link EditProductButton}
 * for the row's pencil icon, or {@link ViewProductDetails} transitioning
 * out of the read-only view). No trigger of its own, so both call sites
 * can share one implementation instead of duplicating the form.
 *
 * Mirrors AddProductDialog's fields exactly, pre-filled from `product`.
 * There is no name/ID field to edit for the product's code — it's shown
 * as read-only context instead, since the backend never accepts one on
 * update and it doesn't change even if the category does. The recipe
 * isn't edited here either — it's a separate endpoint with its own form
 * (see EditRecipeDialog); this dialog just offers a button into it.
 */
export function EditProductDialog({
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
      <DialogContent className="sm:max-w-lg">
        {open && <EditProductForm product={product} onOpenChange={onOpenChange} />}
      </DialogContent>
    </Dialog>
  );
}

/** Mounted only while the dialog is open, so the form resets to `product`'s current values every time it's reopened. */
function EditProductForm({
  product,
  onOpenChange,
}: {
  product: Product;
  onOpenChange: (open: boolean) => void;
}) {
  const [form, setForm] = useState<FormState>(() => toFormState(product));
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formAlert, setFormAlert] = useState<string | null>(null);

  const categories = useCategories();
  const categoryChanged = form.category !== "" && form.category !== product.category;
  const newPrefix = categoryChanged
    ? categories.data?.find((c) => c.name === form.category)?.prefix
    : undefined;

  const mutation = useUpdateProduct(product.id, {
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
    if (!form.category) errors.category = ["Choose a category."];

    const priceCents = parseAmountToCents(form.price);
    if (priceCents === null) errors.price = ["Enter a price like 150 or 150.50."];

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0 || priceCents === null) return;

    const input: UpdateProductInput = {
      name,
      category: form.category,
      price_cents: priceCents,
      status: form.status,
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

  const categoryPlaceholder = categories.isError
    ? "Couldn't load categories"
    : categories.data
      ? "Choose a category"
      : "Loading categories…";

  return (
    <form onSubmit={handleSubmit} noValidate>
      <DialogHeader>
        <DialogTitle>Edit product</DialogTitle>
        <DialogDescription>
          {product.code
            ? `Product ID: ${product.code}. Changing the category below assigns a new one.`
            : "Changes apply immediately."}
        </DialogDescription>
      </DialogHeader>

      <FieldGroup className="my-6">
        {formAlert && (
          <Alert variant="destructive">
            <AlertDescription>{formAlert}</AlertDescription>
          </Alert>
        )}

        <Field data-invalid={fieldErrors.name ? true : undefined}>
          <FieldLabel htmlFor="edit-product-name">Name</FieldLabel>
          <Input
            id="edit-product-name"
            autoFocus
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            aria-invalid={fieldErrors.name ? true : undefined}
          />
          <FieldError errors={fieldErrors.name?.map((message) => ({ message }))} />
        </Field>

        <Field data-invalid={fieldErrors.category ? true : undefined}>
          <FieldLabel htmlFor="edit-product-category">Category</FieldLabel>
          <Select
            value={form.category}
            onValueChange={(value) => update("category", value)}
            disabled={!categories.data}
          >
            <SelectTrigger
              id="edit-product-category"
              className="w-full"
              aria-invalid={fieldErrors.category ? true : undefined}
            >
              <SelectValue placeholder={categoryPlaceholder} />
            </SelectTrigger>
            <SelectContent>
              {(categories.data ?? []).map((category) => (
                <SelectItem key={category.name} value={category.name}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldDescription>
            {categories.isError ? (
              <Button
                type="button"
                variant="link"
                size="xs"
                className="h-auto p-0"
                onClick={() => void categories.refetch()}
              >
                Retry loading categories
              </Button>
            ) : categoryChanged && newPrefix ? (
              product.code ? (
                `Saving will assign a new product ID: ${newPrefix}-###, replacing ${product.code}.`
              ) : (
                `Saving will assign this product its first ID: ${newPrefix}-###.`
              )
            ) : product.code ? (
              "This product keeps its current ID unless you change the category."
            ) : (
              "Choosing a category assigns this product its first ID."
            )}
          </FieldDescription>
          <FieldError errors={fieldErrors.category?.map((message) => ({ message }))} />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={fieldErrors.price ? true : undefined}>
            <FieldLabel htmlFor="edit-product-price">Price (₱)</FieldLabel>
            <Input
              id="edit-product-price"
              inputMode="decimal"
              value={form.price}
              onChange={(e) => update("price", e.target.value)}
              aria-invalid={fieldErrors.price ? true : undefined}
            />
            <FieldError errors={fieldErrors.price?.map((message) => ({ message }))} />
          </Field>

          <Field data-invalid={fieldErrors.status ? true : undefined}>
            <FieldLabel htmlFor="edit-product-status">Status</FieldLabel>
            <Select
              value={form.status}
              onValueChange={(value) => update("status", value as ProductStatus)}
            >
              <SelectTrigger id="edit-product-status" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <FieldError errors={fieldErrors.status?.map((message) => ({ message }))} />
          </Field>
        </div>

        <div className="flex items-center justify-between rounded-lg border border-border p-3">
          <div className="text-sm">
            <p className="font-medium">Recipe</p>
            <p className="text-muted-foreground">
              {product.recipe.length > 0
                ? `${product.recipe.length} ingredient${product.recipe.length === 1 ? "" : "s"} — ${
                    product.in_stock ? "in stock" : "out of stock"
                  }.`
                : "No ingredients — always available."}
            </p>
          </div>
          <EditRecipeButton product={product} />
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

/**
 * Pencil icon for a product row: an uncontrolled trigger that owns its
 * own open state and renders {@link EditProductDialog}. The accessible
 * name carries the product name so one row's button is distinguishable
 * from another's.
 *
 * A plain onClick rather than `DialogTrigger asChild`: EditProductDialog
 * owns its `<Dialog>` internally so the same dialog can also be opened
 * from ViewProductDetails's "Edit" button (no trigger element there at
 * all — just `open={true}`), and a `DialogTrigger` has to be a child of
 * the exact Dialog it opens, which a shared component with two call
 * sites can't offer both of. Radix still manages focus and Escape
 * correctly in fully controlled mode; the only thing lost is the
 * trigger-specific aria-expanded/aria-controls wiring.
 */
export function EditProductButton({ product }: { product: Product }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={`Edit ${product.name}`}
        title="Edit"
        className="text-muted-foreground hover:text-foreground"
        onClick={() => setOpen(true)}
      >
        <PencilIcon />
      </Button>
      <EditProductDialog product={product} open={open} onOpenChange={setOpen} />
    </>
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
