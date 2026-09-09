import { useEffect, useState, type FormEvent } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ApiError } from "@/lib/api/client";
import type { ApiFieldErrors } from "@/lib/api/types";
import { login } from "../api";
import { useAuthStore } from "../store";

// Mirrors the backend's login throttle window (429 "too_many_attempts" after
// the 6th attempt within a rolling minute) — matched here, not invented, so
// the UI doesn't invite a retry the server will just reject again.
const RETRY_COOLDOWN_SECONDS = 60;

interface LocationState {
  from?: { pathname: string };
}

/**
 * shadcn's login-04 block, adapted: same centered-card / split-image layout,
 * but wired to this app's real auth (mutation, field errors, cooldown,
 * session-expiry notice) instead of the block's static markup. The OAuth
 * row and "Sign up" link from the stock block are commented out — no OAuth
 * providers or self-serve signup exist for this portal yet.
 */
export function LoginPage() {
  const status = useAuthStore((s) => s.status);
  const sessionNotice = useAuthStore((s) => s.sessionNotice);
  const setSessionNotice = useAuthStore((s) => s.setSessionNotice);
  const setAuthed = useAuthStore((s) => s.setAuthed);
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<ApiFieldErrors>({});
  const [formAlert, setFormAlert] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  const mutation = useMutation({
    mutationFn: login,
    onSuccess: ({ token, user }) => {
      setAuthed(token, user);
      const from = (location.state as LocationState | null)?.from?.pathname ?? "/app";
      navigate(from, { replace: true });
    },
    onError: (error: unknown) => {
      if (!(error instanceof ApiError)) {
        setFormAlert("Something went wrong. Please try again.");
        return;
      }
      if (error.status === 422) {
        setFieldErrors(error.errors ?? {});
        return;
      }
      if (error.status === 401 && error.code === "invalid_credentials") {
        setFormAlert("Email or password is incorrect");
        return;
      }
      if (error.status === 429) {
        setFormAlert("Too many attempts, try again in a minute");
        setCooldown(RETRY_COOLDOWN_SECONDS);
        return;
      }
      if (error.status === 403 && error.code === "portal_forbidden") {
        setFormAlert("This account can't access the merchant portal");
        return;
      }
      // No case here for 403 "merchant_inactive": login succeeds for a
      // suspended merchant (per the backend contract) — the redirect to
      // /suspended is handled by routing (RequireActiveMerchant), not as a
      // login error.
      setFormAlert(error.message);
    },
  });

  // Already signed in — don't show the login form at all.
  if (status === "authed") {
    return <Navigate to="/app" replace />;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormAlert(null);

    const errors: ApiFieldErrors = {};
    if (!email.trim()) errors.email = ["Email is required."];
    if (!password) errors.password = ["Password is required."];
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    mutation.mutate({ email, password });
  }

  const submitDisabled = mutation.isPending || cooldown > 0;

  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center bg-muted p-6 md:p-10">
      <div className="absolute right-4 top-4 z-10">
        <ThemeToggle />
      </div>

      <div className="flex w-full max-w-sm flex-col gap-6 md:max-w-4xl">
        <Card className="overflow-hidden p-0">
          <CardContent className="grid p-0 md:grid-cols-2">
            <form className="p-6 md:p-8" onSubmit={handleSubmit} noValidate>
              <FieldGroup>
                <div className="flex flex-col items-center gap-2 text-center">
                  <h1 className="text-2xl font-bold">
                    <span className="text-primary">GASA</span> Merchant Portal
                  </h1>
                  <p className="text-balance text-muted-foreground">
                    Sign in to manage your storefront
                  </p>
                </div>

                {sessionNotice && (
                  <Alert variant="default" className="border-warning/40 bg-warning/10">
                    <AlertDescription className="flex items-center justify-between gap-2 text-warning-foreground">
                      <span>{sessionNotice}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => setSessionNotice(null)}
                        aria-label="Dismiss"
                      >
                        ✕
                      </Button>
                    </AlertDescription>
                  </Alert>
                )}

                {formAlert && (
                  <Alert variant="destructive">
                    <AlertDescription>{formAlert}</AlertDescription>
                  </Alert>
                )}

                <Field data-invalid={fieldErrors.email ? true : undefined}>
                  <FieldLabel htmlFor="email">Email</FieldLabel>
                  <Input
                    id="email"
                    type="email"
                    name="email"
                    autoComplete="email"
                    placeholder="you@business.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    aria-invalid={fieldErrors.email ? true : undefined}
                  />
                  <FieldError errors={fieldErrors.email?.map((message) => ({ message }))} />
                </Field>

                <Field data-invalid={fieldErrors.password ? true : undefined}>
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                  <Input
                    id="password"
                    type="password"
                    name="password"
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    aria-invalid={fieldErrors.password ? true : undefined}
                  />
                  <FieldError errors={fieldErrors.password?.map((message) => ({ message }))} />
                </Field>

                <Field>
                  <Button type="submit" disabled={submitDisabled}>
                    {cooldown > 0
                      ? `Try again in ${cooldown}s`
                      : mutation.isPending
                        ? "Signing in…"
                        : "Sign in"}
                  </Button>
                </Field>

                {/* No OAuth providers for this portal yet — stock login-04
                    social row kept for when/if that lands.
                <FieldSeparator className="*:data-[slot=field-separator-content]:bg-card">
                  Or continue with
                </FieldSeparator>
                <Field className="grid grid-cols-3 gap-4">
                  <Button variant="outline" type="button">
                    <span className="sr-only">Login with Apple</span>
                  </Button>
                  <Button variant="outline" type="button">
                    <span className="sr-only">Login with Google</span>
                  </Button>
                  <Button variant="outline" type="button">
                    <span className="sr-only">Login with Meta</span>
                  </Button>
                </Field>
                */}

                {/* No self-serve signup for this portal — merchants are
                    provisioned, not registered.
                <FieldDescription className="text-center">
                  Don&apos;t have an account? <a href="#">Sign up</a>
                </FieldDescription>
                */}
              </FieldGroup>
            </form>

            {/* Visual side — plain brand-color panel; drop a product
                screenshot/illustration here when one is available. */}
            <div className="relative hidden flex-col items-center justify-center gap-6 bg-primary p-12 text-center text-primary-foreground md:flex">
              <div className="flex aspect-video w-full items-center justify-center rounded-lg border-2 border-dashed border-primary-foreground/30 bg-primary-foreground/10">
                <span className="text-sm text-primary-foreground/70">
                  Product screenshot placeholder
                </span>
              </div>
              <div>
                <p className="text-lg font-semibold">Run your storefront from one place</p>
                <p className="mt-1 text-sm text-primary-foreground/80">
                  Orders, payouts, and inventory — all in the merchant portal.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
