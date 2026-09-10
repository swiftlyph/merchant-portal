import { useEffect, useRef, useState } from "react";
import { IconAlertTriangle } from "@tabler/icons-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ApiError } from "@/lib/api/client";
import type { ApiFieldErrors } from "@/lib/api/types";
import { useProfile } from "../use-profile";
import { useUpdateProfile } from "../use-update-profile";
import { useUnsavedChangesGuard } from "../use-unsaved-changes-guard";
import { describeProfileError } from "../errors";
import type { MerchantProfile, UpdateMerchantProfileRequest } from "../types";

type FormValues = { [K in keyof Required<UpdateMerchantProfileRequest>]: string };

function toFormValues(profile: MerchantProfile): FormValues {
  return {
    legal_name: profile.legal_name ?? "",
    address_line1: profile.address_line1 ?? "",
    address_line2: profile.address_line2 ?? "",
    city: profile.city ?? "",
    postal_code: profile.postal_code ?? "",
    phone: profile.phone ?? "",
    contact_email: profile.contact_email ?? "",
    tax_identifier: profile.tax_identifier ?? "",
    receipt_header: profile.receipt_header ?? "",
    receipt_footer: profile.receipt_footer ?? "",
  };
}

/** Empty strings round-trip as null — the backend fields are all nullable, never required. */
function toRequest(values: FormValues): UpdateMerchantProfileRequest {
  const entries = Object.entries(values) as [keyof FormValues, string][];
  return Object.fromEntries(entries.map(([key, value]) => [key, value.trim() ? value : null]));
}

function valuesEqual(a: FormValues, b: FormValues): boolean {
  return (Object.keys(a) as (keyof FormValues)[]).every((key) => a[key] === b[key]);
}

const STATUS_LABEL: Record<MerchantProfile["status"], string> = {
  pending: "Pending",
  active: "Active",
  suspended: "Suspended",
};

/** A field that spans both columns of the 2-col grid on md+ screens. */
const FULL_ROW = "md:col-span-2";

/**
 * `/app/settings/profile`. One card, sectioned internally (not four
 * separate cards) with a 2-column field grid so short fields sit side by
 * side instead of stretching full-width — the previous one-field-per-row
 * layout inside four stacked cards left the page mostly empty space. The
 * receipt preview runs alongside the form as a sticky rail on wide
 * screens rather than being boxed into its own section at the bottom.
 */
