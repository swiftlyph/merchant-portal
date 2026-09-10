import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ApiError } from "@/lib/api/client";
import type { ApiFieldErrors } from "@/lib/api/types";
import { acceptInvite } from "../api";
import { useAuthStore } from "../store";
import { useLogout } from "../use-logout";

// Same window as login's — this endpoint shares the "login" throttle
// limiter server-side.
const RETRY_COOLDOWN_SECONDS = 60;

const MIN_PASSWORD_LENGTH = 8;

/**
 * PUBLIC route, reachable at both /invite/:token and /accept-invite?token=
 * (the backend's dev-only invite-link generator produces the latter path;
 * the phase spec asked for the former — supporting both means a
 * dev-generated link works out of the box while also matching the spec).
 *
 * Same visual family as LoginPage (shadcn login-04 block), and reuses
 * useAuthStore's setAuthed exactly as LoginPage does — this is the other
 * way a merchant-portal session gets created, so it must not grow a
 * second auth-success code path.
 */
export function AcceptInvitePage() {
  const { token: tokenParam } = useParams();
  const [searchParams] = useSearchParams();
  const token = tokenParam ?? searchParams.get("token") ?? "";

  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);
  const setAuthed = useAuthStore((s) => s.setAuthed);
  const logout = useLogout();
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<ApiFieldErrors>({});
  const [formAlert, setFormAlert] = useState<string | null>(null);
  const [invalidInvite, setInvalidInvite] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  const mutation = useMutation({
    mutationFn: acceptInvite,
    onSuccess: ({ token: authToken, user: authUser }) => {
      setAuthed(authToken, authUser);
      navigate("/app", { replace: true });
    },
    onError: (error: unknown) => {
      if (!(error instanceof ApiError)) {
        setFormAlert("Something went wrong. Please try again.");
        return;
      }
      if (error.status === 422 && error.code === "invalid_invite") {
        setInvalidInvite(true);
        return;
      }
      if (error.status === 422) {
        setFieldErrors(error.errors ?? {});
        return;
      }
      if (error.status === 429) {
        setFormAlert("Too many attempts, try again in a minute");
        setCooldown(RETRY_COOLDOWN_SECONDS);
        return;
      }
      setFormAlert(error.message);
    },
  });

  // An already-authed user must sign out before accepting a different
  // invite — this session's token would otherwise silently outlive the
  // page and land them back where they started.
  if (status === "authed" && user) {
    return (
      <div className="relative flex min-h-svh flex-col items-center justify-center gap-4 bg-muted p-6 text-center">
        <Card className="w-full max-w-sm p-6">
          <CardContent className="flex flex-col gap-4 p-0">
            <h1 className="text-lg font-semibold">You're already signed in</h1>
            <p className="text-sm text-muted-foreground">
              You're signed in as {user.email}. Sign out to accept this invite as a different account.
            </p>
            <Button onClick={() => logout.mutate()} disabled={logout.isPending}>
              {logout.isPending ? "Signing out…" : "Sign out"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (invalidInvite) {
    return (
      <div className="relative flex min-h-svh flex-col items-center justify-center gap-4 bg-muted p-6 text-center">
        <Card className="w-full max-w-sm p-6">
          <CardContent className="flex flex-col gap-2 p-0">
            <h1 className="text-lg font-semibold">This invite link isn't valid</h1>
            <p className="text-sm text-muted-foreground">
              This invite link is invalid or has expired — ask the person who invited you for a new
              one.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormAlert(null);

    const errors: ApiFieldErrors = {};
    if (!password) {
      errors.password = ["Password is required."];
    } else if (password.length < MIN_PASSWORD_LENGTH) {
      errors.password = [`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`];
    }
    if (confirmPassword !== password) {
      errors.confirmPassword = ["Passwords don't match."];
    }
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    mutation.mutate({ token, password });
  }

  const submitDisabled = mutation.isPending || cooldown > 0 || !token;

  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center bg-muted p-6 md:p-10">
      <div className="absolute right-4 top-4 z-10">
        <ThemeToggle />
      </div>

      <div className="flex w-full max-w-sm flex-col gap-6">
        <Card className="overflow-hidden p-0">
          <CardContent className="p-0">
            <form className="p-6 md:p-8" onSubmit={handleSubmit} noValidate>
              <FieldGroup>
                <div className="flex flex-col items-center gap-2 text-center">
                  <h1 className="text-2xl font-bold">
                    <span className="text-primary">GASA</span> Merchant Portal
                  </h1>
                  <p className="text-balance text-muted-foreground">
                    You've been invited to join a merchant on GASA. Set a password to get started.
                  </p>
                </div>

                {!token && (
                  <Alert variant="destructive">
                    <AlertDescription>
                      This invite link is missing its token. Ask the person who invited you for the
                      full link.
                    </AlertDescription>
                  </Alert>
                )}

                {formAlert && (
                  <Alert variant="destructive">
                    <AlertDescription>{formAlert}</AlertDescription>
                  </Alert>
                )}

                <Field data-invalid={fieldErrors.password ? true : undefined}>
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                  <Input
                    id="password"
                    type="password"
                    name="password"
                    autoComplete="new-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    aria-invalid={fieldErrors.password ? true : undefined}
                  />
                  <FieldError errors={fieldErrors.password?.map((message) => ({ message }))} />
                </Field>

                <Field data-invalid={fieldErrors.confirmPassword ? true : undefined}>
                  <FieldLabel htmlFor="confirm-password">Confirm password</FieldLabel>
                  <Input
                    id="confirm-password"
                    type="password"
                    name="confirm-password"
                    autoComplete="new-password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    aria-invalid={fieldErrors.confirmPassword ? true : undefined}
                  />
                  <FieldError
                    errors={fieldErrors.confirmPassword?.map((message) => ({ message }))}
                  />
                </Field>

                <Field>
                  <Button type="submit" disabled={submitDisabled}>
                    {cooldown > 0
                      ? `Try again in ${cooldown}s`
                      : mutation.isPending
                        ? "Setting up your account…"
                        : "Set password and continue"}
                  </Button>
                </Field>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
