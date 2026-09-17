import { useState, type FormEvent } from "react";
import { PlusIcon } from "lucide-react";
import { useCreateProduct } from "../use-create-product";
import { useCategories } from "../use-categories";
import type { CreateProductInput, ProductStatus } from "../types";
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
  category: string;
  price: string;
  status: ProductStatus;
}

const EMPTY_FORM: FormState = {
  name: "",
  category: "",
  price: "",
  status: "active",
};

/** Backend field name -> the form field its message belongs under. */
const SERVER_FIELD_MAP: Record<string, keyof FormState> = {
  name: "name",
  category: "category",
  price_cents: "price",
  status: "status",
};

type FieldErrors = Partial<Record<keyof FormState, string[]>>;

/**
 * "Add Product" button plus the modal form it opens. There is no ID field:
 * the server issues the product ID from the chosen category (Drinks →
 * DRK-001, DRK-002, …), so the form only shows which prefix it will get.
 * Categories come from the API, fetched the first time the dialog opens.
 *
 * No recipe field here either — a product must exist before ingredients
 * can be attached to it (PUT /merchant/products/{id}/recipe), so that
 * happens afterward, from the product's row (see EditRecipeDialog).
 *
 * Prices are typed in pesos and converted to integer cents
 * (parseAmountToCents) before the request — the API never sees a float.
 * Server 422 messages land under their fields; anything else becomes a
 * form-level alert. Closing the dialog, by any route, resets the form.
 */
export function AddProductDialog() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formAlert, setFormAlert] = useState<string | null>(null);

  const categories = useCategories({ enabled: open });
  const selectedPrefix = categories.data?.find((c) => c.name === form.category)?.prefix;

  const mutation = useCreateProduct({
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

    const input: CreateProductInput = {
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
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <PlusIcon />
          Add Product
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit} noValidate>
          <DialogHeader>
            <DialogTitle>Add product</DialogTitle>
            <DialogDescription>
              New products are active and visible on the POS right away unless you set them
              inactive. Add ingredients afterward from the product&apos;s row.
            </DialogDescription>
          </DialogHeader>

          <FieldGroup className="my-6">
            {formAlert && (
              <Alert variant="destructive">
                <AlertDescription>{formAlert}</AlertDescription>
              </Alert>
            )}

            <Field data-invalid={fieldErrors.name ? true : undefined}>
              <FieldLabel htmlFor="product-name">Name</FieldLabel>
              <Input
                id="product-name"
                autoFocus
                placeholder="Iced Latte"
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                aria-invalid={fieldErrors.name ? true : undefined}
              />
              <FieldError errors={fieldErrors.name?.map((message) => ({ message }))} />
            </Field>

            <Field data-invalid={fieldErrors.category ? true : undefined}>
              <FieldLabel htmlFor="product-category">Category</FieldLabel>
              <Select
                value={form.category}
                onValueChange={(value) => update("category", value)}
                disabled={!categories.data}
              >
                <SelectTrigger
                  id="product-category"
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
                ) : selectedPrefix ? (
                  `The product ID is assigned automatically: ${selectedPrefix}-###.`
                ) : (
                  "The product ID is assigned automatically from the category."
                )}
              </FieldDescription>
              <FieldError errors={fieldErrors.category?.map((message) => ({ message }))} />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field data-invalid={fieldErrors.price ? true : undefined}>
                <FieldLabel htmlFor="product-price">Price (₱)</FieldLabel>
                <Input
                  id="product-price"
                  inputMode="decimal"
                  placeholder="150.00"
                  value={form.price}
                  onChange={(e) => update("price", e.target.value)}
                  aria-invalid={fieldErrors.price ? true : undefined}
                />
                <FieldError errors={fieldErrors.price?.map((message) => ({ message }))} />
              </Field>

              <Field data-invalid={fieldErrors.status ? true : undefined}>
                <FieldLabel htmlFor="product-status">Status</FieldLabel>
                <Select
                  value={form.status}
                  onValueChange={(value) => update("status", value as ProductStatus)}
                >
                  <SelectTrigger id="product-status" className="w-full">
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
              {mutation.isPending ? "Adding…" : "Add product"}
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