export function ProfilePage() {
  const { data: profile, isPending, isError, error, refetch } = useProfile();
  const { mutateAsync, isPending: isSaving } = useUpdateProfile();

  const [values, setValues] = useState<FormValues | null>(null);
  const [savedValues, setSavedValues] = useState<FormValues | null>(null);
  const [fieldErrors, setFieldErrors] = useState<ApiFieldErrors>({});
  const [formAlert, setFormAlert] = useState<string | null>(null);
  const inFlightRef = useRef(false);

  useEffect(() => {
    if (!profile) return;
    const next = toFormValues(profile);
    setValues(next);
    setSavedValues(next);
  }, [profile]);

  const isDirty = Boolean(values && savedValues && !valuesEqual(values, savedValues));
  const blocker = useUnsavedChangesGuard(isDirty);

  function setField(key: keyof FormValues, value: string) {
    setValues((current) => (current ? { ...current, [key]: value } : current));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlightRef.current || !values) return;
    inFlightRef.current = true;
    setFormAlert(null);
    setFieldErrors({});
    try {
      const updated = await mutateAsync(toRequest(values));
      const next = toFormValues(updated);
      setValues(next);
      setSavedValues(next);
      toast.success("Profile saved.");
    } catch (err) {
      if (err instanceof ApiError && err.status === 422) {
        setFieldErrors(err.errors ?? {});
      } else {
        setFormAlert(describeProfileError(err));
      }
    } finally {
      inFlightRef.current = false;
    }
  }

  if (isPending) {
    return (
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Skeleton className="h-[36rem] w-full lg:col-span-2" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError || !profile || !values) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border p-10 text-center">
        <p className="text-sm text-muted-foreground">
          {error instanceof Error ? error.message : "Couldn't load the business profile."}
        </p>
        <Button variant="outline" size="sm" onClick={() => void refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} noValidate>
      <div className="flex flex-col gap-4">
        {blocker.state === "blocked" && (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning-foreground">
            <span>You have unsaved changes. Leave without saving?</span>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => blocker.reset?.()}>
                Stay
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => blocker.proceed?.()}>
                Leave
              </Button>
            </div>
          </div>
        )}

        {formAlert && (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            <IconAlertTriangle className="mt-0.5 size-4 shrink-0" />
            {formAlert}
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:items-start">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Business profile</CardTitle>
              <CardDescription>
                Your registered details, address, and contact information.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-6">
              <FieldGroup className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field>
                  <FieldLabel>Merchant name</FieldLabel>
                  <Input value={profile.name} disabled readOnly />
                </Field>
                <Field>
                  <FieldLabel>Status</FieldLabel>
                  <Input value={STATUS_LABEL[profile.status]} disabled readOnly />
                </Field>
                <Field data-invalid={fieldErrors.legal_name ? true : undefined}>
                  <FieldLabel htmlFor="legal_name">Legal name</FieldLabel>
                  <Input
                    id="legal_name"
                    value={values.legal_name}
                    onChange={(e) => setField("legal_name", e.target.value)}
                    aria-invalid={fieldErrors.legal_name ? true : undefined}
                  />
                  <FieldError errors={fieldErrors.legal_name?.map((message) => ({ message }))} />
                </Field>
                <Field data-invalid={fieldErrors.tax_identifier ? true : undefined}>
                  <FieldLabel htmlFor="tax_identifier">Tax identifier</FieldLabel>
                  <Input
                    id="tax_identifier"
                    value={values.tax_identifier}
                    onChange={(e) => setField("tax_identifier", e.target.value)}
                    aria-invalid={fieldErrors.tax_identifier ? true : undefined}
                  />
                  <FieldError errors={fieldErrors.tax_identifier?.map((message) => ({ message }))} />
                </Field>
              </FieldGroup>

              <Separator />

              <div className="flex flex-col gap-4">
                <h3 className="text-sm font-medium text-muted-foreground">Address</h3>
                <FieldGroup className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Field className={FULL_ROW} data-invalid={fieldErrors.address_line1 ? true : undefined}>
                    <FieldLabel htmlFor="address_line1">Address line 1</FieldLabel>
                    <Input
                      id="address_line1"
                      value={values.address_line1}
                      onChange={(e) => setField("address_line1", e.target.value)}
                      aria-invalid={fieldErrors.address_line1 ? true : undefined}
                    />
                    <FieldError errors={fieldErrors.address_line1?.map((message) => ({ message }))} />
                  </Field>
                  <Field className={FULL_ROW} data-invalid={fieldErrors.address_line2 ? true : undefined}>
                    <FieldLabel htmlFor="address_line2">Address line 2</FieldLabel>
                    <Input
                      id="address_line2"
                      value={values.address_line2}
                      onChange={(e) => setField("address_line2", e.target.value)}
                      aria-invalid={fieldErrors.address_line2 ? true : undefined}
                    />
                    <FieldError errors={fieldErrors.address_line2?.map((message) => ({ message }))} />
                  </Field>
                  <Field data-invalid={fieldErrors.city ? true : undefined}>
                    <FieldLabel htmlFor="city">City</FieldLabel>
                    <Input
                      id="city"
                      value={values.city}
                      onChange={(e) => setField("city", e.target.value)}
                      aria-invalid={fieldErrors.city ? true : undefined}
                    />
                    <FieldError errors={fieldErrors.city?.map((message) => ({ message }))} />
                  </Field>
                  <Field data-invalid={fieldErrors.postal_code ? true : undefined}>
                    <FieldLabel htmlFor="postal_code">Postal code</FieldLabel>
                    <Input
                      id="postal_code"
                      value={values.postal_code}
                      onChange={(e) => setField("postal_code", e.target.value)}
                      aria-invalid={fieldErrors.postal_code ? true : undefined}
                    />
                    <FieldError errors={fieldErrors.postal_code?.map((message) => ({ message }))} />
                  </Field>
                </FieldGroup>
              </div>

              <Separator />

              <div className="flex flex-col gap-4">
                <h3 className="text-sm font-medium text-muted-foreground">Contact</h3>
                <FieldGroup className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Field data-invalid={fieldErrors.phone ? true : undefined}>
                    <FieldLabel htmlFor="phone">Phone</FieldLabel>
                    <Input
                      id="phone"
                      value={values.phone}
                      onChange={(e) => setField("phone", e.target.value)}
                      aria-invalid={fieldErrors.phone ? true : undefined}
                    />
                    <FieldError errors={fieldErrors.phone?.map((message) => ({ message }))} />
                  </Field>
                  <Field data-invalid={fieldErrors.contact_email ? true : undefined}>
                    <FieldLabel htmlFor="contact_email">Contact email</FieldLabel>
                    <Input
                      id="contact_email"
                      type="email"
                      value={values.contact_email}
                      onChange={(e) => setField("contact_email", e.target.value)}
                      aria-invalid={fieldErrors.contact_email ? true : undefined}
                    />
                    <FieldError errors={fieldErrors.contact_email?.map((message) => ({ message }))} />
                  </Field>
                </FieldGroup>
              </div>

              <Separator />

              <div className="flex flex-col gap-4">
                <h3 className="text-sm font-medium text-muted-foreground">Receipt</h3>
                <FieldGroup className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Field data-invalid={fieldErrors.receipt_header ? true : undefined}>
                    <FieldLabel htmlFor="receipt_header">Receipt header</FieldLabel>
                    <Input
                      id="receipt_header"
                      maxLength={255}
                      value={values.receipt_header}
                      onChange={(e) => setField("receipt_header", e.target.value)}
                      aria-invalid={fieldErrors.receipt_header ? true : undefined}
                    />
                    <FieldError errors={fieldErrors.receipt_header?.map((message) => ({ message }))} />
                  </Field>
                  <Field data-invalid={fieldErrors.receipt_footer ? true : undefined}>
                    <FieldLabel htmlFor="receipt_footer">Receipt footer</FieldLabel>
                    <Input
                      id="receipt_footer"
                      maxLength={255}
                      value={values.receipt_footer}
                      onChange={(e) => setField("receipt_footer", e.target.value)}
                      aria-invalid={fieldErrors.receipt_footer ? true : undefined}
                    />
                    <FieldError errors={fieldErrors.receipt_footer?.map((message) => ({ message }))} />
                  </Field>
                </FieldGroup>
              </div>
            </CardContent>
          </Card>

          <Card className="lg:sticky lg:top-4">
            <CardHeader>
              <CardTitle>How this prints</CardTitle>
              <CardDescription>Reflects the receipt header/footer as you type.</CardDescription>
            </CardHeader>
            <CardContent>
              <div
                aria-label="Receipt preview"
                className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border bg-muted/30 p-4 font-mono text-xs"
              >
                {values.receipt_header && (
                  <p className="text-center font-semibold">{values.receipt_header}</p>
                )}
                <div className="flex w-full flex-col gap-1 text-muted-foreground">
                  <div className="flex justify-between">
                    <span>1x Sample item</span>
                    <span>₱100.00</span>
                  </div>
                  <div className="flex justify-between border-t border-dashed border-border pt-1 font-semibold text-foreground">
                    <span>Total</span>
                    <span>₱100.00</span>
                  </div>
                </div>
                {values.receipt_footer && (
                  <p className="text-center text-muted-foreground">{values.receipt_footer}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex items-center justify-end gap-2">
          {isDirty && <span className="text-sm text-muted-foreground">Unsaved changes</span>}
          <Button type="submit" disabled={isSaving || !isDirty}>
            {isSaving ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </div>
    </form>
  );
}
