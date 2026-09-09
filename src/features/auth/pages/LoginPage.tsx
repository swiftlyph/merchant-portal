import { useEffect, useState, type FormEvent } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { ApiError } from "@/lib/api/client";
import type { ApiFieldErrors } from "@/lib/api/types";
import { login } from "../api";
import { useAuthStore } from "../store";

const RETRY_COOLDOWN_SECONDS = 60;

interface LocationState {
  from?: { pathname: string };
}

/**
 * The one approved full-bleed glass surface: brand gradient behind a glass
 * card. No body text or tabular data ever sits on glass — see README.
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
      // TODO: handle 403 "merchant_inactive" once the backend tenancy phase
      // ships (suspended/inactive merchant). Not implemented yet.
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
    <div className="brand-gradient flex min-h-screen items-center justify-center p-4">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="glass w-full max-w-sm rounded-box p-8 shadow-xl">
        <h1 className="mb-1 text-center text-2xl font-bold text-primary-content">
          GASA Merchant Portal
        </h1>
        <p className="mb-6 text-center text-sm text-primary-content/80">
          Sign in to manage your storefront
        </p>

        {sessionNotice && (
          <div role="alert" className="alert alert-warning mb-4 text-sm">
            <span>{sessionNotice}</span>
            <button
              type="button"
              className="btn btn-ghost btn-xs"
              onClick={() => setSessionNotice(null)}
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
        )}

        {formAlert && (
          <div role="alert" className="alert alert-error mb-4 text-sm">
            <span>{formAlert}</span>
          </div>
        )}

        <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
          <label className="floating-label">
            <span>Email</span>
            <input
              type="email"
              name="email"
              autoComplete="email"
              placeholder="you@business.com"
              className="input input-bordered w-full"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={fieldErrors.email ? true : undefined}
            />
            {fieldErrors.email?.map((message) => (
              <p key={message} className="mt-1 text-sm text-error">
                {message}
              </p>
            ))}
          </label>
          <label className="floating-label">
            <span>Password</span>
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              placeholder="••••••••"
              className="input input-bordered w-full"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={fieldErrors.password ? true : undefined}
            />
            {fieldErrors.password?.map((message) => (
              <p key={message} className="mt-1 text-sm text-error">
                {message}
              </p>
            ))}
          </label>
          <button type="submit" className="btn btn-primary mt-2" disabled={submitDisabled}>
            {cooldown > 0
              ? `Try again in ${cooldown}s`
              : mutation.isPending
                ? "Signing in…"
                : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
