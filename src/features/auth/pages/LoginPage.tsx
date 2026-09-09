import { ThemeToggle } from "@/components/ui/ThemeToggle";

/**
 * The one approved full-bleed glass surface: brand gradient behind a glass
 * card. No body text or tabular data ever sits on glass — see README.
 */
export function LoginPage() {
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
        <form className="flex flex-col gap-4">
          <label className="floating-label">
            <span>Email</span>
            <input
              type="email"
              name="email"
              autoComplete="email"
              placeholder="you@business.com"
              className="input input-bordered w-full"
              disabled
            />
          </label>
          <label className="floating-label">
            <span>Password</span>
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              placeholder="••••••••"
              className="input input-bordered w-full"
              disabled
            />
          </label>
          <button type="submit" className="btn btn-primary mt-2" disabled>
            Sign in
          </button>
        </form>
      </div>
    </div>
  );
}
